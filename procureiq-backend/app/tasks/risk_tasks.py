"""Celery tasks for supplier risk score refresh."""
from app.tasks.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="risk.refresh_supplier_scores", max_retries=1)
def refresh_supplier_scores(self) -> dict:
    """Recalculate risk scores for all active suppliers. Scheduled nightly."""
    try:
        logger.info("Refreshing supplier risk scores")
        # TODO: Query all suppliers, run RiskService.calculate(), persist scores
        return {"status": "completed", "suppliers_updated": 0}
    except Exception as exc:
        logger.exception("Risk score refresh failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)
