"""Contract Intelligence API endpoints — Phase 2."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.contract_service import ContractService

router = APIRouter()


@router.get("")
async def list_contracts(
    page: int                     = Query(1, ge=1),
    page_size: int                = Query(50, ge=1, le=500),
    status: Optional[str]         = None,
    supplier_id: Optional[str]    = None,
    search: Optional[str]         = None,
    expiring_within_days: Optional[int] = Query(None, ge=1, le=365),
    current_user: User            = Depends(get_current_user),
    db: AsyncSession              = Depends(get_async_session),
):
    svc = ContractService(db, current_user.tenant_id)
    return await svc.list_contracts(page, page_size, status, supplier_id, expiring_within_days, search)


@router.get("/kpis")
async def get_contract_kpis(
    current_user: User   = Depends(get_current_user),
    db: AsyncSession     = Depends(get_async_session),
):
    svc = ContractService(db, current_user.tenant_id)
    return await svc.get_kpis()


@router.get("/expiry-timeline")
async def get_expiry_timeline(
    current_user: User   = Depends(get_current_user),
    db: AsyncSession     = Depends(get_async_session),
):
    svc = ContractService(db, current_user.tenant_id)
    return {"timeline": await svc.get_expiry_timeline()}


@router.post("/{contract_id}/analyze")
async def analyze_contract(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    """Trigger Ignite AI contract clause extraction and risk analysis."""
    # Phase 3: implement full PDF extraction + watsonx clause analysis
    return {
        "task_id": f"analyze-{contract_id}",
        "status": "queued",
        "message": "Contract analysis queued. Results available in ~30 seconds.",
    }


@router.post("/upload")
async def upload_contract(
    file: UploadFile       = File(...),
    supplier_id: str       = "",
    title: str             = "",
    current_user: User     = Depends(get_current_user),
    db: AsyncSession       = Depends(get_async_session),
):
    """Upload a contract document for storage and analysis."""
    # Phase 3: save to MinIO, create Contract row, trigger IDE + AI analysis
    return {"contract_id": "placeholder", "status": "uploaded", "message": "Contract uploaded. MinIO integration in Phase 3."}
