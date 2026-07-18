"""Executive Reporting API — Phase 3."""
from __future__ import annotations
import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()


class ReportRequest(BaseModel):
    title: str = "Executive Procurement Report"
    period_start: str = "2024-01-01"
    period_end: str   = "2024-12-31"
    include_modules: list[str] = ["spend", "contracts", "risk", "savings", "health", "forecast"]
    custom_notes: Optional[str] = None


@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_async_session),
):
    """Trigger executive report generation. Returns report_id immediately."""
    svc = ReportService(db, current_user.tenant_id, current_user)
    # Run synchronously for demo (small dataset). In prod: dispatch to Celery.
    report_id = await svc.generate(request.model_dump())
    status = await svc.get_status(report_id)
    return status


@router.get("/{report_id}")
async def get_report_status(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return report status and metadata."""
    from app.services.report_service import _report_store
    return _report_store.get(report_id, {"status": "not_found", "report_id": report_id})


@router.get("/{report_id}/html", response_class=HTMLResponse)
async def get_report_html(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    """Return the rendered HTML report for preview/printing."""
    from app.services.report_service import _report_store
    report = _report_store.get(report_id)
    if not report or report.get("status") != "completed":
        return HTMLResponse("<html><body><p>Report not ready or not found.</p></body></html>", status_code=404)
    return HTMLResponse(report["html"])
