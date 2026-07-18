"""Settings API — tenant config, RBAC user management, audit log viewer.

IMPORTANT: Specific paths MUST be declared before the /{category} wildcard.
FastAPI matches routes in declaration order — if /{category} comes first it
will swallow /users/list, /audit/logs, etc.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_async_session, get_current_user, require_role
from app.models.user import User, USER_STATUS_ACTIVE, USER_STATUS_REJECTED
from app.services import settings_service, audit_service

router = APIRouter()

VALID_ROLES = {"admin", "procurement_manager", "analyst", "viewer"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    updates: dict[str, str]

class CreateUserRequest(BaseModel):
    email: str
    full_name: str
    role: str
    password: str

class UpdateRoleRequest(BaseModel):
    role: str

class ToggleActiveRequest(BaseModel):
    is_active: bool

class RejectUserRequest(BaseModel):
    reason: Optional[str] = None


# ── 1. Specific static routes FIRST (before any wildcard) ────────────────────

@router.get("/")
async def get_all_settings(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(get_current_user),
):
    return await settings_service.get_all_settings(db)


# ── 2. Users / RBAC ──────────────────────────────────────────────────────────

@router.get("/users/list")
async def list_users(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    users = await settings_service.list_users(db)
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "status": getattr(u, "status", "active"),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/users/pending")
async def list_pending_users(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    """Return all users with status='pending' (submitted access requests)."""
    result = await db.execute(
        select(User)
        .where(User.status == "pending")
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "status": u.status,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/users/{user_id}/approve", status_code=status.HTTP_200_OK)
async def approve_user(
    user_id: str,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    """Approve a pending access request — activates the account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.status != "pending":
        raise HTTPException(400, f"User is not pending (current status: {user.status})")

    # Generate temp password and set it
    from app.core.security import hash_password
    from app.api.v1.auth import _generate_temp_password
    temp_password = _generate_temp_password()
    user.hashed_password = hash_password(temp_password)
    user.status = USER_STATUS_ACTIVE
    user.is_active = True
    user.rejection_reason = None
    await db.commit()

    # Send welcome email with temp password (non-blocking — failure won't affect the response)
    from app.services.email_service import send_welcome_email
    await send_welcome_email(
        to_email=user.email,
        full_name=user.full_name,
        temp_password=temp_password,
    )

    return {
        "id": user.id,
        "email": user.email,
        "status": user.status,
        "is_active": user.is_active,
        "email_sent": True,
    }


