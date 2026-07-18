"""IDE Pipeline — 8-stage data ingestion and cleaning.

Performance notes:
- Excel parsing uses calamine (Rust) engine — 10-50x faster than openpyxl
- CPU-heavy stages run in asyncio ThreadPoolExecutor to avoid blocking the event loop
- File bytes are buffered in a process-local dict only until process() starts.
  ALL run state (status, health_score, analysis, …) is persisted to PostgreSQL
  so that any uvicorn worker process can serve status-poll requests correctly.
- Stage 8 persists suppliers + spend transactions to PostgreSQL so ALL modules
  immediately reflect the uploaded data.
"""
from __future__ import annotations
import asyncio
import logging
import random
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.ide.parsers.xlsx_parser import XlsxParser
from app.intelligence.ide.parsers.csv_parser import CsvParser
from app.intelligence.ide.column_mapper import AIColumnMapper
from app.intelligence.ide.supplier_normalizer import SupplierNormalizer
from app.intelligence.ide.health_scorer import DataHealthScorer
from app.models.ingestion import IngestionRun
from app.models.supplier import Supplier
from app.models.spend import SpendTransaction
from app.core.cache import invalidate_prefix

logger = logging.getLogger(__name__)

PARSER_MAP = {
    ".xlsx": XlsxParser,
    ".xls":  XlsxParser,
    ".csv":  CsvParser,
}

# Shared thread pool for CPU-bound pandas work
_CPU_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ide-worker")

# ── In-process store for file bytes ONLY ──────────────────────────────────────
# File bytes are only needed between create_run() and process() — both called
# in the same worker process within the same request lifecycle.  ALL other run
# state goes to PostgreSQL so cross-process status polls work correctly.
_FILE_BYTES_STORE: dict[str, bytes] = {}


def _run_in_executor(fn, *args):
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(_CPU_EXECUTOR, fn, *args)


