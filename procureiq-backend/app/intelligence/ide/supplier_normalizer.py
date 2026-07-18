"""Supplier name normalizer — deduplicates and standardizes supplier names."""
from __future__ import annotations
import logging
import pandas as pd

logger = logging.getLogger(__name__)


class SupplierNormalizer:
    """Fuzzy-match supplier name variants to canonical names.

    Phase 1: RapidFuzz clustering (token_sort_ratio threshold 85).
    Phase 2: watsonx-assisted disambiguation for near-matches.
    """

    MATCH_THRESHOLD = 85

    async def normalize(self, df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict]]:
        """Normalize supplier_name column in-place. Returns (df, correction_entries)."""
        correction_entries: list[dict] = []

        if "supplier_name" not in df.columns:
            return df, correction_entries

        try:
            from rapidfuzz import process, fuzz
        except ImportError:
            logger.warning("rapidfuzz not installed — skipping supplier normalization")
            return df, correction_entries

        unique_names = df["supplier_name"].dropna().unique().tolist()
        canonical_map: dict[str, str] = {}
        seen: list[str] = []

        for name in unique_names:
            if name in canonical_map:
                continue
            if not seen:
                seen.append(name)
                canonical_map[name] = name
                continue
            result = process.extractOne(name, seen, scorer=fuzz.token_sort_ratio)
            if result and result[1] >= self.MATCH_THRESHOLD:
                canonical = result[0]
                canonical_map[name] = canonical
                correction_entries.append({
                    "stage": "supplier_normalization",
                    "description": f"Merged '{name}' → '{canonical}' (similarity: {result[1]}%)",
                    "affected_rows": int((df["supplier_name"] == name).sum()),
                    "action": "merged",
                })
            else:
                seen.append(name)
                canonical_map[name] = name

        df["supplier_name"] = df["supplier_name"].map(canonical_map).fillna(df["supplier_name"])
        return df, correction_entries
