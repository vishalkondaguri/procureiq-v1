"""Contract Intelligence service — CRUD, analytics, AI analysis."""
from __future__ import annotations
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contract import Contract
from app.models.supplier import Supplier


class ContractService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def list_contracts(
        self,
        page: int = 1,
        page_size: int = 50,
        status: str | None = None,
        supplier_id: str | None = None,
        expiring_within_days: int | None = None,
        search: str | None = None,
    ) -> dict[str, Any]:
        filters = [Contract.tenant_id == self.tenant_id, Contract.deleted_at.is_(None)]
        if status:
            filters.append(Contract.status == status)
        if supplier_id:
            filters.append(Contract.supplier_id == supplier_id)
        if expiring_within_days:
            cutoff = date.today() + timedelta(days=expiring_within_days)
            filters.append(and_(Contract.end_date <= cutoff, Contract.end_date >= date.today()))
        if search:
            filters.append(Contract.title.ilike(f"%{search}%"))

        count_q = await self.db.execute(select(func.count(Contract.id)).where(and_(*filters)))
        total: int = count_q.scalar_one() or 0

        rows_q = await self.db.execute(
            select(Contract, Supplier.canonical_name.label("supplier_name"))
            .join(Supplier, Contract.supplier_id == Supplier.id, isouter=True)
            .where(and_(*filters))
            .order_by(Contract.end_date.asc().nulls_last())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        data = []
        today = date.today()
        for contract, sup_name in rows_q.all():
            days_to_expiry = (contract.end_date - today).days if contract.end_date else None
            # Auto-update status
            computed_status = contract.status
            if contract.end_date:
                if contract.end_date < today:
                    computed_status = "expired"
                elif (contract.end_date - today).days <= 90:
                    computed_status = "expiring_soon"

            data.append({
                "id": contract.id,
                "supplier_id": contract.supplier_id,
                "supplier_name": sup_name or "Unknown",
                "title": contract.title,
                "start_date": str(contract.start_date) if contract.start_date else None,
                "end_date": str(contract.end_date) if contract.end_date else None,
                "value_usd": float(contract.value_usd),
                "status": computed_status,
                "days_to_expiry": days_to_expiry,
                "has_document": bool(contract.document_path),
                "has_ai_analysis": bool(contract.extracted_clauses),
            })

        return {
            "data": data,
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": max(1, (total + page_size - 1) // page_size)},
        }

    async def get_kpis(self) -> dict[str, Any]:
        today = date.today()
        in_90_days = today + timedelta(days=90)

        all_q = await self.db.execute(
            select(Contract).where(Contract.tenant_id == self.tenant_id, Contract.deleted_at.is_(None))
        )
        contracts = all_q.scalars().all()

        active   = sum(1 for c in contracts if c.status == "active")
        expiring = sum(1 for c in contracts if c.end_date and today < c.end_date <= in_90_days)
        expired  = sum(1 for c in contracts if c.end_date and c.end_date < today)
        total_value = sum(float(c.value_usd) for c in contracts if c.status in ("active", "expiring_soon"))

        return {
            "total_contracts": len(contracts),
            "active_contracts": active,
            "expiring_within_90_days": expiring,
            "expired_contracts": expired,
            "total_active_value_usd": total_value,
            "contracts_with_ai_analysis": sum(1 for c in contracts if c.extracted_clauses),
        }

    async def get_expiry_timeline(self) -> list[dict]:
        """Contracts expiring in the next 12 months, grouped by month."""
        today = date.today()
        cutoff = today + timedelta(days=365)
        month_expr = func.date_trunc("month", Contract.end_date)
        q = await self.db.execute(
            select(
                month_expr.label("month"),
                func.count(Contract.id).label("count"),
                func.sum(Contract.value_usd).label("total_value"),
            )
            .where(
                Contract.tenant_id == self.tenant_id,
                Contract.deleted_at.is_(None),
                Contract.end_date >= today,
                Contract.end_date <= cutoff,
            )
            .group_by(text("1"))
            .order_by(text("1"))
        )
        return [
            {"month": str(r.month)[:7], "count": r.count, "total_value": float(r.total_value)}
            for r in q.all()
        ]
