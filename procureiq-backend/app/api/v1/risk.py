"""Supplier Risk Assessment API endpoints — Phase 2."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.risk_service import RiskService

router = APIRouter()


@router.get("/scores")
async def get_risk_scores(
    page: int              = Query(1, ge=1),
    page_size: int         = Query(50, ge=1, le=500),
    risk_level: Optional[str]  = None,
    category: Optional[str]    = None,
    current_user: User     = Depends(get_current_user),
    db: AsyncSession       = Depends(get_async_session),
):
    svc = RiskService(db, current_user.tenant_id)
    return await svc.get_scores(page, page_size, risk_level, category)


@router.get("/kpis")
async def get_risk_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = RiskService(db, current_user.tenant_id)
    return await svc.get_summary_kpis()


@router.get("/scores/{supplier_id}/history")
async def get_risk_history(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = RiskService(db, current_user.tenant_id)
    return {"supplier_id": supplier_id, "history": await svc.get_risk_history(supplier_id)}


@router.get("/map")
async def get_risk_map(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = RiskService(db, current_user.tenant_id)
    return {"country_risk": await svc.get_country_risk_map()}
