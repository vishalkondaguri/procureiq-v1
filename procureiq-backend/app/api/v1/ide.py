"""IDE (Intelligent Data Engine) upload and status endpoints."""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.ide.pipeline import IDEPipeline
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.models.ingestion import IngestionRun
from app.models.spend import SpendTransaction
from app.models.supplier import Supplier
from app.models.contract import Contract
from app.models.risk import SupplierRiskScore
from app.models.savings import SavingsOpportunity
from app.core.cache import invalidate_prefix

router = APIRouter()


class IngestionStatusResponse(BaseModel):
    ingestion_id: str
    status: str
    health_score: float | None
    rows_total: int | None
    rows_clean: int | None
    rows_quarantined: int | None
    correction_report: list[dict]
    error_message: str | None
    analysis: dict | None = None


@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Accept a file upload and kick off async IDE processing."""
    pipeline = IDEPipeline(db=db, user=current_user)
    ingestion_id = await pipeline.create_run(file)
    background_tasks.add_task(pipeline.process, ingestion_id)
    return {"ingestion_id": ingestion_id, "status": "pending"}


@router.post("/upload-dataset")
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Primary dataset upload endpoint.
    Clears ALL previous tenant data (spend, suppliers, contracts, risk, savings)
    before processing the new workbook — ensures Excel is the single source of truth.
    """
    tenant_id = str(current_user.tenant_id)

    # ── Wipe previous data for this tenant ────────────────────────────────────
    await db.execute(delete(SpendTransaction).where(SpendTransaction.tenant_id == tenant_id))
    await db.execute(delete(Contract).where(Contract.tenant_id == tenant_id))
    await db.execute(delete(SupplierRiskScore).where(SupplierRiskScore.tenant_id == tenant_id))
    await db.execute(delete(SavingsOpportunity).where(SavingsOpportunity.tenant_id == tenant_id))
    await db.execute(delete(Supplier).where(Supplier.tenant_id == tenant_id))
    await db.commit()

    # Invalidate all module caches immediately
    for prefix in ["spend_kpis", "spend_tail", "spend_pareto", "spend_monthly_trend",
                   "supplier_list", "supplier_360", "risk_kpis", "risk_country_map",
                   "health_score", "contracts", "savings"]:
        invalidate_prefix(prefix)

    # ── Queue ingestion pipeline ───────────────────────────────────────────────
    pipeline = IDEPipeline(db=db, user=current_user)
    ingestion_id = await pipeline.create_run(file)
    background_tasks.add_task(pipeline.process, ingestion_id)
    return {"ingestion_id": ingestion_id, "status": "pending", "previous_data_cleared": True}


@router.get("/dataset-status")
async def get_dataset_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Returns whether the tenant has an uploaded dataset and which sheet types were loaded.
    Used by the frontend DatasetGate to decide whether to show the upload prompt.
    """
    tenant_id = str(current_user.tenant_id)

    # Count records per entity type
    spend_q = await db.execute(
        select(func.count(SpendTransaction.id)).where(
            SpendTransaction.tenant_id == tenant_id,
            SpendTransaction.deleted_at.is_(None),
        )
    )
    spend_count: int = spend_q.scalar_one() or 0

    supplier_q = await db.execute(
        select(func.count(Supplier.id)).where(
            Supplier.tenant_id == tenant_id,
            Supplier.deleted_at.is_(None),
        )
    )
    supplier_count: int = supplier_q.scalar_one() or 0

    contract_q = await db.execute(
        select(func.count(Contract.id)).where(
            Contract.tenant_id == tenant_id,
            Contract.deleted_at.is_(None),
        )
    )
    contract_count: int = contract_q.scalar_one() or 0

    risk_q = await db.execute(
        select(func.count(SupplierRiskScore.id)).where(
            SupplierRiskScore.tenant_id == tenant_id,
            SupplierRiskScore.deleted_at.is_(None),
        )
    )
    risk_count: int = risk_q.scalar_one() or 0

    savings_q = await db.execute(
        select(func.count(SavingsOpportunity.id)).where(
            SavingsOpportunity.tenant_id == tenant_id,
            SavingsOpportunity.deleted_at.is_(None),
        )
    )
    savings_count: int = savings_q.scalar_one() or 0

    # Find the latest completed ingestion run
    run_q = await db.execute(
        select(IngestionRun)
        .where(
            IngestionRun.tenant_id == tenant_id,
            IngestionRun.status.in_(["completed", "partial"]),
        )
        .order_by(IngestionRun.created_at.desc())
        .limit(1)
    )
    latest_run = run_q.scalar_one_or_none()

    has_dataset = spend_count > 0 or supplier_count > 0

    sheets_loaded: list[str] = []
    if latest_run and latest_run.analysis:
        sheets_loaded = latest_run.analysis.get("sheets_loaded", [])
    elif has_dataset:
        # Infer from what's present
        if spend_count > 0:    sheets_loaded.append("spend")
        if supplier_count > 0: sheets_loaded.append("suppliers")
        if contract_count > 0: sheets_loaded.append("contracts")
        if risk_count > 0:     sheets_loaded.append("risk")
        if savings_count > 0:  sheets_loaded.append("savings")

    return {
        "has_dataset": has_dataset,
        "sheets_loaded": sheets_loaded,
        "last_upload": latest_run.created_at.isoformat() if latest_run else None,
        "last_filename": latest_run.filename if latest_run else None,
        "last_health_score": latest_run.health_score if latest_run else None,
        "record_counts": {
            "spend_transactions": spend_count,
            "suppliers": supplier_count,
            "contracts": contract_count,
            "risk_scores": risk_count,
            "savings_opportunities": savings_count,
        },
    }


@router.get("/status/{ingestion_id}", response_model=IngestionStatusResponse)
async def get_status(
    ingestion_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Poll ingestion run status and health score."""
    pipeline = IDEPipeline(db=db, user=current_user)
    return await pipeline.get_status(ingestion_id)


@router.get("/runs")
async def list_runs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List all ingestion runs for the current tenant."""
    pipeline = IDEPipeline(db=db, user=current_user)
    return await pipeline.list_runs()
