"""Spend analytics API endpoints."""
from __future__ import annotations
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.spend_service import SpendService

router = APIRouter()


@router.get("/summary")
async def get_summary(
    period_start: Optional[date] = Query(None),
    period_end: Optional[date]   = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    return await svc.get_kpis(period_start, period_end)


@router.get("/transactions")
async def get_transactions(
    page: int       = Query(1, ge=1),
    page_size: int  = Query(50, ge=1, le=500),
    supplier_id: Optional[str]  = None,
    cost_center: Optional[str]  = None,
    period_start: Optional[date] = Query(None),
    period_end: Optional[date]   = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    return await svc.get_transactions(page, page_size, supplier_id, cost_center, period_start, period_end)


@router.get("/tail-spend")
async def get_tail_spend(
    threshold_percent: float = Query(80.0, ge=50, le=95),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    return await svc.get_tail_spend(threshold_percent)


@router.get("/pareto")
async def get_pareto(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    return await svc.get_pareto()


@router.get("/monthly-trend")
async def get_monthly_trend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    return {"trend": await svc.get_monthly_trend()}


@router.get("/top-suppliers")
async def get_top_suppliers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    svc = SpendService(db, current_user.tenant_id)
    pareto = await svc.get_pareto()
    return {"suppliers": pareto["pareto_data"][:limit]}


@router.get("/data-status")
async def get_data_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Returns data provenance: whether the tenant has real uploaded data or only seed/demo data."""
    from sqlalchemy import select, func, and_, text as sa_text
    from app.models.spend import SpendTransaction
    from app.models.ingestion import IngestionRun

    # Count transactions
    tx_q = await db.execute(
        select(func.count(SpendTransaction.id))
        .where(
            SpendTransaction.tenant_id == current_user.tenant_id,
            SpendTransaction.deleted_at.is_(None),
        )
    )
    total_records: int = tx_q.scalar_one() or 0

    # Check for real ingestion runs (non-seed)
    run_q = await db.execute(
        select(IngestionRun)
        .where(
            IngestionRun.tenant_id == current_user.tenant_id,
            IngestionRun.status.in_(["completed", "partial"]),
        )
        .order_by(IngestionRun.created_at.desc())
        .limit(10)
    )
    runs = run_q.scalars().all()
    real_runs = [r for r in runs if r.id != "seed-run-001"]

    has_real_data = len(real_runs) > 0
    last_ingestion = real_runs[0].created_at.isoformat() if real_runs else None
    last_ingestion_id = real_runs[0].id if real_runs else None

    # Seed-only check: all transactions have ingestion_id = 'seed-run-001'
    seed_only_q = await db.execute(
        select(func.count(SpendTransaction.id))
        .where(
            SpendTransaction.tenant_id == current_user.tenant_id,
            SpendTransaction.deleted_at.is_(None),
            SpendTransaction.ingestion_id != "seed-run-001",
        )
    )
    non_seed_count: int = seed_only_q.scalar_one() or 0
    is_demo_only = non_seed_count == 0

    return {
        "has_real_data": has_real_data,
        "is_demo_only": is_demo_only,
        "total_records": total_records,
        "real_uploaded_records": non_seed_count,
        "demo_records": total_records - non_seed_count,
        "last_ingestion": last_ingestion,
        "last_ingestion_id": last_ingestion_id,
        "ingestion_run_count": len(real_runs),
        "message": (
            "Live data from uploaded files"
            if has_real_data else
            "Demo dataset — upload procurement files to see your real data"
        ),
    }


@router.get("/categories")
async def get_category_spend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Spend breakdown by supplier category, sorted by spend descending."""
    from sqlalchemy import select, func, and_
    from app.models.spend import SpendTransaction
    from app.models.supplier import Supplier

    q = await db.execute(
        select(
            Supplier.category,
            func.sum(SpendTransaction.amount_usd).label("total_spend"),
        )
        .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
        .where(
            and_(
                SpendTransaction.tenant_id == current_user.tenant_id,
                SpendTransaction.deleted_at.is_(None),
            )
        )
        .group_by(Supplier.category)
        .order_by(func.sum(SpendTransaction.amount_usd).desc())
    )
    rows = q.all()
    grand_total = sum(float(r.total_spend) for r in rows) or 1
    categories = [
        {
            "category": r.category or "Uncategorized",
            "total_spend": float(r.total_spend),
            "percent": round(float(r.total_spend) / grand_total * 100, 1),
        }
        for r in rows
    ]
    return {"categories": categories, "grand_total": grand_total}
