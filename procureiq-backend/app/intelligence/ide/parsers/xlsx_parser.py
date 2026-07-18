"""XLSX / XLS file parser for IDE Stage 1 — multi-sheet aware.

Sheet routing:
  Spend_Data  | Transactions | Spend     → SpendTransaction rows
  Suppliers   | Vendor_Master             → Supplier rows
  Contracts   | Contract_Register         → Contract rows
  Risk        | Risk_Register             → SupplierRiskScore rows
  Savings     | Savings_Pipeline          → SavingsOpportunity rows
  Forecast    | Spend_Forecast            → cached forecast data

Any unrecognised sheet is treated as Spend_Data (backwards compatible).
"""
from __future__ import annotations
import io
import pandas as pd


# Canonical sheet name → logical type
# Covers SAP, Oracle, Coupa, Ariba, manual spreadsheet naming conventions
SHEET_TYPE_MAP: dict[str, str] = {
    # ── Spend / Transactions ───────────────────────────────────────────────────
    "spend_data":              "spend",
    "spend":                   "spend",
    "transactions":            "spend",
    "transaction_data":        "spend",
    "invoice_data":            "spend",
    "invoices":                "spend",
    "purchase_orders":         "spend",
    "purchase_order_data":     "spend",
    "pos":                     "spend",
    "po_data":                 "spend",
    "spend_transactions":      "spend",
    "procurement_data":        "spend",
    "expenditure":             "spend",
    "payments":                "spend",
    "payment_data":            "spend",
    "ap_data":                 "spend",
    "accounts_payable":        "spend",
    "ledger":                  "spend",
    "data":                    "spend",
    "sheet1":                  "spend",
    "sheet 1":                 "spend",

    # ── Suppliers / Vendors ────────────────────────────────────────────────────
    "suppliers":               "suppliers",
    "supplier":                "suppliers",
    "supplier_master":         "suppliers",
    "supplier_data":           "suppliers",
    "supplier_list":           "suppliers",
    "supplier_directory":      "suppliers",
    "vendor_master":           "suppliers",
    "vendor_data":             "suppliers",
    "vendor_list":             "suppliers",
    "vendors":                 "suppliers",
    "vendor":                  "suppliers",
    "counterparties":          "suppliers",
    "business_partners":       "suppliers",
    "creditors":               "suppliers",

    # ── Contracts / Agreements ─────────────────────────────────────────────────
    "contracts":               "contracts",
    "contract":                "contracts",
    "contract_master":         "contracts",
    "contract_data":           "contracts",
    "contract_register":       "contracts",
    "contract_list":           "contracts",
    "contract_management":     "contracts",
    "agreements":              "contracts",
    "agreement":               "contracts",
    "agreement_register":      "contracts",
    "framework_agreements":    "contracts",
    "msas":                    "contracts",
    "sows":                    "contracts",
    "po_contracts":            "contracts",

    # ── Risk ───────────────────────────────────────────────────────────────────
    "risk":                    "risk",
    "risk_register":           "risk",
    "supplier_risk":           "risk",
    "risk_assessment":         "risk",
    "risk_data":               "risk",
    "risk_scores":             "risk",
    "vendor_risk":             "risk",

    # ── Savings / Pipeline ─────────────────────────────────────────────────────
    "savings":                 "savings",
    "savings_pipeline":        "savings",
    "savings_opportunities":   "savings",
    "savings_tracker":         "savings",
    "cost_savings":            "savings",
    "opportunities":           "savings",
    "value_delivery":          "savings",

    # ── Forecast ───────────────────────────────────────────────────────────────
    "forecast":                "forecast",
    "spend_forecast":          "forecast",
    "forecasting":             "forecast",
    "budget":                  "forecast",
    "budget_data":             "forecast",
    "planned_spend":           "forecast",
}


