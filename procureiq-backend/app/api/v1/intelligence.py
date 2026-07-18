"""Supplier Intelligence & Due Diligence API endpoints."""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.intelligence.supplier_intel.service import SupplierIntelService

router = APIRouter()


@router.get("/search")
async def search_supplier(
    q: str = Query(..., min_length=2, description="Supplier name to search"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Full intelligence fetch for a named supplier from public sources."""
    svc = SupplierIntelService()
    try:
        data = await svc.get_intelligence(q.strip())
        return data
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Intelligence fetch failed: {exc}") from exc


@router.get("/tickers")
async def list_known_tickers(
    current_user: User = Depends(get_current_user),
):
    """Return list of supplier names for which ticker symbols are known."""
    from app.intelligence.supplier_intel.service import KNOWN_TICKERS
    return {"known_suppliers": sorted(set(k.title() for k, v in KNOWN_TICKERS.items() if v))}