@router.post("/users/{user_id}/reject", status_code=status.HTTP_200_OK)
async def reject_user(
    user_id: str,
    body: RejectUserRequest,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    """Reject a pending access request."""
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if user.status != "pending":
        raise HTTPException(400, f"User is not pending (current status: {user.status})")

    user.status = USER_STATUS_REJECTED
    user.is_active = False
    user.rejection_reason = body.reason
    await db.commit()

    return {"id": user.id, "email": user.email, "status": user.status}


@router.post("/users/create", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    if body.role not in VALID_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
    user = await settings_service.create_user(db, body.email, body.full_name, body.role, body.password)
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    if body.role not in VALID_ROLES:
        raise HTTPException(400, "Invalid role.")
    user = await settings_service.update_user_role(db, user_id, body.role)
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user.id, "role": user.role}


@router.patch("/users/{user_id}/active")
async def toggle_user(
    user_id: str,
    body: ToggleActiveRequest,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    user = await settings_service.toggle_user_active(db, user_id, body.is_active)
    if not user:
        raise HTTPException(404, "User not found")
    return {"id": user.id, "is_active": user.is_active}


# ── 5. Email configuration endpoints ─────────────────────────────────────────

class EmailConfigRequest(BaseModel):
    smtp_host:     str
    smtp_port:     int
    smtp_user:     str
    smtp_password: str
    smtp_from:     str
    smtp_enabled:  bool
    smtp_security: str   # "starttls" | "ssl"
    frontend_url:  str
    test_to:       Optional[str] = None   # only used by /test endpoint


@router.get("/email")
async def get_email_settings(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    """Return current email/SMTP configuration (password masked)."""
    cfg = await settings_service.get_settings_by_category(db, "email")
    # Mask password
    if cfg.get("smtp_password"):
        cfg["smtp_password"] = "••••••••"
    return cfg


@router.put("/email")
async def save_email_settings(
    body: EmailConfigRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_role("admin")),
):
    """Save SMTP configuration to tenant settings."""
    updates: dict = {
        "smtp_host":     body.smtp_host,
        "smtp_port":     str(body.smtp_port),
        "smtp_from":     body.smtp_from,
        "smtp_enabled":  "true" if body.smtp_enabled else "false",
        "smtp_security": body.smtp_security,
        "frontend_url":  body.frontend_url,
    }
    # Only update user/password if non-empty (don't overwrite with masked "••••")
    if body.smtp_user:
        updates["smtp_user"] = body.smtp_user
    if body.smtp_password and body.smtp_password != "••••••••":
        updates["smtp_password"] = body.smtp_password

    await settings_service.upsert_settings(db, "email", updates, str(current_user.id))
    return {"message": "Email settings saved successfully."}


@router.get("/data-sources")
async def get_data_sources(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin", "procurement_manager")),
):
    """Return a summary of all data sources ingested into ProcureIQ."""
    from sqlalchemy import select, func
    from app.models.ingestion import IngestionRun
    from app.models.spend import SpendTransaction
    from app.models.supplier import Supplier
    from app.models.contract import Contract
    from app.services.settings_service import TENANT_ID

    # Ingestion runs
    runs_q = await db.execute(
        select(IngestionRun)
        .where(IngestionRun.tenant_id == TENANT_ID)
        .order_by(IngestionRun.created_at.desc())
        .limit(50)
    )
    runs = runs_q.scalars().all()

    # Totals
    tx_q = await db.execute(
        select(func.count(SpendTransaction.id))
        .where(SpendTransaction.tenant_id == TENANT_ID, SpendTransaction.deleted_at.is_(None))
    )
    total_tx: int = tx_q.scalar_one() or 0

    sup_q = await db.execute(
        select(func.count(Supplier.id))
        .where(Supplier.tenant_id == TENANT_ID, Supplier.deleted_at.is_(None))
    )
    total_sup: int = sup_q.scalar_one() or 0

    con_q = await db.execute(
        select(func.count(Contract.id))
        .where(Contract.tenant_id == TENANT_ID, Contract.deleted_at.is_(None))
    )
    total_con: int = con_q.scalar_one() or 0

    # Non-seed records
    real_q = await db.execute(
        select(func.count(SpendTransaction.id))
        .where(
            SpendTransaction.tenant_id == TENANT_ID,
            SpendTransaction.deleted_at.is_(None),
            SpendTransaction.ingestion_id != "seed-run-001",
        )
    )
    real_records: int = real_q.scalar_one() or 0

    # Summarize runs
    completed_runs = [r for r in runs if r.status in ("completed", "partial")]
    failed_runs    = [r for r in runs if r.status == "failed"]
    total_clean    = sum(r.rows_clean or 0 for r in completed_runs)
    total_quarant  = sum(r.rows_quarantined or 0 for r in completed_runs)
    avg_health     = (
        round(sum(r.health_score for r in completed_runs if r.health_score) / max(1, len([r for r in completed_runs if r.health_score])), 1)
        if completed_runs else None
    )

    run_list = [
        {
            "id":               r.id,
            "filename":         r.filename,
            "file_type":        r.file_type,
            "status":           r.status,
            "health_score":     r.health_score,
            "rows_total":       r.rows_total,
            "rows_clean":       r.rows_clean,
            "rows_quarantined": r.rows_quarantined,
            "created_at":       r.created_at.isoformat() if r.created_at else None,
            "is_demo":          r.id == "seed-run-001",
        }
        for r in runs[:20]
    ]

    last_run = completed_runs[0] if completed_runs else None

    return {
        "summary": {
            "total_transactions":  total_tx,
            "total_suppliers":     total_sup,
            "total_contracts":     total_con,
            "real_records":        real_records,
            "demo_records":        total_tx - real_records,
            "files_processed":     len([r for r in runs if r.id != "seed-run-001"]),
            "total_clean_rows":    total_clean,
            "total_quarantined":   total_quarant,
            "avg_health_score":    avg_health,
            "failed_runs":         len(failed_runs),
            "last_refresh":        last_run.created_at.isoformat() if last_run and last_run.created_at else None,
            "active_source":       last_run.filename if last_run and last_run.id != "seed-run-001" else "Demo Dataset",
            "is_demo_only":        real_records == 0,
        },
        "runs": run_list,
    }


@router.post("/email/test")
async def test_email(
    body: EmailConfigRequest,
    _user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_async_session),
):
    """Test SMTP connectivity with supplied config — sends a real test email."""
    if not body.test_to:
        raise HTTPException(400, "test_to email address is required for the test endpoint.")

    from app.services.email_service import SMTPConfig, test_connection_sync, send_test_email
    import asyncio

    cfg = SMTPConfig(
        host=body.smtp_host,
        port=body.smtp_port,
        user=body.smtp_user,
        password=body.smtp_password,
        from_addr=body.smtp_from,
        use_ssl=(body.smtp_security == "ssl" or body.smtp_port == 465),
    )

    # First test connection only (fast, no email sent)
    conn = await asyncio.to_thread(test_connection_sync, cfg)
    if not conn["ok"]:
        return {"ok": False, "message": conn["message"]}

    # Connection ok — send the actual test email
    try:
        await send_test_email(body.test_to, cfg)
        return {
            "ok": True,
            "message": f"Test email sent successfully to {body.test_to}. Check your inbox.",
        }
    except Exception as e:
        return {"ok": False, "message": f"Connection ok but send failed: {e}"}


# ── 3. Audit log viewer ───────────────────────────────────────────────────────

@router.get("/audit/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    method: Optional[str] = None,
    user_email: Optional[str] = None,
    path_prefix: Optional[str] = None,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(require_role("admin")),
):
    return await audit_service.list_audit_logs(
        db, page=page, page_size=page_size,
        method=method, user_email=user_email, path_prefix=path_prefix,
    )


@router.get("/audit/summary")
async def get_audit_summary(
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(get_current_user),
):
    return await audit_service.audit_summary(db)


# ── 4. Wildcard category routes LAST ─────────────────────────────────────────

@router.get("/{category}")
async def get_settings_category(
    category: str,
    db: AsyncSession = Depends(get_async_session),
    _user: User = Depends(get_current_user),
):
    return await settings_service.get_settings_by_category(db, category)


@router.put("/{category}")
async def update_settings(
    category: str,
    body: SettingsUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(require_role("admin", "procurement_manager")),
):
    return await settings_service.upsert_settings(db, category, body.updates, str(current_user.id))
