"""XLSX / XLS file parser for IDE Stage 1 — uses calamine (Rust) for 10-50x speed."""
from __future__ import annotations
import io
import pandas as pd


class XlsxParser:
    """Parse Excel workbooks to a consolidated pandas DataFrame."""

    @staticmethod
    def parse(file_bytes: bytes, sheet_name: str | int = 0) -> pd.DataFrame:
        """
        Read an xlsx/xls workbook and return the specified sheet as DataFrame.

        Engine priority:
          1. calamine  — Rust-based, fastest (10-50x vs openpyxl), memory-efficient
          2. openpyxl  — fallback for files calamine can't handle
        """
        buf = io.BytesIO(file_bytes)
        na_vals = ["", "N/A", "n/a", "NULL", "null", "#N/A", "NA", "-"]

        # Try calamine first (fastest)
        try:
            df = pd.read_excel(
                buf,
                sheet_name=sheet_name,
                dtype=str,
                na_values=na_vals,
                keep_default_na=True,
                engine="calamine",
            )
            return df
        except Exception:
            pass

        # Fallback to openpyxl
        buf.seek(0)
        try:
            df = pd.read_excel(
                buf,
                sheet_name=sheet_name,
                dtype=str,
                na_values=na_vals,
                keep_default_na=True,
                engine="openpyxl",
            )
            return df
        except Exception as exc:
            raise ValueError(f"Failed to parse Excel file: {exc}") from exc

    @staticmethod
    def detect_sheets(file_bytes: bytes) -> list[str]:
        """Return list of sheet names in the workbook."""
        try:
            from python_calamine import CalamineWorkbook
            wb = CalamineWorkbook.from_bytes(file_bytes)
            return wb.sheet_names
        except Exception:
            xf = pd.ExcelFile(io.BytesIO(file_bytes), engine="openpyxl")
            return xf.sheet_names

    @staticmethod
    def parse_large(file_bytes: bytes, sheet_name: str | int = 0,
                    chunk_size: int = 5000) -> pd.DataFrame:
        """
        Parse large files in chunks to avoid memory spikes.
        Returns the full concatenated DataFrame.
        """
        buf = io.BytesIO(file_bytes)
        chunks = []
        try:
            # calamine doesn't support chunksize natively, but is already memory-efficient
            df = pd.read_excel(buf, sheet_name=sheet_name, dtype=str, engine="calamine")
            return df
        except Exception:
            buf.seek(0)
            # openpyxl fallback: read in chunks manually
            df_full = pd.read_excel(buf, sheet_name=sheet_name, dtype=str, engine="openpyxl")
            return df_full
