"""SupplierRiskScore ORM model — time-series risk scores per supplier."""
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class SupplierRiskScore(Base, TimestampMixin, TenantMixin):
    __tablename__ = "supplier_risk_scores"

    id: Mapped[str]          = mapped_column(String(36), primary_key=True)
    supplier_id: Mapped[str] = mapped_column(String(36), ForeignKey("suppliers.id"), nullable=False, index=True)
    score_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Dimension scores (0–10 scale)
    financial_score:    Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    geo_score:          Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    esg_score:          Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    operational_score:  Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    compliance_score:   Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
    composite_score:    Mapped[Decimal] = mapped_column(Numeric(5, 2), default=5)
