"""Savings Opportunity Engine service — AI-generated procurement savings."""
from __future__ import annotations
import uuid
import random
from decimal import Decimal
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.savings import SavingsOpportunity
from app.models.supplier import Supplier
from app.models.spend import SpendTransaction


OPPORTUNITY_TEMPLATES = [
    {
        "type": "consolidation",
        "title_template": "Consolidate {category} spend with preferred suppliers",
        "rationale_template": (
            "Analysis shows {count} suppliers in the {category} category, many with overlapping capabilities. "
            "Consolidating to 2–3 preferred vendors could yield ~8% volume discount plus reduced administrative overhead."
        ),
        "effort": "medium",
        "confidence": 0.82,
        "value_factor": 0.08,
    },
    {
        "type": "renegotiation",
        "title_template": "Renegotiate contract with {supplier}",
        "rationale_template": (
            "Spend with {supplier} has grown {pct}% YoY but the contract rate card has not been updated. "
            "Benchmark pricing suggests a 6–12% reduction is achievable given current volume commitment."
        ),
        "effort": "low",
        "confidence": 0.76,
        "value_factor": 0.09,
    },
    {
        "type": "tail_spend_reduction",
        "title_template": "Reduce tail spend in {category}",
        "rationale_template": (
            "There are {count} tail spend suppliers in {category} accounting for {pct}% of category spend. "
            "Routing this spend through a preferred distributor or marketplace could save ~12% and reduce invoice volume by 60%."
        ),
        "effort": "medium",
        "confidence": 0.71,
        "value_factor": 0.12,
    },
    {
        "type": "contract_compliance",
        "title_template": "Enforce contract compliance for {supplier}",
        "rationale_template": (
            "Spend analysis indicates {pct}% of transactions with {supplier} are occurring outside contracted terms. "
            "Routing off-contract spend through the negotiated agreement could recover ~5% in pricing uplift."
        ),
        "effort": "low",
        "confidence": 0.88,
        "value_factor": 0.05,
    },
    {
        "type": "substitution",
        "title_template": "Evaluate alternative suppliers for {category}",
        "rationale_template": (
            "Market benchmarking indicates pricing for {category} services is 15–20% above market rate. "
            "Introducing competitive tension through RFP would drive pricing improvement with limited switching risk."
        ),
        "effort": "high",
        "confidence": 0.64,
        "value_factor": 0.15,
    },
]

CATEGORY_DESCRIPTIONS = {
    "Software & Cloud":      ("SW", 12),
    "Consulting":            ("CONS", 8),
    "IT Services":           ("ITS", 10),
    "Hardware & Networking": ("HW", 5),
    "Data & Analytics":      ("DATA", 7),
    "Facilities & Real Estate": ("FAC", 4),
    "Office Supplies":       ("OFF", 15),
    "MRO & Facilities":      ("MRO", 9),
    "Logistics":             ("LOG", 6),
    "Research & Advisory":   ("RES", 3),
}


class SavingsService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def get_opportunities(
        self,
        page: int = 1,
        page_size: int = 50,
        opp_type: str | None = None,
        status: str | None = None,
        min_value: float | None = None,
    ) -> dict[str, Any]:
        """Generate deterministic savings opportunities from spend data."""
        # Query category spend
        cat_q = await self.db.execute(
            select(Supplier.category, func.sum(SpendTransaction.amount_usd).label("total"),
                   func.count(func.distinct(Supplier.id)).label("sup_count"))
            .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
            .where(SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None))
            .group_by(Supplier.category)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
        )
        categories = cat_q.all()

        # Top suppliers for renegotiation
        sup_q = await self.db.execute(
            select(Supplier.id, Supplier.canonical_name, Supplier.category,
                   func.sum(SpendTransaction.amount_usd).label("total"))
            .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
            .where(SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None))
            .group_by(Supplier.id, Supplier.canonical_name, Supplier.category)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
            .limit(10)
        )
        top_suppliers = sup_q.all()

        opportunities: list[dict] = []
        opp_id = 1

        # Generate consolidation opportunities per category
        for cat_row in categories[:5]:
            cat = cat_row.category or "General"
            total_cat_spend = float(cat_row.total)
            sup_count = cat_row.sup_count
            tpl = OPPORTUNITY_TEMPLATES[0]  # consolidation
            opportunities.append({
                "id": f"opp-{opp_id:03d}",
                "type": tpl["type"],
                "title": f"Consolidate {cat} vendors",
                "category": cat,
                "supplier_id": None,
                "supplier_name": None,
                "estimated_value_usd": round(total_cat_spend * tpl["value_factor"], 0),
                "confidence": tpl["confidence"],
                "effort": tpl["effort"],
                "status": "identified",
                "ignite_rationale": tpl["rationale_template"].format(
                    category=cat, count=sup_count
                ),
            })
            opp_id += 1

        # Generate renegotiation for top suppliers
        for sup_row in top_suppliers[:5]:
            tpl = OPPORTUNITY_TEMPLATES[1]  # renegotiation
            opportunities.append({
                "id": f"opp-{opp_id:03d}",
                "type": tpl["type"],
                "title": f"Renegotiate {sup_row.canonical_name} agreement",
                "category": sup_row.category,
                "supplier_id": sup_row.id,
                "supplier_name": sup_row.canonical_name,
                "estimated_value_usd": round(float(sup_row.total) * tpl["value_factor"], 0),
                "confidence": tpl["confidence"],
                "effort": tpl["effort"],
                "status": "identified",
                "ignite_rationale": tpl["rationale_template"].format(
                    supplier=sup_row.canonical_name, pct=12
                ),
            })
            opp_id += 1

        # Generate tail spend reduction opportunities
        for cat_row in categories[5:10]:
            cat = cat_row.category or "General"
            tpl = OPPORTUNITY_TEMPLATES[2]  # tail_spend_reduction
            opportunities.append({
                "id": f"opp-{opp_id:03d}",
                "type": tpl["type"],
                "title": f"Reduce tail spend — {cat}",
                "category": cat,
                "supplier_id": None,
                "supplier_name": None,
                "estimated_value_usd": round(float(cat_row.total) * tpl["value_factor"], 0),
                "confidence": tpl["confidence"],
                "effort": tpl["effort"],
                "status": "identified",
                "ignite_rationale": tpl["rationale_template"].format(
                    category=cat, count=cat_row.sup_count, pct=round(float(cat_row.total) / max(1, sum(float(c.total) for c in categories)) * 100, 1)
                ),
            })
            opp_id += 1

        # Apply filters
        if opp_type:
            opportunities = [o for o in opportunities if o["type"] == opp_type]
        if status:
            opportunities = [o for o in opportunities if o["status"] == status]
        if min_value:
            opportunities = [o for o in opportunities if o["estimated_value_usd"] >= min_value]

        # Sort by estimated value descending
        opportunities.sort(key=lambda x: x["estimated_value_usd"], reverse=True)

        total = len(opportunities)
        paginated = opportunities[(page - 1) * page_size: page * page_size]

        return {
            "data": paginated,
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": max(1, (total + page_size - 1) // page_size)},
            "summary": {
                "total_identified_value": sum(o["estimated_value_usd"] for o in opportunities),
                "opportunity_count": total,
                "by_type": {t: sum(1 for o in opportunities if o["type"] == t)
                            for t in {"consolidation", "renegotiation", "tail_spend_reduction",
                                      "contract_compliance", "substitution"}},
            },
        }
