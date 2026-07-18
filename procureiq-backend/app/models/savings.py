"""SavingsOpportunity ORM model."""
from decimal import Decimal
from sqlalchemy import String, Numeric, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class SavingsOpportunity(Base, TimestampMixin, TenantMixin):
    __tablename__ = "savings_opportunities"

    id: Mapped[str]                    = mapped_column(String(36), primary_key=True)
    # consolidation | renegotiation | substitution | contract_compliance | tail_spend_reduction
    type: Mapped[str]                  = mapped_column(String(60), nullable=False, index=True)
    supplier_id: Mapped[str | None]    = mapped_column(String(36), ForeignKey("suppliers.id"), nullable=True)
    supplier_name: Mapped[str | None]  = mapped_column(String(255), nullable=True)
    estimated_value_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    confidence: Mapped[float]          = mapped_column(Float, default=0.7)
    # low | medium | high
    effort: Mapped[str]                = mapped_column(String(20), default="medium")
    # identified | in_progress | realized | dismissed
    status: Mapped[str]                = mapped_column(String(30), default="identified", index=True)
    ignite_rationale: Mapped[str]      = mapped_column(Text, nullable=False, default="")
    commodity_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str | None]       = mapped_column(String(100), nullable=True)
