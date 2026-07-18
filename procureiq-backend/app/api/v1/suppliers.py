"""Supplier 360 API endpoints."""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.supplier_service import SupplierService

router = APIRouter()


@router.get("")
async def list_suppliers(
    page: int      = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str]     = None,
    category: Optional[str]   = None,
    risk_level: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = SupplierService(db, current_user.tenant_id)
    return await svc.list_suppliers(page, page_size, search, category, risk_level)


@router.get("/{supplier_id}/360")
async def get_supplier_360(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    svc = SupplierService(db, current_user.tenant_id)
    result = await svc.get_360(supplier_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return result


@router.get("/categories")
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    """Return distinct supplier categories for filter dropdowns."""
    from sqlalchemy import select, distinct
    from app.models.supplier import Supplier
    q = await db.execute(
        select(distinct(Supplier.category))
        .where(Supplier.tenant_id == current_user.tenant_id,
               Supplier.deleted_at.is_(None),
               Supplier.category.isnot(None))
        .order_by(Supplier.category)
    )
    return {"categories": [r[0] for r in q.all()]}
