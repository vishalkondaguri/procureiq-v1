"""TenantSettings ORM model — per-tenant configuration store."""
from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class TenantSettings(Base, TimestampMixin):
    """Key-value configuration per tenant, namespaced by category."""
    __tablename__ = "tenant_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)   # general|currency|fiscal|ignite|rbac
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