def _classify_sheet(name: str) -> str:
    """Map any sheet name to its logical procurement type.

    Normalises to lowercase with underscores, tries exact map lookup,
    then falls back to keyword scanning so completely novel sheet names
    still resolve to the right type instead of defaulting to spend.
    """
    key = name.strip().lower().replace(" ", "_").replace("-", "_")

    # Exact map lookup
    if key in SHEET_TYPE_MAP:
        return SHEET_TYPE_MAP[key]

    # Keyword scan — pick best match
    if any(k in key for k in ["contract", "agreement", "msa", "sow"]):
        return "contracts"
    if any(k in key for k in ["supplier", "vendor", "creditor", "counterparty"]):
        return "suppliers"
    if any(k in key for k in ["risk", "score", "assessment"]):
        return "risk"
    if any(k in key for k in ["saving", "opportunity", "pipeline"]):
        return "savings"
    if any(k in key for k in ["forecast", "budget", "plan"]):
        return "forecast"
    if any(k in key for k in ["spend", "transaction", "invoice", "po", "purchase",
                               "payment", "ledger", "ap", "expenditure"]):
        return "spend"

    # Default: treat as spend data (most common sheet type)
    return "spend"


class XlsxParser:
    """Parse Excel workbooks — all sheets — returning a typed dict of DataFrames."""

    @staticmethod
    def parse(file_bytes: bytes, sheet_name: str | int = 0) -> pd.DataFrame:
        """Legacy single-sheet parse (kept for backwards compatibility)."""
        buf = io.BytesIO(file_bytes)
        na_vals = ["", "N/A", "n/a", "NULL", "null", "#N/A", "NA", "-"]
        try:
            return pd.read_excel(buf, sheet_name=sheet_name, dtype=str,
                                 na_values=na_vals, keep_default_na=True,
                                 engine="calamine")
        except Exception:
            pass
        buf.seek(0)
        try:
            return pd.read_excel(buf, sheet_name=sheet_name, dtype=str,
                                 na_values=na_vals, keep_default_na=True,
                                 engine="openpyxl")
        except Exception as exc:
            raise ValueError(f"Failed to parse Excel file: {exc}") from exc

    @staticmethod
    def parse_all_sheets(file_bytes: bytes) -> dict[str, pd.DataFrame]:
        """
        Read every worksheet and return a dict keyed by logical type:
          { "spend": df, "contracts": df, "suppliers": df, ... }

        If multiple sheets map to the same type, they are concatenated.
        """
        buf = io.BytesIO(file_bytes)
        na_vals = ["", "N/A", "n/a", "NULL", "null", "#N/A", "NA", "-"]

        # ── Read all sheets ────────────────────────────────────────────────────
        raw_sheets: dict[str, pd.DataFrame] = {}
        try:
            raw_sheets = pd.read_excel(
                buf, sheet_name=None, dtype=str,
                na_values=na_vals, keep_default_na=True,
                engine="calamine",
            )
        except Exception:
            buf.seek(0)
            try:
                raw_sheets = pd.read_excel(
                    buf, sheet_name=None, dtype=str,
                    na_values=na_vals, keep_default_na=True,
                    engine="openpyxl",
                )
            except Exception as exc:
                raise ValueError(f"Failed to parse Excel workbook: {exc}") from exc

        # ── Classify and merge by type ─────────────────────────────────────────
        typed: dict[str, list[pd.DataFrame]] = {}
        for sheet_name, df in raw_sheets.items():
            if df is None or df.empty:
                continue
            sheet_type = _classify_sheet(sheet_name)
            typed.setdefault(sheet_type, []).append(df)

        result: dict[str, pd.DataFrame] = {}
        for stype, frames in typed.items():
            if len(frames) == 1:
                result[stype] = frames[0].reset_index(drop=True)
            else:
                result[stype] = pd.concat(frames, ignore_index=True)

        return result

    @staticmethod
    def detect_sheets(file_bytes: bytes) -> list[str]:
        """Return list of sheet names with their detected types."""
        try:
            from python_calamine import CalamineWorkbook
            wb = CalamineWorkbook.from_bytes(file_bytes)
            names = wb.sheet_names
        except Exception:
            xf = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
            names = xf.sheet_names
        return [{"name": n, "type": _classify_sheet(n)} for n in names]  # type: ignore[return-value]

    @staticmethod
    def parse_large(file_bytes: bytes, sheet_name: str | int = 0,
                    chunk_size: int = 5000) -> pd.DataFrame:
        buf = io.BytesIO(file_bytes)
        try:
            return pd.read_excel(buf, sheet_name=sheet_name, dtype=str, engine="calamine")
        except Exception:
            buf.seek(0)
            return pd.read_excel(buf, sheet_name=sheet_name, dtype=str, engine="openpyxl")
