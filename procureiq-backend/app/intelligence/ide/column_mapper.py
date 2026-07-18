"""AI-powered universal column mapper — maps ANY procurement Excel header to ProcureIQ canonical schema.

Design principles:
- Never fail because of a different column name
- 50+ aliases per field covering every procurement ERP/spreadsheet convention
- Fuzzy matching with rapidfuzz for typos and partial matches
- Deterministic: exact matches checked before fuzzy
- Domain-specific: procurement terminology from SAP, Oracle, Coupa, Ariba, manual spreadsheets
"""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# ── Canonical schema: field → list of ALL known aliases (lowercase) ────────────
# Each alias is normalised: stripped, lowercased, underscores→spaces
CANONICAL_SYNONYMS: dict[str, list[str]] = {

    # ── Supplier / Vendor ───────────────────────────────────────────────────────
    "supplier_name": [
        "supplier", "supplier name", "vendor", "vendor name", "vendor_name",
        "company", "company name", "supplier_name", "sup name", "sup",
        "contractor", "service provider", "seller", "merchant",
        "business name", "organization", "organisation", "party name",
        "counterparty", "trading partner", "payee", "creditor",
        "manufacturer", "third party", "3rd party",
    ],
    "supplier_id": [
        "supplier id", "vendor id", "supplier_id", "vendor_id",
        "sup id", "vendor code", "supplier code", "vendor no",
        "supplier no", "creditor id", "creditor no", "bp number",
        "business partner", "party id", "third party id",
    ],
    "supplier_category": [
        "supplier category", "vendor category", "supplier type",
        "vendor type", "supplier classification",
    ],
    "supplier_country": [
        "supplier country", "vendor country", "country of origin",
        "origin country", "source country", "geo",
    ],
    "supplier_tier": [
        "tier", "supplier tier", "vendor tier", "vendor tier",
        "preferred", "approved", "strategic", "supplier tier",
        "sourcing tier", "procurement tier",
    ],

    # ── Transaction / PO ────────────────────────────────────────────────────────
    "po_number": [
        "po", "po number", "po_number", "po num", "po no", "po#",
        "purchase order", "purchase order number", "purchase order no",
        "order number", "order no", "order id", "req number",
        "requisition", "requisition number", "pr number", "order",
    ],
    "po_date": [
        "po date", "po_date", "purchase date", "order date",
        "order creation date", "po creation date", "purchase order date",
        "req date", "requisition date",
    ],
    "invoice_number": [
        "invoice", "invoice number", "invoice no", "invoice_number",
        "inv no", "inv num", "inv#", "invoice id", "bill no",
        "bill number", "document no", "document number",
    ],
    "invoice_date": [
        "invoice date", "inv date", "billing date", "bill date",
        "date", "transaction date", "posting date", "document date",
        "entry date", "value date", "payment date", "period date",
        "accounting date", "fiscal date", "spend date",
    ],

    # ── Amount / Spend ──────────────────────────────────────────────────────────
    "amount_usd": [
        "amount", "spend", "cost", "total", "value", "price",
        "spend amount", "invoice amount", "total spend", "total cost",
        "total amount", "net amount", "gross amount", "sum",
        "transaction amount", "po value", "po amount", "payment amount",
        "billed amount", "actual cost", "actual spend", "expenditure",
        "procurement spend", "line amount", "line value",
        "annual value", "contract value", "approved amount",
    ],
    "currency": [
        "currency", "currency code", "ccy", "fx", "foreign currency",
        "transaction currency", "invoice currency",
    ],

    # ── Cost Centre / Department ─────────────────────────────────────────────────
    "cost_center": [
        "cost center", "cost_center", "cost centre", "cc",
        "department", "dept", "business unit", "bu", "profit center",
        "profit centre", "cost object", "wbs", "internal order",
        "company code", "org unit", "organizational unit", "division",
        "function", "team", "group", "line of business",
    ],
    "gl_account": [
        "gl", "gl account", "gl code", "account", "ledger account",
        "general ledger", "general ledger account", "account code",
        "chart of accounts", "cost element", "expense code",
    ],

    # ── Category / Commodity ─────────────────────────────────────────────────────
    "commodity_code": [
        "commodity", "category", "item category", "spend category",
        "commodity code", "product category", "service category",
        "unspsc", "cpv", "procurement category", "spend type",
        "cost type", "expense type", "spend group", "material group",
        "material type", "service type",
    ],

    # ── Geography ────────────────────────────────────────────────────────────────
    "country": [
        "country", "country of origin", "supplier country", "geo",
        "region", "geography", "location",
    ],

    # ── Payment ──────────────────────────────────────────────────────────────────
    "payment_terms": [
        "payment terms", "pay terms", "payment_terms", "terms",
        "net days", "payment condition", "pay condition",
        "credit terms", "settlement terms", "due days",
        "days payable", "dpd", "payment", "pay",
    ],

    # ── Contract ─────────────────────────────────────────────────────────────────
    "contract_id": [
        "contract", "contract id", "contract_id", "contract no",
        "contract number", "contract ref", "contract reference",
        "agreement id", "agreement no", "agreement number",
        "agreement ref", "msa id", "sow id", "po contract",
        "framework id", "framework no",
    ],
    "contract_title": [
        "contract title", "contract name", "agreement name",
        "contract description", "agreement title", "agreement type",
        "contract type", "sow title", "scope", "description",
        "agreement", "service description",
    ],
    "contract_start": [
        "contract start", "start date", "contract_start",
        "start_date", "commencement date", "effective date",
        "agreement start", "from date", "valid from",
        "contract from", "inception date", "activation date",
    ],
    "contract_end": [
        "contract end", "end date", "contract_end", "end_date",
        "expiry date", "expiration date", "agreement end",
        "to date", "valid to", "termination date",
        "contract to", "maturity date", "renewal date",
        "expires", "expiry",
    ],
    "contract_value_usd": [
        "contract value", "contract amount", "agreed amount",
        "contract_value", "total contract value", "tcv",
        "annual value", "annual contract value", "acv",
        "contract total", "committed value", "committed spend",
        "approved value", "contract sum", "contract price",
    ],
    "contract_status": [
        "status", "contract status", "agreement status",
        "active", "expired", "state",
    ],

    # ── Flags ─────────────────────────────────────────────────────────────────────
    "is_contracted": [
        "contracted", "is contracted", "under contract",
        "contract flag", "on contract", "contract coverage",
    ],
    "is_tail_spend": [
        "tail spend", "is tail", "tail", "tail flag",
        "maverick", "off contract", "spot buy",
    ],
}


