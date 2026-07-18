"""Celery application instance."""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "procureiq",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.ide_tasks", "app.tasks.report_tasks", "app.tasks.risk_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    broker_transport_options={"socket_timeout": 3, "socket_connect_timeout": 3},
)
