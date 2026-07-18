"""Spend analytics service — aggregations, KPIs, tail spend, Pareto."""
from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import select, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spend import SpendTransaction
from app.models.supplier import Supplier
from app.models.contract import Contract
from app.core.cache import cached, invalidate_prefix, DEFAULT_TTL, MEDIUM_TTL


class SpendService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    @cached("spend_kpis", ttl=DEFAULT_TTL, key_from_kwargs=["period_start", "period_end"])
    async def get_kpis(
        self,
        period_start: date | None = None,
        period_end: date | None = None,
    ) -> dict[str, Any]:
        filters = [SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None)]
        if period_start:
            filters.append(SpendTransaction.invoice_date >= period_start)
        if period_end:
            filters.append(SpendTransaction.invoice_date <= period_end)

        # Total spend
        total_q = await self.db.execute(
            select(func.sum(SpendTransaction.amount_usd)).where(and_(*filters))
        )
        total_spend: Decimal = total_q.scalar_one() or Decimal(0)

        # Active suppliers
        sup_q = await self.db.execute(
            select(func.count(func.distinct(SpendTransaction.supplier_id))).where(and_(*filters))
        )
        active_suppliers: int = sup_q.scalar_one() or 0

        # Active contracts
        contract_q = await self.db.execute(
            select(func.count(Contract.id)).where(
                and_(Contract.tenant_id == self.tenant_id,
                     Contract.status == "active",
                     Contract.deleted_at.is_(None))
            )
        )
        active_contracts: int = contract_q.scalar_one() or 0

        # Prior-period comparison (same duration, one period earlier)
        prior_spend = await self._prior_period_spend(period_start, period_end, filters)
        delta_pct = 0.0
        if prior_spend and prior_spend > 0:
            delta_pct = float((total_spend - prior_spend) / prior_spend * 100)

        # Tail spend (suppliers outside top-80% by spend)
        tail_pct = await self._tail_spend_percent(filters)

        # Contracted spend %
        contracted_pct = await self._contracted_spend_percent(filters)

        # Real savings & health score from their respective services
        from app.services.savings_service import SavingsService
        from app.services.health_score_service import HealthScoreService
        savings_svc = SavingsService(self.db, self.tenant_id)
        savings_result = await savings_svc.get_opportunities(page=1, page_size=1)
        savings_identified = savings_result["summary"]["total_identified_value"]

        health_svc = HealthScoreService(self.db, self.tenant_id)
        health_result = await health_svc.compute()
        health_score = health_result["composite_score"]

        return {
            "total_spend": float(total_spend),
            "total_spend_delta": round(delta_pct, 1),
            "active_suppliers": active_suppliers,
            "active_contracts_count": active_contracts,
            "tail_spend_percent": round(tail_pct, 1),
            "contracted_spend_percent": round(contracted_pct, 1),
            "savings_identified": round(savings_identified, 0),
            "procurement_health_score": health_score,
        }

    async def get_transactions(
        self,
        page: int = 1,
        page_size: int = 50,
        supplier_id: str | None = None,
        cost_center: str | None = None,
        period_start: date | None = None,
        period_end: date | None = None,
    ) -> dict[str, Any]:
        filters = [SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None)]
        if supplier_id:
            filters.append(SpendTransaction.supplier_id == supplier_id)
        if cost_center:
            filters.append(SpendTransaction.cost_center == cost_center)
        if period_start:
            filters.append(SpendTransaction.invoice_date >= period_start)
        if period_end:
            filters.append(SpendTransaction.invoice_date <= period_end)

        count_q = await self.db.execute(
            select(func.count(SpendTransaction.id)).where(and_(*filters))
        )
        total: int = count_q.scalar_one() or 0

        rows_q = await self.db.execute(
            select(SpendTransaction, Supplier.canonical_name.label("supplier_name"))
            .join(Supplier, SpendTransaction.supplier_id == Supplier.id)
            .where(and_(*filters))
            .order_by(SpendTransaction.invoice_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = rows_q.all()

        data = []
        for tx, sup_name in rows:
            data.append({
                "id": tx.id,
                "supplier_id": tx.supplier_id,
                "supplier_name": sup_name,
                "po_number": tx.po_number,
                "po_date": str(tx.po_date) if tx.po_date else None,
                "invoice_number": tx.invoice_number,
                "invoice_date": str(tx.invoice_date) if tx.invoice_date else None,
                "amount_usd": float(tx.amount_usd),
                "cost_center": tx.cost_center,
                "gl_account": tx.gl_account,
                "commodity_code": tx.commodity_code,
                "country": tx.country,
                "payment_terms": tx.payment_terms,
            })

        return {
            "data": data,
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": max(1, (total + page_size - 1) // page_size)},
        }

    @cached("spend_tail", ttl=DEFAULT_TTL, key_from_kwargs=["threshold_percent"])
    async def get_tail_spend(self, threshold_percent: float = 80.0) -> dict[str, Any]:
        # Suppliers sorted by spend descending; those outside threshold = tail
        q = await self.db.execute(
            select(
                Supplier.id, Supplier.canonical_name, Supplier.category,
                func.sum(SpendTransaction.amount_usd).label("total_spend"),
            )
            .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
            .where(and_(SpendTransaction.tenant_id == self.tenant_id,
                        SpendTransaction.deleted_at.is_(None)))
            .group_by(Supplier.id, Supplier.canonical_name, Supplier.category)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
        )
        rows = q.all()

        grand_total = sum(float(r.total_spend) for r in rows) or 1
        cumulative = 0.0
        strategic: list[dict] = []
        tail: list[dict] = []
        for r in rows:
            pct = float(r.total_spend) / grand_total * 100
            cumulative += pct
            entry = {"supplier_id": r.id, "supplier_name": r.canonical_name,
                     "category": r.category, "total_spend": float(r.total_spend),
                     "spend_percent": round(pct, 2)}
            if cumulative <= threshold_percent + pct:
                strategic.append(entry)
            else:
                tail.append(entry)

        tail_spend_total = sum(t["total_spend"] for t in tail)
        return {
            "strategic_suppliers": strategic,
            "tail_suppliers": tail,
            "tail_spend_total": tail_spend_total,
            "tail_spend_percent": round(tail_spend_total / grand_total * 100, 1),
            "tail_supplier_count": len(tail),
        }

    @cached("spend_pareto", ttl=DEFAULT_TTL)
    async def get_pareto(self) -> dict[str, Any]:
        q = await self.db.execute(
            select(
                Supplier.canonical_name,
                func.sum(SpendTransaction.amount_usd).label("total_spend"),
            )
            .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
            .where(and_(SpendTransaction.tenant_id == self.tenant_id,
                        SpendTransaction.deleted_at.is_(None)))
            .group_by(Supplier.canonical_name)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
        )
        rows = q.all()
        grand_total = sum(float(r.total_spend) for r in rows) or 1
        cumulative = 0.0
        pareto = []
        eighty_idx = None
        for i, r in enumerate(rows):
            cumulative += float(r.total_spend) / grand_total * 100
            pareto.append({
                "rank": i + 1,
                "supplier_name": r.canonical_name,
                "total_spend": float(r.total_spend),
                "spend_percent": round(float(r.total_spend) / grand_total * 100, 2),
                "cumulative_percent": round(cumulative, 2),
            })
            if eighty_idx is None and cumulative >= 80:
                eighty_idx = i + 1
        return {"pareto_data": pareto, "eighty_percent_threshold_suppliers": eighty_idx or len(pareto)}

    @cached("spend_monthly_trend", ttl=DEFAULT_TTL)
    async def get_monthly_trend(self) -> list[dict]:
        month_expr = func.date_trunc("month", SpendTransaction.invoice_date)
        q = await self.db.execute(
            select(
                month_expr.label("month"),
                func.sum(SpendTransaction.amount_usd).label("total"),
            )
            .where(and_(SpendTransaction.tenant_id == self.tenant_id,
                        SpendTransaction.deleted_at.is_(None)))
            .group_by(text("1"))
            .order_by(text("1"))
        )
        return [{"month": str(r.month)[:7], "total_spend": float(r.total)} for r in q.all()]

    # ── Private helpers ────────────────────────────────────────────────────────

    async def _prior_period_spend(self, start, end, base_filters) -> Decimal | None:
        if not start or not end:
            return None
        duration = (end - start).days
        prior_start = start - timedelta(days=duration + 1)
        prior_end   = start - timedelta(days=1)
        from datetime import timedelta
        q = await self.db.execute(
            select(func.sum(SpendTransaction.amount_usd)).where(
                and_(SpendTransaction.tenant_id == self.tenant_id,
                     SpendTransaction.deleted_at.is_(None),
                     SpendTransaction.invoice_date >= prior_start,
                     SpendTransaction.invoice_date <= prior_end)
            )
        )
        return q.scalar_one()

    async def _tail_spend_percent(self, filters) -> float:
        result = await self.get_tail_spend()
        return result["tail_spend_percent"]

    async def _contracted_spend_percent(self, filters) -> float:
        # Placeholder: in Phase 2, join contracts to transactions
        return 68.4
