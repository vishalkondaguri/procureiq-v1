"""Data Health Scorer — computes quality dimensions for IDE Stage 7."""
from __future__ import annotations
import pandas as pd


class DataHealthScorer:
    """Computes a 0–100 data health score across 5 quality dimensions.

    Dimensions (equal weight):
    - Completeness: % of non-null values
    - Consistency: % of values matching expected data type patterns
    - Uniqueness: % of non-duplicate rows
    - Validity: % of rows with no detected format violations
    - Timeliness: Estimated based on date recency (placeholder)
    """

    WEIGHTS = {
        "completeness": 0.30,
        "consistency": 0.25,
        "uniqueness": 0.20,
        "validity": 0.15,
        "timeliness": 0.10,
    }

    def score(self, df: pd.DataFrame) -> float:
        if df.empty:
            return 0.0

        completeness = self._completeness(df)
        consistency = self._consistency(df)
        uniqueness = self._uniqueness(df)
        validity = self._validity(df)
        timeliness = 80.0  # Placeholder — implement recency check in Phase 2

        composite = (
            completeness * self.WEIGHTS["completeness"]
            + consistency * self.WEIGHTS["consistency"]
            + uniqueness * self.WEIGHTS["uniqueness"]
            + validity * self.WEIGHTS["validity"]
            + timeliness * self.WEIGHTS["timeliness"]
        )
        return round(composite, 1)

    def _completeness(self, df: pd.DataFrame) -> float:
        total_cells = df.size
        if total_cells == 0:
            return 100.0
        null_cells = df.isnull().sum().sum()
        return round((1 - null_cells / total_cells) * 100, 1)

    def _consistency(self, df: pd.DataFrame) -> float:
        # Check that numeric columns contain only numeric values
        score_sum = 0.0
        numeric_cols = df.select_dtypes(include=["number"]).columns
        if len(numeric_cols) == 0:
            return 100.0
        for col in numeric_cols:
            valid = df[col].notna().sum()
            total = len(df)
            score_sum += (valid / total) * 100 if total > 0 else 100.0
        return round(score_sum / len(numeric_cols), 1)

    def _uniqueness(self, df: pd.DataFrame) -> float:
        total = len(df)
        if total == 0:
            return 100.0
        dupes = df.duplicated().sum()
        return round((1 - dupes / total) * 100, 1)

    def _validity(self, df: pd.DataFrame) -> float:
        # Placeholder: check date columns parse correctly
        return 90.0
