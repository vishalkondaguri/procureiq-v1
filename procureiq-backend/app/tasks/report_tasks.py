"""Celery tasks for executive report generation."""
from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="reports.generate_executive_report", max_retries=1)
def generate_executive_report(self, report_id: str, config: dict) -> dict:
    """Generate an executive procurement report as PDF using Ignite + WeasyPrint."""
    try:
        logger.info("Generating executive report report_id=%s", report_id)
        # TODO: Collect KPIs from all modules, call Ignite for narrative, render PDF
        return {"report_id": report_id, "status": "completed", "download_url": f"/reports/{report_id}.pdf"}
    except Exception as exc:
        logger.exception("Report generation failed: %s", exc)
        raise self.retry(exc=exc, countdown=60)
