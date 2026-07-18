"""Savings Opportunity Engine API endpoints — Phase 2."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.savings_service import SavingsService

router = APIRouter()


@router.get("")
async def get_opportunities(
    page: int               = Query(1, ge=1),
    page_size: int          = Query(50, ge=1, le=200),
    type: Optional[str]     = None,
    status: Optional[str]   = None,
    min_value: Optional[float] = None,
    current_user: User      = Depends(get_current_user),
    db: AsyncSession        = Depends(get_async_session),
):
    svc = SavingsService(db, current_user.tenant_id)
    return await svc.get_opportunities(page, page_size, type, status, min_value)


@router.patch("/{opportunity_id}/status")
async def update_status(
    opportunity_id: str,
    new_status: str,
    current_user: User = Depends(get_current_user),
):
    """Update the status of a savings opportunity (identified → in_progress → realized)."""
    # Phase 3: persist to DB
    return {"id": opportunity_id, "status": new_status, "updated": True}
