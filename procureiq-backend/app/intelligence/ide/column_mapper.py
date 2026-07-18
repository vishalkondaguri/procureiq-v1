"""AI-powered column mapper — maps raw file headers to ProcureIQ canonical schema."""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# Canonical schema fields and their common synonym patterns
CANONICAL_SYNONYMS: dict[str, list[str]] = {
    "supplier_name": ["vendor", "supplier", "vendor_name", "company", "vendor name", "supplier name"],
    "supplier_id": ["vendor_id", "supplier_id", "vendor id", "supplier id"],
    "po_number": ["po", "purchase order", "po number", "po_no", "po num"],
    "po_date": ["po date", "purchase date", "order date", "po_date"],
    "invoice_number": ["invoice", "inv_no", "invoice no", "invoice number", "inv number"],
    "invoice_date": ["invoice date", "inv date", "billing date"],
    "amount_usd": ["amount", "cost", "spend", "total", "value", "price", "sum", "spend amount", "invoice amount"],
    "cost_center": ["cost center", "cost_center", "cc", "department", "dept", "business unit"],
    "gl_account": ["gl", "gl account", "gl code", "account", "ledger account"],
    "commodity_code": ["commodity", "category", "item category", "spend category", "commodity code"],
    "country": ["country", "country of origin", "supplier country", "geo"],
    "payment_terms": ["payment terms", "pay terms", "net days", "terms"],
    "contract_id": ["contract", "contract id", "contract no", "contract number"],
    "contract_start": ["contract start", "start date", "effective date"],
    "contract_end": ["contract end", "end date", "expiry date", "expiration date"],
    "contract_value_usd": ["contract value", "contract amount", "agreed amount"],
}


class AIColumnMapper:
    """Map raw column names to canonical ProcureIQ schema.

    Phase 1: Rule-based fuzzy matching (RapidFuzz).
    Phase 2: watsonx embedding-based semantic matching for edge cases.
    """

    def __init__(self):
        try:
            from rapidfuzz import process, fuzz
            self._fuzz = fuzz
            self._process = process
        except ImportError:
            self._fuzz = None
            self._process = None

    async def map(self, schema: dict[str, str], file_ext: str) -> dict[str, str]:
        """Return a mapping {raw_column_name: canonical_field_name}."""
        mapping: dict[str, str] = {}
        for raw_col in schema:
            canonical = self._match(raw_col)
            if canonical:
                mapping[raw_col] = canonical
                logger.debug("Column map: '%s' → '%s'", raw_col, canonical)
            else:
                logger.debug("Column map: '%s' → (no match, kept as-is)", raw_col)
        return mapping

    def _match(self, raw_col: str) -> str | None:
        col_clean = raw_col.strip().lower().replace("_", " ")
        best_canonical = None
        best_score = 0

        for canonical, synonyms in CANONICAL_SYNONYMS.items():
            # Exact match first
            if col_clean == canonical.replace("_", " ") or col_clean in synonyms:
                return canonical

            # Fuzzy match
            if self._process:
                result = self._process.extractOne(col_clean, synonyms, scorer=self._fuzz.token_sort_ratio)
                if result and result[1] > 80 and result[1] > best_score:
                    best_score = result[1]
                    best_canonical = canonical

        return best_canonical
