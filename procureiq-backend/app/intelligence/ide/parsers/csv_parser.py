"""CSV file parser for IDE Stage 1."""
from __future__ import annotations
import io
import chardet
import pandas as pd


class CsvParser:
    """Parse CSV files to a pandas DataFrame, handling encoding and delimiter detection."""

    @staticmethod
    def parse(file_bytes: bytes) -> pd.DataFrame:
        # Detect encoding
        detected = chardet.detect(file_bytes)
        encoding = detected.get("encoding") or "utf-8"

        # Detect delimiter by sniffing first 4 KB
        import csv
        sample = file_bytes[:4096].decode(encoding, errors="replace")
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
            delimiter = dialect.delimiter
        except csv.Error:
            delimiter = ","

        try:
            df = pd.read_csv(
                io.BytesIO(file_bytes),
                sep=delimiter,
                encoding=encoding,
                dtype=str,
                na_values=["", "N/A", "n/a", "NULL", "null", "#N/A"],
                keep_default_na=True,
            )
            return df
        except Exception as exc:
            raise ValueError(f"Failed to parse CSV file: {exc}") from exc
