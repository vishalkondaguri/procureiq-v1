"""IDE IngestionRun ORM model — tracks every file upload and processing result."""
from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class IngestionRun(Base, TimestampMixin, TenantMixin):
    __tablename__ = "ingestion_runs"

    id: Mapped[str]            = mapped_column(String(36), primary_key=True)
    filename: Mapped[str]      = mapped_column(String(500), nullable=True)
    file_type: Mapped[str]     = mapped_column(String(20), nullable=True)
    # pending | processing | completed | failed | partial
    status: Mapped[str]        = mapped_column(String(20), default="pending", index=True)
    health_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    rows_total: Mapped[int | None]     = mapped_column(Integer, nullable=True)
    rows_clean: Mapped[int | None]     = mapped_column(Integer, nullable=True)
    rows_quarantined: Mapped[int | None] = mapped_column(Integer, nullable=True)
    correction_report: Mapped[list | None]  = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None]       = mapped_column(String(2000), nullable=True)
    uploaded_by: Mapped[str | None]         = mapped_column(String(36), nullable=True)
    analysis: Mapped[dict | None]           = mapped_column(JSON, nullable=True)
