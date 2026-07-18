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
SHEET_TYPE_MAP: dict[str, str] = {
    "spend_data":         "spend",
    "spend":              "spend",
    "transactions":       "spend",
    "invoice_data":       "spend",
    "purchase_orders":    "spend",
    "pos":                "spend",
    "suppliers":          "suppliers",
    "supplier_master":    "suppliers",
    "vendor_master":      "suppliers",
    "vendors":            "suppliers",
    "contracts":          "contracts",
    "contract_register":  "contracts",
    "contract_list":      "contracts",
    "agreements":         "contracts",
    "risk":               "risk",
    "risk_register":      "risk",
    "supplier_risk":      "risk",
    "savings":            "savings",
    "savings_pipeline":   "savings",
    "savings_opportunities": "savings",
    "forecast":           "forecast",
    "spend_forecast":     "forecast",
    "forecasting":        "forecast",
}


def _classify_sheet(name: str) -> str:
    """Map a sheet name to its logical type."""
    key = name.strip().lower().replace(" ", "_").replace("-", "_")
    return SHEET_TYPE_MAP.get(key, "spend")   # default: treat as spend data


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
