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
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.ide.parsers.xlsx_parser import XlsxParser
from app.intelligence.ide.parsers.csv_parser import CsvParser
from app.intelligence.ide.column_mapper import AIColumnMapper
from app.intelligence.ide.supplier_normalizer import SupplierNormalizer
from app.intelligence.ide.health_scorer import DataHealthScorer
from app.models.ingestion import IngestionRun
from app.models.supplier import Supplier
from app.models.spend import SpendTransaction
from app.models.contract import Contract
from app.models.risk import SupplierRiskScore
from app.models.savings import SavingsOpportunity
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
        result = await self.db.execute(
            select(IngestionRun).where(IngestionRun.id == ingestion_id)
        )
        run_row = result.scalar_one_or_none()
        if not run_row:
            logger.error("Run %s not found in DB", ingestion_id)
            return

        filename = run_row.filename or "upload"
        ext = Path(filename).suffix.lower()

        await self._db_update_run(ingestion_id, status="processing")

        correction_report: list[dict] = []
        quarantined_rows:  list[dict] = []

        try:
            # ── Stage 1: Parse ─────────────────────────────────────────────────
            # For Excel: parse ALL sheets into typed DataFrames
            # For CSV/other: parse as single spend sheet (backwards compatible)
            fb = _FILE_BYTES_STORE.get(ingestion_id, b"")
            typed_sheets: dict[str, pd.DataFrame] = {}

            if ext in (".xlsx", ".xls"):
                typed_sheets = await _run_in_executor(XlsxParser.parse_all_sheets, fb)
                logger.info("[1] Parsed %d sheet type(s) from '%s': %s",
                            len(typed_sheets), filename, list(typed_sheets.keys()))
            else:
                parser_cls = PARSER_MAP.get(ext)
                if not parser_cls:
                    raise ValueError(f"Unsupported file type '{ext}'. Supported: .xlsx, .xls, .csv")
                df_raw = await _run_in_executor(parser_cls().parse, fb)
                typed_sheets["spend"] = df_raw
                logger.info("[1] Parsed %d rows from '%s' (CSV/other)", len(df_raw), filename)

            # Primary sheet for schema/quality/analysis pipeline = spend (or first available)
            primary_type = "spend" if "spend" in typed_sheets else next(iter(typed_sheets), None)
            raw_data: pd.DataFrame = typed_sheets.get(primary_type, pd.DataFrame()) if primary_type else pd.DataFrame()
            rows_original = len(raw_data)

            # ── Stage 2: Schema Inference ──────────────────────────────────────
            schema = self._infer_schema(raw_data)
            logger.info("[2] Schema: %d columns", len(schema))

            # ── Stage 3: AI Column Mapping (spend sheet only) ──────────────────
            column_map = await self.column_mapper.map(schema, ext)
            if column_map:
                raw_data = raw_data.rename(columns=column_map)
                typed_sheets[primary_type] = raw_data
                correction_report.append({
                    "stage":        "column_mapping",
                    "description":  f"AI mapped {len(column_map)} column(s) to canonical schema: "
                                    + ", ".join(f"'{k}' → '{v}'" for k, v in column_map.items()),
                    "affected_rows": len(raw_data),
                    "action":       "renamed",
                })

            # ── Stage 4: Data Quality Checks ──────────────────────────────────
            raw_data, qc_entries, qc_quarantined = await _run_in_executor(
                self._quality_checks, raw_data
            )
            correction_report.extend(qc_entries)
            quarantined_rows.extend(qc_quarantined)
            typed_sheets[primary_type] = raw_data

            # ── Stage 5: Supplier Normalisation ───────────────────────────────
            raw_data, norm_entries = await self.normalizer.normalize(raw_data)
            correction_report.extend(norm_entries)
            typed_sheets[primary_type] = raw_data

            # ── Stage 6: Date & Currency Normalization ─────────────────────────
            raw_data, date_entries = await _run_in_executor(
                self._normalize_dates_and_currency, raw_data
            )
            correction_report.extend(date_entries)
            typed_sheets[primary_type] = raw_data

            # ── Stage 7: Health Score ──────────────────────────────────────────
            health_score = self.health_scorer.score(raw_data)
            logger.info("[7] Health score: %.1f", health_score)

            # ── Stage 8a: Build rich analysis (uses primary/spend df) ─────────
            import traceback as _tb, sys as _sys
            analysis = None
            try:
                analysis = self._build_analysis(
                    raw_data.copy(), filename, health_score,
                    list(correction_report), list(qc_quarantined)
                )
                # Record which sheet types were loaded
                analysis["sheets_loaded"] = list(typed_sheets.keys())
                logger.info("[8a] Analysis OK — %d columns, sheets: %s",
                            len(analysis.get("column_profiles", [])), analysis["sheets_loaded"])
            except Exception as ae:
                logger.error("[8a] _build_analysis FAILED: %s", _tb.format_exc())
                analysis = None

            # ── Stage 8b: Persist ALL sheet types to PostgreSQL ───────────────
            rows_inserted = 0

            # Always persist spend/primary sheet
            if primary_type and not raw_data.empty:
                rows_inserted += await self._persist_to_db(ingestion_id, raw_data)

            # Persist supplier sheet (if separate)
            if "suppliers" in typed_sheets and primary_type != "suppliers":
                await self._persist_suppliers_sheet(typed_sheets["suppliers"])

            # Persist contracts sheet
            if "contracts" in typed_sheets:
                n = await self._persist_contracts(ingestion_id, typed_sheets["contracts"])
                if n:
                    correction_report.append({
                        "stage": "database_persist",
                        "description": f"Saved {n} contract record(s) to database",
                        "affected_rows": n, "action": "inserted",
                    })

            # Persist risk sheet
            if "risk" in typed_sheets:
                n = await self._persist_risk(ingestion_id, typed_sheets["risk"])
                if n:
                    correction_report.append({
                        "stage": "database_persist",
                        "description": f"Saved {n} risk score record(s) to database",
                        "affected_rows": n, "action": "inserted",
                    })

            # Persist savings sheet
            if "savings" in typed_sheets:
                n = await self._persist_savings(ingestion_id, typed_sheets["savings"])
                if n:
                    correction_report.append({
                        "stage": "database_persist",
                        "description": f"Saved {n} savings opportunity record(s) to database",
                        "affected_rows": n, "action": "inserted",
                    })

            if rows_inserted > 0:
                correction_report.append({
                    "stage":        "database_persist",
                    "description":  f"Saved {rows_inserted} spend transaction(s) and upserted suppliers — all modules updated",
                    "affected_rows": rows_inserted,
                    "action":       "inserted",
                })

            if analysis:
                analysis["corrections_count"] = len(correction_report)

            # Invalidate all caches
            for prefix in ["spend_kpis", "spend_tail", "spend_pareto", "spend_monthly_trend",
                           "supplier_list", "supplier_360", "risk_kpis", "risk_country_map",
                           "health_score", "contracts", "savings"]:
                invalidate_prefix(prefix)
            logger.info("[8b] Persisted %d spend rows, caches invalidated", rows_inserted)

            # ── Write final status ─────────────────────────────────────────────
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
            _FILE_BYTES_STORE.pop(ingestion_id, None)

    # ── Universal column resolver ──────────────────────────────────────────────

    @staticmethod
    def _gcol(df: pd.DataFrame, *aliases: str):
        """Case-insensitive column lookup across a list of alias names.

        Also applies the universal column mapper synonyms so any procurement
        column name variant is found automatically.
        """
        col = {c.strip().lower(): c for c in df.columns}
        for alias in aliases:
            key = alias.strip().lower()
            if key in col:
                return col[key]
        return None

    @staticmethod
    def _apply_col_map(df: pd.DataFrame) -> pd.DataFrame:
        """Apply the AIColumnMapper synchronously to rename columns to canonical names.
        Used by persist helpers that don't go through the main pipeline stage."""
        from app.intelligence.ide.column_mapper import AIColumnMapper, CANONICAL_SYNONYMS, _normalise
        col = {_normalise(c): c for c in df.columns}
        rename_map: dict[str, str] = {}
        for canonical, synonyms in CANONICAL_SYNONYMS.items():
            canonical_norm = _normalise(canonical)
            for raw_col_norm, raw_col in col.items():
                if raw_col_norm == canonical_norm or raw_col_norm in [_normalise(s) for s in synonyms]:
                    if raw_col not in rename_map:
                        rename_map[raw_col] = canonical
        return df.rename(columns=rename_map)

    # ── Stage helpers ──────────────────────────────────────────────────────────

    async def _persist_to_db(self, ingestion_id: str, df: pd.DataFrame) -> int:
        """
        Write cleaned spend data to PostgreSQL.
        - Column mapper has already run on this df (canonical names in place)
        - Upserts Supplier rows (by canonical_name per tenant)
        - Inserts SpendTransaction rows tagged with ingestion_id
        - Updates supplier total_spend_usd aggregate
        Returns number of transaction rows inserted.
        """
        if df.empty:
            return 0

        TENANT_ID = self._tenant_id()

        # Apply column map again in case any non-spend columns slipped through
        df = self._apply_col_map(df)

        # ── Universal case-insensitive column resolver ─────────────────────────
        def gcol(*aliases):
            return self._gcol(df, *aliases)

        sup_col    = gcol("supplier_name", "supplier", "vendor", "vendor name",
                          "vendor_name", "company", "payee", "creditor")
        amt_col    = gcol("amount_usd", "amount", "spend", "cost", "value", "total",
                          "spend amount", "invoice amount", "total spend", "annual value",
                          "expenditure", "procurement spend")
        date_col   = gcol("invoice_date", "date", "inv_date", "billing_date",
                          "transaction date", "posting date", "spend date",
                          "document date", "entry date")
        po_col     = gcol("po_number", "po", "po number", "po_no", "purchase order",
                          "order number", "order no")
        po_date_col= gcol("po_date", "po date", "purchase_date", "order_date")
        inv_col    = gcol("invoice_number", "invoice_no", "invoice", "inv_no",
                          "bill number", "document no")
        cc_col     = gcol("cost_center", "cost centre", "department", "dept",
                          "business unit", "division", "function", "team")
        gl_col     = gcol("gl_account", "gl", "account", "gl code")
        cat_col    = gcol("commodity_code", "category", "commodity",
                          "spend category", "product category", "service category")
        cty_col    = gcol("country", "supplier country", "geo")
        terms_col  = gcol("payment_terms", "terms", "pay terms", "payment",
                          "net days", "payment condition")
        contracted_col = gcol("is_contracted", "contracted", "under contract",
                              "on contract", "contract flag")
        tail_col   = gcol("is_tail_spend", "tail spend", "tail", "maverick")
        currency_col = gcol("currency", "ccy", "currency code")

        if not sup_col:
            logger.warning("No supplier column found in spend sheet — columns: %s",
                           list(df.columns)[:15])
            return 0
        if not amt_col:
            logger.warning("No amount column found in spend sheet — columns: %s",
                           list(df.columns)[:15])
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
        def _parse_date(v):
            if v is None:
                return None
            try:
                if hasattr(v, 'year'):  # already a date/datetime
                    return v.date() if hasattr(v, 'hour') else v
                if isinstance(v, float) and pd.isna(v):
                    return None
                parsed = pd.to_datetime(str(v), errors="coerce")
                return parsed.date() if not pd.isnull(parsed) else None
            except Exception:
                return None

        rows_inserted = 0
        for _, row in df.iterrows():
            sup_name = str(row.get(sup_col, "") or "").strip()
            if not sup_name or sup_name not in supplier_cache:
                continue
            try:
                raw_amount = row.get(amt_col)
                amount = float(pd.to_numeric(str(raw_amount).replace(",", ""),
                                             errors="coerce") or 0)
                if amount <= 0:
                    continue

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

    # ── New per-type persist helpers ──────────────────────────────────────────

    async def _persist_suppliers_sheet(self, df: pd.DataFrame) -> int:
        """Upsert Supplier rows from a dedicated Suppliers sheet.
        Applies universal column mapper first so any naming convention is handled."""
        if df.empty:
            return 0
        TENANT_ID = self._tenant_id()

        # Apply universal column mapper
        df = self._apply_col_map(df)

        def gcol(*aliases):
            return self._gcol(df, *aliases)

        name_col    = gcol("supplier_name", "supplier name", "canonical_name",
                           "vendor_name", "vendor name", "name", "supplier", "vendor",
                           "company name", "company", "payee")
        cat_col     = gcol("commodity_code", "supplier_category", "category",
                           "commodity", "spend category", "service category")
        country_col = gcol("supplier_country", "country", "country_code",
                           "geo", "origin country")
        tier_col    = gcol("supplier_tier", "tier", "vendor tier",
                           "preferred", "sourcing tier")
        risk_col    = gcol("risk_score", "risk", "composite_score",
                           "overall score", "risk level", "risk rating")
        id_col      = gcol("supplier_id", "vendor_id", "vendor code",
                           "supplier code", "vendor no")

        if not name_col:
            logger.warning("Suppliers sheet missing name column — columns: %s",
                           list(df.columns)[:10])
            return 0

        # Map text tier values to integers (e.g. "Preferred" → 1, "Approved" → 2)
        TIER_MAP = {"preferred": 1, "strategic": 1, "tier 1": 1, "tier1": 1,
                    "approved": 2, "tier 2": 2, "tier2": 2,
                    "conditional": 3, "tier 3": 3, "tier3": 3, "other": 3}
        # Map text risk values to numeric scores (0-10)
        RISK_MAP = {"low": 2.5, "medium": 5.5, "high": 7.5, "critical": 9.0,
                    "very high": 8.5, "very low": 1.5, "moderate": 5.0}

        count = 0
        for _, row in df.iterrows():
            name = str(row.get(name_col, "") or "").strip()
            if not name:
                continue
            res = await self.db.execute(
                select(Supplier).where(
                    Supplier.tenant_id == TENANT_ID,
                    Supplier.canonical_name == name,
                    Supplier.deleted_at.is_(None),
                )
            )
            existing = res.scalar_one_or_none()
            tier_val = None
            if tier_col and pd.notna(row.get(tier_col)):
                raw_tier = str(row[tier_col]).strip()
                try:
                    tier_val = int(float(raw_tier))
                except Exception:
                    tier_val = TIER_MAP.get(raw_tier.lower())
            risk_val = None
            if risk_col and pd.notna(row.get(risk_col)):
                raw_risk = str(row[risk_col]).strip()
                try:
                    risk_val = Decimal(str(round(float(raw_risk), 1)))
                except Exception:
                    mapped = RISK_MAP.get(raw_risk.lower())
                    if mapped:
                        risk_val = Decimal(str(mapped))

            if existing:
                if cat_col and pd.notna(row.get(cat_col)):
                    existing.category = str(row[cat_col]).strip()
                if country_col and pd.notna(row.get(country_col)):
                    existing.country = str(row[country_col]).strip()[:3].upper()
                if tier_val is not None:
                    existing.tier = tier_val
                if risk_val is not None:
                    existing.risk_score = risk_val
            else:
                rng = random.Random(hash(name + TENANT_ID))
                new_sup = Supplier(
                    id=str(uuid.uuid4()),
                    tenant_id=TENANT_ID,
                    canonical_name=name,
                    aliases=[],
                    category=str(row[cat_col]).strip() if cat_col and pd.notna(row.get(cat_col)) else None,
                    country=str(row[country_col]).strip()[:3].upper() if country_col and pd.notna(row.get(country_col)) else None,
                    tier=tier_val or rng.randint(1, 3),
                    risk_score=risk_val or Decimal(str(round(rng.uniform(2.0, 8.5), 1))),
                    total_spend_usd=Decimal("0"),
                    active_contracts=0,
                )
                self.db.add(new_sup)
                count += 1

        await self.db.commit()
        logger.info("[suppliers-sheet] Upserted %d suppliers", count)
        return count

    async def _persist_contracts(self, ingestion_id: str, df: pd.DataFrame) -> int:
        """Insert Contract rows from a Contracts sheet.
        Applies universal column mapper so any naming convention is handled."""
        if df.empty:
            return 0
        TENANT_ID = self._tenant_id()

        # Apply universal column mapper
        df = self._apply_col_map(df)

        def gcol(*aliases):
            return self._gcol(df, *aliases)

        sup_col    = gcol("supplier_name", "supplier name", "supplier", "vendor",
                          "vendor name", "vendor_name", "company", "counterparty")
        title_col  = gcol("contract_title", "title", "contract name", "agreement type",
                          "contract type", "description", "name", "scope",
                          "service description", "agreement")
        start_col  = gcol("contract_start", "start date", "contract start",
                          "start_date", "effective date", "commencement date",
                          "from date", "valid from", "inception date")
        end_col    = gcol("contract_end", "end date", "contract end",
                          "end_date", "expiry date", "expiration date",
                          "to date", "valid to", "termination date", "expires")
        val_col    = gcol("contract_value_usd", "annual value", "value",
                          "contract value", "amount", "total value",
                          "contract amount", "acv", "tcv", "committed value")
        status_col = gcol("contract_status", "status", "agreement status", "state")
        id_col     = gcol("contract_id", "contract id", "contract no",
                          "agreement id", "agreement no", "contract number")
        type_col   = gcol("contract_title", "agreement type", "contract type",
                          "contract_type", "service type")
        terms_col  = gcol("payment_terms", "payment terms", "terms", "pay terms")

        if not sup_col:
            logger.warning("Contracts sheet missing supplier column — columns: %s",
                           list(df.columns)[:10])
            return 0

        def _parse_date(v):
            if v is None or (isinstance(v, float) and pd.isna(v)):
                return None
            try:
                p = pd.to_datetime(str(v), errors="coerce")
                return p.date() if not pd.isnull(p) else None
            except Exception:
                return None

        # Build supplier name → id cache for this tenant
        sup_res = await self.db.execute(
            select(Supplier.canonical_name, Supplier.id).where(
                Supplier.tenant_id == TENANT_ID,
                Supplier.deleted_at.is_(None),
            )
        )
        sup_cache = {row[0]: str(row[1]) for row in sup_res.fetchall()}

        count = 0
        for _, row in df.iterrows():
            sup_name = str(row.get(sup_col, "") or "").strip() if sup_col else ""
            # Try to find supplier; create minimal one if missing
            if sup_name not in sup_cache:
                if not sup_name:
                    continue
                rng = random.Random(hash(sup_name + TENANT_ID))
                new_sup = Supplier(
                    id=str(uuid.uuid4()),
                    tenant_id=TENANT_ID,
                    canonical_name=sup_name,
                    aliases=[],
                    tier=rng.randint(1, 3),
                    risk_score=Decimal(str(round(rng.uniform(2.0, 8.5), 1))),
                    total_spend_usd=Decimal("0"),
                    active_contracts=0,
                )
                self.db.add(new_sup)
                await self.db.flush()
                sup_cache[sup_name] = str(new_sup.id)

            title = str(row[title_col]).strip() if title_col and pd.notna(row.get(title_col)) else f"Contract — {sup_name}"
            val = 0.0
            if val_col and pd.notna(row.get(val_col)):
                try:
                    val = float(pd.to_numeric(str(row[val_col]), errors="coerce") or 0)
                except Exception:
                    pass

            # Determine status
            raw_status = str(row.get(status_col, "active")).strip().lower() if status_col and pd.notna(row.get(status_col)) else "active"
            # Normalise status to allowed values
            STATUS_MAP = {
                "active": "active", "expired": "expired", "expiring": "expiring_soon",
                "expiring_soon": "expiring_soon", "draft": "draft", "terminated": "terminated",
                "cancelled": "terminated",
            }
            status_val = STATUS_MAP.get(raw_status, "active")

            end_date_val = _parse_date(row.get(end_col)) if end_col else None
            if end_date_val and end_date_val < date.today() and status_val == "active":
                status_val = "expired"

            contract = Contract(
                id=str(uuid.uuid4()),
                tenant_id=TENANT_ID,
                supplier_id=sup_cache[sup_name],
                title=title[:500],
                start_date=_parse_date(row.get(start_col)) if start_col else None,
                end_date=end_date_val,
                value_usd=Decimal(str(round(val, 2))),
                status=status_val,
            )
            self.db.add(contract)
            count += 1

        await self.db.commit()
        logger.info("[contracts-sheet] Inserted %d contracts", count)
        return count

    async def _persist_risk(self, ingestion_id: str, df: pd.DataFrame) -> int:
        """Insert SupplierRiskScore rows from a Risk sheet."""
        if df.empty:
            return 0
        TENANT_ID = self._tenant_id()
        col = {c.lower(): c for c in df.columns}

        def gcol(*names):
            for n in names:
                if n in col: return col[n]
            return None

        sup_col         = gcol("supplier_name", "supplier", "vendor", "vendor_name")
        date_col        = gcol("score_date", "date", "assessment_date", "risk_date")
        financial_col   = gcol("financial_score", "financial", "financial_risk")
        geo_col         = gcol("geo_score", "geo", "geopolitical", "geographic_risk")
        esg_col         = gcol("esg_score", "esg", "environmental")
        operational_col = gcol("operational_score", "operational", "operational_risk")
        compliance_col  = gcol("compliance_score", "compliance")
        composite_col   = gcol("composite_score", "composite", "overall_score", "risk_score", "score")

        if not sup_col:
            logger.warning("Risk sheet missing supplier column — skipping")
            return 0

        # Supplier cache
        sup_res = await self.db.execute(
            select(Supplier.canonical_name, Supplier.id).where(
                Supplier.tenant_id == TENANT_ID,
                Supplier.deleted_at.is_(None),
            )
        )
        sup_cache = {row[0]: str(row[1]) for row in sup_res.fetchall()}

        def _safe_dec(v, default=5.0) -> Decimal:
            try:
                f = float(pd.to_numeric(str(v), errors="coerce") or default)
                f = max(0.0, min(10.0, f))
                return Decimal(str(round(f, 2)))
            except Exception:
                return Decimal(str(default))

        count = 0
        for _, row in df.iterrows():
            sup_name = str(row.get(sup_col, "") or "").strip() if sup_col else ""
            if not sup_name:
                continue
            if sup_name not in sup_cache:
                rng = random.Random(hash(sup_name + TENANT_ID))
                new_sup = Supplier(
                    id=str(uuid.uuid4()), tenant_id=TENANT_ID,
                    canonical_name=sup_name, aliases=[],
                    tier=rng.randint(1, 3),
                    risk_score=Decimal(str(round(rng.uniform(2.0, 8.5), 1))),
                    total_spend_usd=Decimal("0"), active_contracts=0,
                )
                self.db.add(new_sup)
                await self.db.flush()
                sup_cache[sup_name] = str(new_sup.id)

            fin   = _safe_dec(row.get(financial_col))   if financial_col   else Decimal("5")
            geo   = _safe_dec(row.get(geo_col))          if geo_col         else Decimal("5")
            esg   = _safe_dec(row.get(esg_col))          if esg_col         else Decimal("5")
            ops   = _safe_dec(row.get(operational_col))  if operational_col else Decimal("5")
            comp  = _safe_dec(row.get(compliance_col))   if compliance_col  else Decimal("5")

            # Composite: average of available dimensions, or explicit column
            if composite_col and pd.notna(row.get(composite_col)):
                composite = _safe_dec(row.get(composite_col))
            else:
                composite = Decimal(str(round(float((fin + geo + esg + ops + comp) / 5), 2)))

            score_date_val: date = date.today()
            if date_col and pd.notna(row.get(date_col)):
                try:
                    p = pd.to_datetime(str(row[date_col]), errors="coerce")
                    if not pd.isnull(p):
                        score_date_val = p.date()
                except Exception:
                    pass

            risk_row = SupplierRiskScore(
                id=str(uuid.uuid4()),
                tenant_id=TENANT_ID,
                supplier_id=sup_cache[sup_name],
                score_date=score_date_val,
                financial_score=fin,
                geo_score=geo,
                esg_score=esg,
                operational_score=ops,
                compliance_score=comp,
                composite_score=composite,
            )
            self.db.add(risk_row)
            count += 1

        await self.db.commit()
        logger.info("[risk-sheet] Inserted %d risk score rows", count)
        return count

    async def _persist_savings(self, ingestion_id: str, df: pd.DataFrame) -> int:
        """Insert SavingsOpportunity rows from a Savings sheet."""
        if df.empty:
            return 0
        TENANT_ID = self._tenant_id()
        col = {c.lower(): c for c in df.columns}

        def gcol(*names):
            for n in names:
                if n in col: return col[n]
            return None

        type_col    = gcol("type", "saving_type", "opportunity_type", "category_type")
        sup_col     = gcol("supplier_name", "supplier", "vendor")
        val_col     = gcol("estimated_value_usd", "estimated_value", "value", "savings_value", "amount")
        conf_col    = gcol("confidence", "confidence_score")
        effort_col  = gcol("effort", "effort_level")
        status_col  = gcol("status")
        rat_col     = gcol("rationale", "ignite_rationale", "description", "notes")
        cat_col     = gcol("category", "commodity")

        if not val_col:
            logger.warning("Savings sheet missing value column — skipping")
            return 0

        # Supplier cache
        sup_res = await self.db.execute(
            select(Supplier.canonical_name, Supplier.id).where(
                Supplier.tenant_id == TENANT_ID,
                Supplier.deleted_at.is_(None),
            )
        )
        sup_cache = {row[0]: str(row[1]) for row in sup_res.fetchall()}

        VALID_TYPES   = {"consolidation", "renegotiation", "substitution", "contract_compliance", "tail_spend_reduction"}
        VALID_EFFORTS = {"low", "medium", "high"}
        VALID_STATUS  = {"identified", "in_progress", "realized", "dismissed"}

        count = 0
        for _, row in df.iterrows():
            val = 0.0
            if pd.notna(row.get(val_col)):
                try:
                    val = float(pd.to_numeric(str(row[val_col]), errors="coerce") or 0)
                except Exception:
                    pass
            if val <= 0:
                continue

            sup_name = str(row.get(sup_col, "") or "").strip() if sup_col else ""
            sup_id: str | None = sup_cache.get(sup_name) if sup_name else None

            raw_type = str(row.get(type_col, "consolidation") or "consolidation").strip().lower().replace(" ", "_") if type_col else "consolidation"
            sav_type = raw_type if raw_type in VALID_TYPES else "consolidation"

            conf_val = 0.7
            if conf_col and pd.notna(row.get(conf_col)):
                try:
                    conf_val = float(pd.to_numeric(str(row[conf_col]), errors="coerce") or 0.7)
                    if conf_val > 1:
                        conf_val = conf_val / 100
                except Exception:
                    pass

            effort_val = str(row.get(effort_col, "medium") or "medium").strip().lower() if effort_col else "medium"
            effort_val = effort_val if effort_val in VALID_EFFORTS else "medium"

            status_val = str(row.get(status_col, "identified") or "identified").strip().lower() if status_col else "identified"
            status_val = status_val if status_val in VALID_STATUS else "identified"

            rationale = str(row.get(rat_col, "") or "").strip() if rat_col else ""

            sav = SavingsOpportunity(
                id=str(uuid.uuid4()),
                tenant_id=TENANT_ID,
                type=sav_type,
                supplier_id=sup_id,
                supplier_name=sup_name or None,
                estimated_value_usd=Decimal(str(round(val, 2))),
                confidence=conf_val,
                effort=effort_val,
                status=status_val,
                ignite_rationale=rationale or f"Savings opportunity identified from uploaded dataset (ingestion {ingestion_id[:8]})",
                category=str(row[cat_col]).strip() if cat_col and pd.notna(row.get(cat_col)) else None,
            )
            self.db.add(sav)
            count += 1

        await self.db.commit()
        logger.info("[savings-sheet] Inserted %d savings opportunities", count)
        return count

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
