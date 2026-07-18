"""Settings service — read/write tenant settings, manage RBAC users."""
from __future__ import annotations
import uuid
import json
from typing import Any
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.settings import TenantSettings
from app.models.user import User
from app.core.security import hash_password

TENANT_ID = "demo-tenant-001"

# Default settings per category
DEFAULTS: dict[str, dict[str, Any]] = {
    "general": {
        "app_name": "ProcureIQ",
        "company_name": "Acme Corporation",
        "logo_url": "",
        "timezone": "America/New_York",
        "date_format": "MM/DD/YYYY",
    },
    "currency": {
        "base_currency": "USD",
        "display_symbol": "$",
        "decimal_places": "2",
        "thousands_separator": ",",
        "fx_rates_enabled": "false",
    },
    "fiscal": {
        "fiscal_year_start_month": "1",
        "fiscal_year_label": "FY",
        "current_fiscal_year": "2024",
        "quarter_labels": '["Q1","Q2","Q3","Q4"]',
    },
    "ignite": {
        "model_preference": "watsonx",
        "watsonx_model_id": "ibm/granite-13b-chat-v2",
        "ollama_model": "llama3",
        "max_tokens": "1024",
        "temperature": "0.3",
        "memory_turns": "10",
        "show_citations": "true",
        "show_confidence": "true",
    },
    "notifications": {
        "contract_expiry_days_warning": "30",
        "risk_score_threshold": "70",
        "savings_opportunity_alert": "true",
        "email_digest_enabled": "false",
        "digest_frequency": "weekly",
    },
    "email": {
        "smtp_host":     "smtp.gmail.com",
        "smtp_port":     "587",
        "smtp_user":     "",
        "smtp_password": "",
        "smtp_from":     "ProcureIQ <notifications@procureiq.ai>",
        "smtp_enabled":  "false",
        "smtp_security": "starttls",   # starttls | ssl
        "frontend_url":  "http://localhost:3000",
    },
}


async def get_settings_by_category(db: AsyncSession, category: str) -> dict[str, str]:
    result = await db.execute(
        select(TenantSettings).where(
            TenantSettings.tenant_id == TENANT_ID,
            TenantSettings.category == category,
        )
    )
    rows = result.scalars().all()
    # Merge defaults with stored values
    merged = dict(DEFAULTS.get(category, {}))
    for row in rows:
        merged[row.key] = row.value
    return {k: str(v) for k, v in merged.items()}


async def get_all_settings(db: AsyncSession) -> dict[str, dict[str, str]]:
    result = await db.execute(
        select(TenantSettings).where(TenantSettings.tenant_id == TENANT_ID)
    )
    rows = result.scalars().all()

    # Build category map from DB
    db_map: dict[str, dict[str, str]] = {}
    for row in rows:
        db_map.setdefault(row.category, {})[row.key] = row.value

    # Merge with defaults for every known category
    merged: dict[str, dict[str, str]] = {}
    for cat, defaults in DEFAULTS.items():
        merged[cat] = {k: str(v) for k, v in defaults.items()}
        if cat in db_map:
            merged[cat].update(db_map[cat])

    return merged


async def upsert_settings(
    db: AsyncSession,
    category: str,
    updates: dict[str, str],
    user_id: str,
) -> dict[str, str]:
    """Upsert key/value pairs for a given category."""
    for key, value in updates.items():
        result = await db.execute(
            select(TenantSettings).where(
                TenantSettings.tenant_id == TENANT_ID,
                TenantSettings.category == category,
                TenantSettings.key == key,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = str(value)
            existing.updated_by = user_id
        else:
            db.add(TenantSettings(
                id=str(uuid.uuid4()),
                tenant_id=TENANT_ID,
                category=category,
                key=key,
                value=str(value),
                updated_by=user_id,
            ))
    await db.commit()
    return await get_settings_by_category(db, category)


# ── User / RBAC management ────────────────────────────────────────────────────

async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User).where(User.tenant_id == TENANT_ID, User.deleted_at.is_(None))
        .order_by(User.full_name)
    )
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: str,
    password: str,
) -> User:
    user = User(
        id=str(uuid.uuid4()),
        tenant_id=TENANT_ID,
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=hash_password(password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_role(db: AsyncSession, user_id: str, role: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.role = role
    await db.commit()
    await db.refresh(user)
    return user


async def toggle_user_active(db: AsyncSession, user_id: str, is_active: bool) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user