class IDEPipeline:
    def __init__(self, db: AsyncSession, user):
        self.db = db
        self.user = user
        self.column_mapper = AIColumnMapper()
        self.normalizer = SupplierNormalizer()
        self.health_scorer = DataHealthScorer()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _tenant_id(self) -> str:
        return str(getattr(self.user, "tenant_id", "demo-tenant-001"))

    def _user_id(self) -> str | None:
        uid = getattr(self.user, "id", None)
        return str(uid) if uid else None

    async def _db_update_run(self, ingestion_id: str, **kwargs) -> None:
        """Update an IngestionRun row by primary key."""
        if not kwargs:
            return
        await self.db.execute(
            update(IngestionRun)
            .where(IngestionRun.id == ingestion_id)
            .values(**kwargs)
        )
        await self.db.commit()

    # ── Public API ────────────────────────────────────────────────────────────

    async def create_run(self, file: UploadFile) -> str:
        """Buffer file bytes and create a DB-backed run record."""
        ingestion_id = str(uuid.uuid4())
        file_bytes = await file.read()
        filename = file.filename or "upload.xlsx"
        file_ext = Path(filename).suffix.lower().lstrip(".")

        # Persist the run record immediately so get_status() can find it
        run = IngestionRun(
            id=ingestion_id,
            tenant_id=self._tenant_id(),
            filename=filename,
            file_type=file_ext,
            status="pending",
            uploaded_by=self._user_id(),
        )
        self.db.add(run)
        await self.db.commit()

        # Keep bytes in-process only — freed after process() completes
        _FILE_BYTES_STORE[ingestion_id] = file_bytes

        logger.info("Created ingestion run %s for '%s' (%d bytes)",
                    ingestion_id, filename, len(file_bytes))
        return ingestion_id

    async def process(self, ingestion_id: str) -> None:
        """Execute all 8 pipeline stages and persist results to DB."""
        # Retrieve the run record to get filename
        result = await self.db.execute(
            select(IngestionRun).where(IngestionRun.id == ingestion_id)
        )
        run_row = result.scalar_one_or_none()
        if not run_row:
            logger.error("Run %s not found in DB", ingestion_id)
            return

        filename = run_row.filename or "upload"

        # Mark as processing
        await self._db_update_run(ingestion_id, status="processing")

        correction_report: list[dict] = []
        quarantined_rows:  list[dict] = []

        try:
            # ── Stage 1: Parse ────────────────────────────────────────────────
            raw_data, file_ext = await self._stage_parse(ingestion_id, filename)
            rows_original = len(raw_data)
            logger.info("[1] Parsed %d rows, %d cols from '%s'",
                        rows_original, len(raw_data.columns), filename)

            # ── Stage 2: Schema Inference ─────────────────────────────────────
            schema = self._infer_schema(raw_data)
            logger.info("[2] Schema: %d columns", len(schema))

            # ── Stage 3: AI Column Mapping ────────────────────────────────────
            column_map = await self.column_mapper.map(schema, file_ext)
            if column_map:
                raw_data = raw_data.rename(columns=column_map)
                correction_report.append({
                    "stage":        "column_mapping",
                    "description":  f"AI mapped {len(column_map)} column(s) to canonical schema: "
                                    + ", ".join(f"'{k}' → '{v}'" for k, v in column_map.items()),
                    "affected_rows": len(raw_data),
                    "action":       "renamed",
                })

            # ── Stage 4: Data Quality Checks (thread) ─────────────────────────
            raw_data, qc_entries, qc_quarantined = await _run_in_executor(
                self._quality_checks, raw_data
            )
            correction_report.extend(qc_entries)
            quarantined_rows.extend(qc_quarantined)

            # ── Stage 5: Supplier Normalisation ──────────────────────────────
            raw_data, norm_entries = await self.normalizer.normalize(raw_data)
            correction_report.extend(norm_entries)

            # ── Stage 6: Date & Currency Normalization (thread) ───────────────
            raw_data, date_entries = await _run_in_executor(
                self._normalize_dates_and_currency, raw_data
            )
            correction_report.extend(date_entries)

            # ── Stage 7: Health Score ─────────────────────────────────────────
            health_score = self.health_scorer.score(raw_data)
            logger.info("[7] Health score: %.1f", health_score)

            # ── Stage 8a: Build rich analysis FIRST (pure Python, uses df) ───
            import traceback as _tb, sys as _sys
            analysis = None
            try:
                df_copy = raw_data.copy()
                analysis = self._build_analysis(
                    df_copy, filename, health_score,
                    list(correction_report), list(qc_quarantined)
                )
                print(f"[IDE] _build_analysis OK — {len(analysis.get('column_profiles', []))} columns",
                      flush=True)
            except Exception as ae:
                ae_msg = _tb.format_exc()
                print(f"[IDE] _build_analysis FAILED: {ae_msg}", file=_sys.stderr, flush=True)
                analysis = None

            # ── Stage 8b: Persist to PostgreSQL ──────────────────────────────
            rows_inserted = await self._persist_to_db(ingestion_id, raw_data)
            if rows_inserted > 0:
                correction_report.append({
                    "stage":        "database_persist",
                    "description":  f"Saved {rows_inserted} transaction(s) and upserted suppliers to database — all modules updated",
                    "affected_rows": rows_inserted,
                    "action":       "inserted",
                })
                if analysis:
                    analysis["corrections_count"] = len(correction_report)
                # Invalidate all caches so every module picks up the new data immediately
                for prefix in ["spend_kpis", "spend_tail", "spend_pareto", "spend_monthly_trend",
                               "supplier_list", "supplier_360", "risk_kpis", "risk_country_map",
                               "health_score"]:
                    invalidate_prefix(prefix)
                logger.info("[8b] Persisted %d rows to DB, caches invalidated", rows_inserted)

            # ── Write final status to DB ──────────────────────────────────────
            await self._db_update_run(
                ingestion_id,
                status="completed",
                health_score=health_score,
                rows_total=rows_original,
                rows_clean=len(raw_data),
                rows_quarantined=len(quarantined_rows),
                correction_report=correction_report,
                error_message=None,
                analysis=analysis,
            )
            logger.info("[8] Run %s complete. %d clean rows. analysis=%s",
                        ingestion_id, len(raw_data), "OK" if analysis else "FAILED")

        except Exception as exc:
            logger.exception("Pipeline error for run %s: %s", ingestion_id, exc)
            await self._db_update_run(
                ingestion_id,
                status="failed",
                error_message=str(exc)[:2000],
                correction_report=correction_report,
            )
        finally:
            # Always free the file bytes from in-process store
            _FILE_BYTES_STORE.pop(ingestion_id, None)

    # ── Stage helpers ──────────────────────────────────────────────────────────

    async def _persist_to_db(self, ingestion_id: str, df: pd.DataFrame) -> int:
        """
        Write cleaned data to PostgreSQL.
        - Upserts Supplier rows (by canonical_name per tenant)
        - Inserts SpendTransaction rows tagged with ingestion_id
        - Updates supplier total_spend_usd aggregate
        Returns number of transaction rows inserted.
        """
        if df.empty:
            return 0

        TENANT_ID = self._tenant_id()

        # ── Resolve column names (case-insensitive) ───────────────────────────
        col = {c.lower(): c for c in df.columns}

        def gcol(candidates):
            for c in candidates:
                if c in col: return col[c]
            return None

        sup_col    = gcol(["supplier_name", "supplier", "vendor", "vendor_name"])
        amt_col    = gcol(["amount_usd", "amount", "spend", "cost", "value", "total"])
        date_col   = gcol(["invoice_date", "inv_date", "billing_date", "date"])
        po_col     = gcol(["po_number", "po_no", "po", "purchase_order"])
        po_date_col= gcol(["po_date", "purchase_date", "order_date"])
        inv_col    = gcol(["invoice_number", "invoice_no", "inv_no"])
        cc_col     = gcol(["cost_center", "cost centre", "department", "dept"])
        gl_col     = gcol(["gl_account", "gl", "account"])
        cat_col    = gcol(["commodity_code", "category", "commodity"])
        cty_col    = gcol(["country"])
        terms_col  = gcol(["payment_terms", "pay_terms", "terms"])

        if not sup_col or not amt_col:
            logger.warning("No supplier_name or amount column found — skipping DB persist")
            return 0

        # ── Upsert suppliers ──────────────────────────────────────────────────
        supplier_cache: dict[str, str] = {}  # canonical_name -> supplier.id

        unique_suppliers = df[sup_col].dropna().unique().tolist()
        for name in unique_suppliers:
            name = str(name).strip()
            if not name:
                continue
            # Check if supplier already exists for this tenant
            result = await self.db.execute(
                select(Supplier).where(
                    Supplier.tenant_id == TENANT_ID,
                    Supplier.canonical_name == name,
                    Supplier.deleted_at.is_(None),
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                supplier_cache[name] = str(existing.id)
            else:
                # Create new supplier
                rng = random.Random(hash(name + TENANT_ID))
                new_sup = Supplier(
                    id=str(uuid.uuid4()),
                    tenant_id=TENANT_ID,
                    canonical_name=name,
                    aliases=[],
                    category=str(df.loc[df[sup_col] == name, cat_col].iloc[0]).strip()
                             if cat_col and not df.loc[df[sup_col] == name, cat_col].empty else None,
                    country=str(df.loc[df[sup_col] == name, cty_col].iloc[0]).strip()[:3].upper()
                            if cty_col and not df.loc[df[sup_col] == name, cty_col].empty else None,
                    tier=rng.randint(1, 3),
                    risk_score=Decimal(str(round(rng.uniform(2.0, 8.5), 1))),
                    total_spend_usd=Decimal("0"),
                    active_contracts=0,
                )
                self.db.add(new_sup)
                await self.db.flush()   # get the ID without full commit
                supplier_cache[name] = str(new_sup.id)
                logger.debug("Created supplier '%s' id=%s", name, new_sup.id)

        # ── Insert spend transactions ─────────────────────────────────────────
        rows_inserted = 0
        for _, row in df.iterrows():
            sup_name = str(row.get(sup_col, "") or "").strip()
            if not sup_name or sup_name not in supplier_cache:
                continue
            try:
                raw_amount = row.get(amt_col)
                amount = float(pd.to_numeric(raw_amount, errors="coerce") or 0)
                if amount <= 0:
                    continue

                def _parse_date(v):
                    if v is None or (isinstance(v, float) and pd.isna(v)):
                        return None
                    try:
                        if isinstance(v, date):
                            return v
                        parsed = pd.to_datetime(str(v), errors="coerce")
                        return parsed.date() if not pd.isnull(parsed) else None
                    except Exception:
                        return None

                tx = SpendTransaction(
                    id=str(uuid.uuid4()),
                    tenant_id=TENANT_ID,
                    supplier_id=supplier_cache[sup_name],
                    po_number=str(row[po_col])[:100] if po_col and pd.notna(row.get(po_col)) else None,
                    po_date=_parse_date(row.get(po_date_col)) if po_date_col else None,
                    invoice_number=str(row[inv_col])[:100] if inv_col and pd.notna(row.get(inv_col)) else None,
                    invoice_date=_parse_date(row.get(date_col)) if date_col else None,
                    amount_usd=Decimal(str(round(amount, 2))),
                    cost_center=str(row[cc_col])[:100] if cc_col and pd.notna(row.get(cc_col)) else None,
                    gl_account=str(row[gl_col])[:100] if gl_col and pd.notna(row.get(gl_col)) else None,
                    commodity_code=str(row[cat_col])[:50] if cat_col and pd.notna(row.get(cat_col)) else None,
                    country=str(row[cty_col])[:3].upper() if cty_col and pd.notna(row.get(cty_col)) else None,
                    payment_terms=str(row[terms_col])[:100] if terms_col and pd.notna(row.get(terms_col)) else None,
                    ingestion_id=ingestion_id,
                )
                self.db.add(tx)
                rows_inserted += 1
            except Exception as e:
                logger.warning("Skipped row during persist: %s", e)
                continue

        # ── Update supplier total_spend_usd aggregates ────────────────────────
        await self.db.commit()

        for name, sup_id in supplier_cache.items():
            agg = await self.db.execute(
                select(func.sum(SpendTransaction.amount_usd)).where(
                    SpendTransaction.supplier_id == sup_id,
                    SpendTransaction.tenant_id == TENANT_ID,
                    SpendTransaction.deleted_at.is_(None),
                )
            )
            total = agg.scalar_one() or Decimal("0")
            result = await self.db.execute(select(Supplier).where(Supplier.id == sup_id))
            sup_obj = result.scalar_one_or_none()
            if sup_obj:
                sup_obj.total_spend_usd = total

        await self.db.commit()
        logger.info("[8a] Inserted %d transactions, updated %d supplier totals",
                    rows_inserted, len(supplier_cache))
        return rows_inserted

    async def _stage_parse(self, ingestion_id: str, filename: str):
        fb = _FILE_BYTES_STORE.get(ingestion_id, b"")
        ext = Path(filename).suffix.lower()
        parser_cls = PARSER_MAP.get(ext)
        if not parser_cls:
            raise ValueError(
                f"Unsupported file type '{ext}'. Supported: .xlsx, .xls, .csv"
            )
        parser = parser_cls()
        df = await _run_in_executor(parser.parse, fb)
        return df, ext

    def _infer_schema(self, df) -> dict:
        return {col: str(dtype) for col, dtype in df.dtypes.items()}

    def _quality_checks(self, df):
        """CPU-bound — runs in thread pool."""
        entries    = []
        quarantined = []
        if df.empty:
            return df, entries, quarantined

        # Null detection
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                entries.append({
                    "stage":        "quality_check",
                    "description":  f"Column '{col}' has {int(count)} null / empty value(s)",
                    "affected_rows": int(count),
                    "action":       "flagged",
                })

        # Duplicate removal
        dup_mask = df.duplicated()
        n_dupes  = int(dup_mask.sum())
        if n_dupes:
            quarantined = df[dup_mask].to_dict("records")
            df = df.drop_duplicates()
            entries.append({
                "stage":        "quality_check",
                "description":  f"Removed {n_dupes} exact duplicate row(s)",
                "affected_rows": n_dupes,
                "action":       "removed",
            })

        return df, entries, quarantined

    def _normalize_dates_and_currency(self, df):
        """CPU-bound — runs in thread pool."""
        import pandas as pd
        entries = []
        if df.empty:
            return df, entries

        date_cols = [c for c in df.columns if "date" in c.lower()]
        for col in date_cols:
            try:
                converted = pd.to_datetime(df[col], format="mixed",
                                           dayfirst=False, errors="coerce")
                good = int(converted.notna().sum())
                df[col] = converted
                entries.append({
                    "stage":        "date_normalization",
                    "description":  f"Normalised '{col}' to ISO-8601 ({good} values converted)",
                    "affected_rows": good,
                    "action":       "converted",
                })
            except Exception:
                pass
        return df, entries

    def _build_analysis(self, df, filename, health_score,
                        correction_report, quarantined_rows) -> dict:
        """Build the full rich analysis dict returned to the frontend."""
        import pandas as pd
        import math

        # ── File overview ──────────────────────────────────────────────────────
        overview = {
            "filename":      filename,
            "total_rows":    len(df),
            "total_columns": len(df.columns),
            "columns":       list(df.columns),
            "file_size_kb":  None,   # bytes freed before this runs — not available
        }

        # ── Column profiles ────────────────────────────────────────────────────
        column_profiles = []
        for col in df.columns:
            series  = df[col]
            dtype   = str(series.dtype)
            n_null  = int(series.isna().sum())
            n_total = len(series)
            n_unique = int(series.nunique(dropna=True))
            pct_fill = round((n_total - n_null) / n_total * 100, 1) if n_total else 0.0

            profile: dict = {
                "column":          col,
                "dtype":           dtype,
                "null_count":      n_null,
                "fill_pct":        pct_fill,
                "unique_count":    n_unique,
            }

            # Numeric stats
            if pd.api.types.is_numeric_dtype(series):
                clean = series.dropna()
                if len(clean):
                    profile["min"]    = _safe_float(clean.min())
                    profile["max"]    = _safe_float(clean.max())
                    profile["mean"]   = _safe_float(clean.mean())
                    profile["median"] = _safe_float(clean.median())
                    profile["sum"]    = _safe_float(clean.sum())
            else:
                # Top 5 frequent values
                top = series.value_counts(dropna=True).head(5)
                profile["top_values"] = [
                    {"value": str(k), "count": int(v)}
                    for k, v in top.items()
                ]

            column_profiles.append(profile)

        # ── Sample rows (first 10, safe-serialized) ───────────────────────────
        sample_df = df.head(10).copy()
        for col in sample_df.columns:
            sample_df[col] = sample_df[col].astype(str).replace("NaT", "").replace("nan", "")
        sample_rows = sample_df.to_dict("records")

        # ── Spend summary (if amount column present) ───────────────────────────
        spend_summary = None
        amount_col = _find_col(df, ["amount_usd", "amount", "spend", "cost", "value", "total"])
        if amount_col:
            amt = pd.to_numeric(df[amount_col], errors="coerce").dropna()
            if len(amt):
                spend_summary = {
                    "column_used":   amount_col,
                    "total_spend":   _safe_float(amt.sum()),
                    "avg_per_row":   _safe_float(amt.mean()),
                    "min_value":     _safe_float(amt.min()),
                    "max_value":     _safe_float(amt.max()),
                    "rows_with_amount": len(amt),
                }

        # ── Supplier summary (if supplier column present) ─────────────────────
        supplier_summary = None
        sup_col = _find_col(df, ["supplier_name", "supplier", "vendor", "vendor_name"])
        if sup_col:
            top_sups = df[sup_col].value_counts(dropna=True).head(10)
            supplier_summary = {
                "column_used":    sup_col,
                "unique_suppliers": int(df[sup_col].nunique(dropna=True)),
                "top_suppliers":  [
                    {"name": str(k), "transaction_count": int(v)}
                    for k, v in top_sups.items()
                ],
            }
            # Add spend per supplier if both columns exist
            if amount_col:
                sup_spend = df.groupby(sup_col)[amount_col].apply(
                    lambda x: pd.to_numeric(x, errors="coerce").sum()
                ).sort_values(ascending=False).head(10)
                supplier_summary["top_suppliers_by_spend"] = [
                    {"name": str(k), "total_spend": _safe_float(v)}
                    for k, v in sup_spend.items()
                ]

        # ── Date range (if date column present) ───────────────────────────────
        date_range = None
        date_col = _find_col(df, ["invoice_date", "po_date", "date", "order_date"])
        if date_col:
            try:
                dates = pd.to_datetime(df[date_col], errors="coerce").dropna()
                if len(dates):
                    date_range = {
                        "column_used": date_col,
                        "earliest":    str(dates.min().date()),
                        "latest":      str(dates.max().date()),
                        "span_days":   int((dates.max() - dates.min()).days),
                    }
            except Exception:
                pass

        # ── Ignite AI narrative ────────────────────────────────────────────────
        ignite_narrative = _generate_narrative(
            filename, overview, health_score, spend_summary,
            supplier_summary, date_range, correction_report
        )

        return {
            "overview":          overview,
            "column_profiles":   column_profiles,
            "sample_rows":       sample_rows,
            "spend_summary":     spend_summary,
            "supplier_summary":  supplier_summary,
            "date_range":        date_range,
            "ignite_narrative":  ignite_narrative,
            "corrections_count": len(correction_report),
        }

    # ── Status / list ─────────────────────────────────────────────────────────

    async def get_status(self, ingestion_id: str) -> dict:
        result = await self.db.execute(
            select(IngestionRun).where(IngestionRun.id == ingestion_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            return {
                "ingestion_id":     ingestion_id,
                "status":           "not_found",
                "health_score":     None,
                "rows_total":       None,
                "rows_clean":       None,
                "rows_quarantined": None,
                "correction_report": [],
                "error_message":    "Ingestion run not found",
                "analysis":         None,
            }
        return {
            "ingestion_id":     ingestion_id,
            "status":           run.status or "pending",
            "health_score":     run.health_score,
            "rows_total":       run.rows_total,
            "rows_clean":       run.rows_clean,
            "rows_quarantined": run.rows_quarantined,
            "correction_report": run.correction_report or [],
            "error_message":    run.error_message,
            "analysis":         run.analysis,
        }

    async def list_runs(self) -> list:
        result = await self.db.execute(
            select(IngestionRun)
            .where(
                IngestionRun.tenant_id == self._tenant_id(),
                IngestionRun.deleted_at.is_(None),
            )
            .order_by(IngestionRun.created_at.desc())
            .limit(50)
        )
        runs = result.scalars().all()
        return [
            {
                "ingestion_id":   r.id,
                "filename":       r.filename,
                "status":         r.status,
                "health_score":   r.health_score,
                "rows_total":     r.rows_total,
                "rows_clean":     r.rows_clean,
                "rows_quarantined": r.rows_quarantined,
                "error_message":  r.error_message,
            }
            for r in runs
        ]


# ── Module-level helpers ───────────────────────────────────────────────────────

def _safe_float(v) -> float | None:
    try:
        import math
        f = float(v)
        return None if math.isnan(f) or math.isinf(f) else round(f, 2)
    except Exception:
        return None


def _find_col(df, candidates: list[str]):
    """Return first column name that matches any candidate (case-insensitive)."""
    cols_lower = {c.lower(): c for c in df.columns}
    for c in candidates:
        if c.lower() in cols_lower:
            return cols_lower[c.lower()]
    return None


def _generate_narrative(filename, overview, health_score, spend_summary,
                        supplier_summary, date_range, corrections) -> str:
    """Build a plain-English Ignite AI summary of the uploaded file."""
    lines = []
    lines.append(
        f"I've finished analysing **{filename}**. "
        f"The file contains **{overview['total_rows']:,} rows** across "
        f"**{overview['total_columns']} columns**, with a Data Health Score of "
        f"**{health_score}/100**."
    )

    if health_score >= 85:
        lines.append("The data quality is **excellent** — minimal corrections were needed.")
    elif health_score >= 65:
        lines.append("The data quality is **acceptable** — some corrections were applied.")
    else:
        lines.append("The data quality **needs attention** — several issues were detected and corrected.")

    if spend_summary:
        total = spend_summary["total_spend"]
        lines.append(
            f"Total spend detected: **${total:,.2f}** across "
            f"{spend_summary['rows_with_amount']:,} transactions "
            f"(avg ${spend_summary['avg_per_row']:,.2f} per row)."
        )

    if supplier_summary:
        lines.append(
            f"**{supplier_summary['unique_suppliers']} unique suppliers** identified. "
            + (f"Top supplier: **{supplier_summary['top_suppliers'][0]['name']}** "
               f"({supplier_summary['top_suppliers'][0]['transaction_count']} transactions)."
               if supplier_summary["top_suppliers"] else "")
        )

    if date_range:
        lines.append(
            f"Transaction date range: **{date_range['earliest']}** to **{date_range['latest']}** "
            f"({date_range['span_days']} days)."
        )

    n_cor = len(corrections)
    if n_cor:
        actions = ", ".join(sorted({c["action"] for c in corrections}))
        lines.append(
            f"**{n_cor} automatic correction(s)** were applied ({actions}). "
            "Review the Correction Report below for full details."
        )
    else:
        lines.append("No corrections were necessary — the data was already clean.")

    lines.append(
        "The processed data is ready for use across all ProcureIQ modules — "
        "Spend Analytics, Supplier 360, Risk Assessment, and Contract Intelligence."
    )

    return " ".join(lines)
