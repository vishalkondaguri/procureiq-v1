"""Spend transaction ORM model."""
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class SpendTransaction(Base, TimestampMixin, TenantMixin):
    __tablename__ = "spend_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    supplier_id: Mapped[str] = mapped_column(String(36), ForeignKey("suppliers.id"), nullable=False, index=True)
    po_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    po_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    amount_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    cost_center: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gl_account: Mapped[str | None] = mapped_column(String(100), nullable=True)
    commodity_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    country: Mapped[str | None] = mapped_column(String(3), nullable=True)  # ISO-3166 alpha-3
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ingestion_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
