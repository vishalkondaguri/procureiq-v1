"""Contract ORM model."""
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class Contract(Base, TimestampMixin, TenantMixin):
    __tablename__ = "contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    supplier_id: Mapped[str] = mapped_column(String(36), ForeignKey("suppliers.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    value_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    # active | expiring_soon | expired | draft | terminated
    status: Mapped[str] = mapped_column(String(50), default="active", index=True)
    document_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    extracted_clauses: Mapped[dict | None] = mapped_column(JSON, nullable=True)
