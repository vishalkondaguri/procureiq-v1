"""Spend Forecasting API — Phase 3."""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.forecast_service import ForecastService

router = APIRouter()


@router.get("")
async def get_forecast(
    periods_ahead: int = Query(6, ge=1, le=24, description="Months to forecast"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = ForecastService(db, current_user.tenant_id)
    return await svc.compute(periods_ahead)
