"""IDE (Intelligent Data Engine) upload and status endpoints."""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel
from app.intelligence.ide.pipeline import IDEPipeline
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

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
