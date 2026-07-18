"""Procurement Health Score service — composite multi-dimensional scorer."""
from __future__ import annotations
from typing import Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.spend import SpendTransaction
from app.models.supplier import Supplier
from app.models.contract import Contract
from app.core.cache import cached, DEFAULT_TTL


class HealthScoreService:
    """Computes a 0–100 procurement health score across 6 dimensions.

    Dimensions (configurable weights):
    - spend_management:      40% of transactions under contract, tail spend %, maverick spend
    - contract_compliance:   Contracted spend ratio, active vs expired contracts
    - supplier_performance:  Average supplier tier, risk score distribution
    - risk_management:       % high/critical risk suppliers, concentration risk
    - savings_realization:   Savings identified vs realized (placeholder)
    - data_quality:          Data completeness from IDE runs
    """

    DIMENSION_WEIGHTS = {
        "spend_management":    0.25,
        "contract_compliance": 0.20,
        "supplier_performance":0.20,
        "risk_management":     0.20,
        "savings_realization": 0.10,
        "data_quality":        0.05,
    }

    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    @cached("health_score", ttl=DEFAULT_TTL)
    async def compute(self) -> dict[str, Any]:
        dimensions = {}

        # 1. Spend Management
        dimensions["spend_management"] = await self._spend_management_score()

        # 2. Contract Compliance
        dimensions["contract_compliance"] = await self._contract_compliance_score()

        # 3. Supplier Performance
        dimensions["supplier_performance"] = await self._supplier_performance_score()

        # 4. Risk Management
        dimensions["risk_management"] = await self._risk_management_score()

        # 5. Savings Realization (placeholder)
        dimensions["savings_realization"] = 65.0

        # 6. Data Quality (placeholder — IDE health scores would feed this)
        dimensions["data_quality"] = 80.0

        composite = round(sum(
            score * self.DIMENSION_WEIGHTS[dim]
            for dim, score in dimensions.items()
        ), 1)

        return {
            "composite_score": composite,
            "grade": self._grade(composite),
            "dimensions": {k: round(v, 1) for k, v in dimensions.items()},
            "dimension_weights": self.DIMENSION_WEIGHTS,
            "benchmarks": {
                "spend_management":    75,
                "contract_compliance": 80,
                "supplier_performance":70,
                "risk_management":     75,
                "savings_realization": 60,
                "data_quality":        85,
            },
            "vs_prior_period": 3.2,   # placeholder delta
            "trend": self._mock_trend(composite),
        }

    # ── Private dimension calculators ─────────────────────────────────────────

    async def _spend_management_score(self) -> float:
        """Higher score = lower tail spend %."""
        total_q = await self.db.execute(
            select(func.count(func.distinct(Supplier.id)))
            .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
            .where(SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None))
        )
        total_sups = total_q.scalar_one() or 1
        all_sups = total_sups
        # Rough heuristic: more strategic-tier suppliers = better
        tier1_q = await self.db.execute(
            select(func.count(Supplier.id)).where(
                Supplier.tenant_id == self.tenant_id, Supplier.tier == 1, Supplier.deleted_at.is_(None)
            )
        )
        tier1 = tier1_q.scalar_one() or 0
        return round(min(90, 50 + (tier1 / max(1, all_sups)) * 200), 1)

    async def _contract_compliance_score(self) -> float:
        from datetime import date
        today = date.today()
        q = await self.db.execute(
            select(Contract.status).where(
                Contract.tenant_id == self.tenant_id, Contract.deleted_at.is_(None)
            )
        )
        statuses = [r[0] for r in q.all()]
        if not statuses:
            return 70.0
        active_pct = sum(1 for s in statuses if s == "active") / len(statuses)
        return round(min(95, active_pct * 90 + 20), 1)

    async def _supplier_performance_score(self) -> float:
        q = await self.db.execute(
            select(func.avg(Supplier.tier)).where(
                Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None)
            )
        )
        avg_tier = float(q.scalar_one() or 2.5)
        # Lower avg tier = better supplier portfolio = higher score
        return round(max(40, min(95, 100 - (avg_tier - 1) * 20)), 1)

    async def _risk_management_score(self) -> float:
        q = await self.db.execute(
            select(Supplier.risk_score).where(
                Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None),
                Supplier.risk_score.isnot(None)
            )
        )
        scores = [float(r[0]) for r in q.all()]
        if not scores:
            return 70.0
        avg = sum(scores) / len(scores)
        critical_pct = sum(1 for s in scores if s >= 8) / len(scores)
        return round(max(20, min(95, 100 - avg * 6 - critical_pct * 40)), 1)

    def _grade(self, score: float) -> str:
        if score >= 85: return "A"
        if score >= 75: return "B"
        if score >= 65: return "C"
        if score >= 55: return "D"
        return "F"

    def _mock_trend(self, current: float) -> list[dict]:
        import random
        rng = random.Random(42)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        trend = []
        score = current - rng.uniform(5, 12)
        for m in months:
            trend.append({"month": m, "score": round(score, 1)})
            score += rng.uniform(0, 1.5)
        return trend
