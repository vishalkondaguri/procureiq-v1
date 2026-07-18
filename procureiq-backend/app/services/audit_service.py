"""Audit log service — paginated query + summary stats."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

TENANT_ID = "demo-tenant-001"


async def log_request(
    db: AsyncSession,
    *,
    user_id: str | None,
    user_email: str | None,
    method: str,
    path: str,
    status_code: int,
    duration_ms: int,
    ip_address: str | None = None,
    user_agent: str | None = None,
    request_body_summary: str | None = None,
) -> None:
    entry = AuditLog(
        id=str(uuid.uuid4()),
        tenant_id=TENANT_ID,
        user_id=user_id,
        user_email=user_email,
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=duration_ms,
        ip_address=ip_address,
        user_agent=user_agent,
        request_body_summary=request_body_summary,
    )
    db.add(entry)
    await db.commit()


async def list_audit_logs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    method: str | None = None,
    user_email: str | None = None,
    path_prefix: str | None = None,
) -> dict:
    q = select(AuditLog).where(AuditLog.tenant_id == TENANT_ID)
    if method:
        q = q.where(AuditLog.method == method.upper())
    if user_email:
        q = q.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    if path_prefix:
        q = q.where(AuditLog.path.ilike(f"{path_prefix}%"))

    total_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(total_q)
    total: int = total_result.scalar_one()

    q = q.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    rows = result.scalars().all()

    return {
        "data": [
            {
                "id": r.id,
                "user_email": r.user_email,
                "method": r.method,
                "path": r.path,
                "status_code": r.status_code,
                "duration_ms": r.duration_ms,
                "ip_address": r.ip_address,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        },
    }


async def audit_summary(db: AsyncSession) -> dict:
    """Recent 7-day summary for the audit dashboard widget."""
    q_total = select(func.count()).select_from(
        select(AuditLog).where(AuditLog.tenant_id == TENANT_ID).subquery()
    )
    q_errors = select(func.count()).select_from(
        select(AuditLog).where(
            AuditLog.tenant_id == TENANT_ID,
            AuditLog.status_code >= 400,
        ).subquery()
    )
    q_users = select(func.count(AuditLog.user_email.distinct())).where(
        AuditLog.tenant_id == TENANT_ID
    )

    total = (await db.execute(q_total)).scalar_one()
    errors = (await db.execute(q_errors)).scalar_one()
    unique_users = (await db.execute(q_users)).scalar_one()

    return {
        "total_events": total,
        "error_events": errors,
        "unique_users": unique_users,
        "error_rate_percent": round(errors / total * 100, 1) if total > 0 else 0.0,
    }