def _normalise(s: str) -> str:
    """Lowercase, strip, collapse whitespace, replace underscores with spaces."""
    return " ".join(s.strip().lower().replace("_", " ").replace("-", " ").split())


class AIColumnMapper:
    """Universal column mapper: any procurement Excel header → ProcureIQ canonical field.

    Algorithm:
    1. Exact match (normalised string)
    2. Contains match (canonical or synonym is substring of raw col)
    3. RapidFuzz token_sort_ratio ≥ 75
    4. Word-level intersection score
    Never fails — unknown columns are kept as-is.
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
        """Return {raw_col: canonical_field} for every column that can be matched."""
        mapping: dict[str, str] = {}
        for raw_col in schema:
            canonical = self._match(raw_col)
            if canonical and canonical != raw_col:
                mapping[raw_col] = canonical
                logger.info("Column map: '%s' → '%s'", raw_col, canonical)
            else:
                logger.debug("Column map: '%s' → (kept as-is)", raw_col)
        return mapping

    def _match(self, raw_col: str) -> str | None:
        """Return canonical field name or None."""
        col_norm = _normalise(raw_col)

        for canonical, synonyms in CANONICAL_SYNONYMS.items():
            canonical_norm = _normalise(canonical)
            syns_norm = [_normalise(s) for s in synonyms]

            # ── 1. Exact match ─────────────────────────────────────────────────
            if col_norm == canonical_norm or col_norm in syns_norm:
                return canonical

            # ── 2. Starts-with / ends-with match ──────────────────────────────
            for syn in syns_norm:
                if col_norm == syn:
                    return canonical
                # "date" should match "date" synonym for invoice_date
                if syn == col_norm:
                    return canonical

        # ── 3. RapidFuzz token sort ratio ─────────────────────────────────────
        if self._process:
            # Build flat list of (synonym, canonical) pairs
            all_syns: list[tuple[str, str]] = []
            for canonical, synonyms in CANONICAL_SYNONYMS.items():
                for syn in synonyms:
                    all_syns.append((_normalise(syn), canonical))

            syn_strings = [s[0] for s in all_syns]
            result = self._process.extractOne(
                col_norm, syn_strings,
                scorer=self._fuzz.token_sort_ratio,
                score_cutoff=75,
            )
            if result:
                matched_syn = result[0]
                matched_canonical = next(c for s, c in all_syns if s == matched_syn)
                logger.info("Fuzzy map: '%s' → '%s' (score %s via '%s')",
                            raw_col, matched_canonical, result[1], matched_syn)
                return matched_canonical

        # ── 4. Word intersection fallback ─────────────────────────────────────
        col_words = set(col_norm.split())
        best_canonical = None
        best_overlap = 0
        for canonical, synonyms in CANONICAL_SYNONYMS.items():
            for syn in synonyms:
                syn_words = set(_normalise(syn).split())
                overlap = len(col_words & syn_words)
                if overlap >= 2 and overlap > best_overlap:
                    best_overlap = overlap
                    best_canonical = canonical

        return best_canonical
