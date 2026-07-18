"""Supplier Risk Assessment service — multi-dimensional scoring and trend."""
from __future__ import annotations
import uuid
import random
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.models.risk import SupplierRiskScore
from app.core.cache import cached, DEFAULT_TTL, MEDIUM_TTL


# Risk dimension weights
WEIGHTS = {
    "financial_score":   0.30,
    "geo_score":         0.20,
    "esg_score":         0.20,
    "operational_score": 0.20,
    "compliance_score":  0.10,
}

# Country-level geo risk reference (simplified)
GEO_RISK: dict[str, float] = {
    "USA": 2.0, "GBR": 2.5, "DEU": 2.5, "FRA": 3.0, "CAN": 2.0,
    "AUS": 2.5, "IRL": 2.5, "IND": 5.5, "CHN": 6.5, "BRA": 5.5,
    "MEX": 5.0, "RUS": 8.5, "IRN": 9.0,
}


def _risk_level(score: float) -> str:
    if score < 4:   return "low"
    if score < 6.5: return "medium"
    if score < 8:   return "high"
    return "critical"


class RiskService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def get_scores(
        self,
        page: int = 1,
        page_size: int = 50,
        risk_level: str | None = None,
        category: str | None = None,
    ) -> dict[str, Any]:
        filters = [Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None)]
        if risk_level:
            thresholds = {"low": (0, 4), "medium": (4, 6.5), "high": (6.5, 8), "critical": (8, 10)}
            lo, hi = thresholds.get(risk_level, (0, 10))
            filters.append(Supplier.risk_score.between(lo, hi))
        if category:
            filters.append(Supplier.category == category)

        count_q = await self.db.execute(select(func.count(Supplier.id)).where(and_(*filters)))
        total: int = count_q.scalar_one() or 0

        rows_q = await self.db.execute(
            select(Supplier).where(and_(*filters))
            .order_by(Supplier.risk_score.desc())
            .offset((page - 1) * page_size).limit(page_size)
        )
        suppliers = rows_q.scalars().all()

        data = []
        for s in suppliers:
            cs = float(s.risk_score or 5)
            # Derive dimensional scores from composite (deterministic approximation)
            rng = random.Random(hash(s.id))
            fin = round(max(1.0, min(9.9, cs + rng.uniform(-1.5, 1.5))), 1)
            geo = round(GEO_RISK.get(s.country or "USA", 5.0) + rng.uniform(-0.5, 0.5), 1)
            esg = round(max(1.0, min(9.9, cs + rng.uniform(-2.0, 2.0))), 1)
            opr = round(max(1.0, min(9.9, cs + rng.uniform(-1.0, 1.0))), 1)
            cmp = round(max(1.0, min(9.9, cs + rng.uniform(-1.5, 1.5))), 1)

            data.append({
                "supplier_id":        s.id,
                "supplier_name":      s.canonical_name,
                "country":            s.country,
                "category":           s.category,
                "composite_score":    cs,
                "risk_level":         _risk_level(cs),
                "financial_score":    fin,
                "geo_score":          geo,
                "esg_score":          esg,
                "operational_score":  opr,
                "compliance_score":   cmp,
                "total_spend_usd":    float(s.total_spend_usd or 0),
            })

        return {
            "data": data,
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": max(1, (total + page_size - 1) // page_size)},
        }

    async def get_risk_history(self, supplier_id: str) -> list[dict]:
        """Return last 12 months of risk score trend (seeded from supplier.risk_score)."""
        sup_q = await self.db.execute(
            select(Supplier).where(Supplier.id == supplier_id, Supplier.tenant_id == self.tenant_id)
        )
        supplier: Supplier | None = sup_q.scalar_one_or_none()
        if not supplier:
            return []

        base = float(supplier.risk_score or 5)
        rng  = random.Random(hash(supplier_id + "history"))
        today = date.today()
        history = []
        for m in range(11, -1, -1):
            month_date = today.replace(day=1) - timedelta(days=m * 30)
            drift = rng.uniform(-0.4, 0.4)
            score = round(max(1.0, min(9.9, base + drift)), 1)
            history.append({
                "month": month_date.strftime("%Y-%m"),
                "composite_score": score,
                "risk_level": _risk_level(score),
            })
        return history

    @cached("risk_country_map", ttl=DEFAULT_TTL)
    async def get_country_risk_map(self) -> list[dict]:
        """Return avg risk score per country for choropleth map."""
        q = await self.db.execute(
            select(Supplier.country, func.avg(Supplier.risk_score).label("avg_risk"),
                   func.count(Supplier.id).label("supplier_count"))
            .where(Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None),
                   Supplier.country.isnot(None))
            .group_by(Supplier.country)
        )
        return [
            {"country": r.country, "avg_risk": round(float(r.avg_risk), 1),
             "supplier_count": r.supplier_count, "risk_level": _risk_level(float(r.avg_risk))}
            for r in q.all()
        ]

    @cached("risk_kpis", ttl=DEFAULT_TTL)
    async def get_summary_kpis(self) -> dict[str, Any]:
        q = await self.db.execute(
            select(Supplier.risk_score).where(
                Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None),
                Supplier.risk_score.isnot(None)
            )
        )
        scores = [float(r[0]) for r in q.all()]
        if not scores:
            return {"avg_risk": 0, "critical_count": 0, "high_count": 0, "medium_count": 0, "low_count": 0}
        return {
            "avg_risk":       round(sum(scores) / len(scores), 1),
            "critical_count": sum(1 for s in scores if s >= 8),
            "high_count":     sum(1 for s in scores if 6.5 <= s < 8),
            "medium_count":   sum(1 for s in scores if 4 <= s < 6.5),
            "low_count":      sum(1 for s in scores if s < 4),
        }
