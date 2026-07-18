"""User ORM model."""
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, TenantMixin

# Valid values for User.status
USER_STATUS_ACTIVE   = "active"
USER_STATUS_PENDING  = "pending"
USER_STATUS_REJECTED = "rejected"


class User(Base, TimestampMixin, TenantMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="analyst")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # approval workflow: 'active' | 'pending' | 'rejected'
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=USER_STATUS_ACTIVE)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
