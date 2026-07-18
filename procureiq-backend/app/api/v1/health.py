"""Procurement Health Score API endpoint — Phase 2."""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.health_score_service import HealthScoreService

router = APIRouter()


@router.get("")
async def get_health_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = HealthScoreService(db, current_user.tenant_id)
    return await svc.compute()
