"""Supplier ORM model."""
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin


class Supplier(Base, TimestampMixin, TenantMixin):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    canonical_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    aliases: Mapped[list] = mapped_column(JSON, default=list)
    country: Mapped[str | None] = mapped_column(String(3), nullable=True)   # ISO-3166 alpha-3
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tier: Mapped[int] = mapped_column(Integer, default=3)
    risk_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    total_spend_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    active_contracts: Mapped[int] = mapped_column(Integer, default=0)
