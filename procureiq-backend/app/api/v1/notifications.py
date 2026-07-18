"""Notifications API — generates actionable alerts from live DB data."""
from __future__ import annotations
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.models.contract import Contract
from app.models.supplier import Supplier
from app.models.spend import SpendTransaction

router = APIRouter()

_PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


async def _contract_notifications(db: AsyncSession, tenant_id: str) -> list[dict[str, Any]]:
    """Contracts expiring within 30 / 60 / 90 days."""
    today = date.today()
    cutoff = today + timedelta(days=90)
    q = await db.execute(
        select(Contract.id, Contract.title, Contract.end_date, Contract.value_usd)
        .where(
            and_(
                Contract.tenant_id == tenant_id,
                Contract.deleted_at.is_(None),
                Contract.status.in_(["active", "expiring_soon"]),
                Contract.end_date.isnot(None),
                Contract.end_date <= cutoff,
                Contract.end_date >= today,
            )
        )
        .order_by(Contract.end_date)
        .limit(10)
    )
    rows = q.all()
    notifications: list[dict] = []
    for row in rows:
        days_left = (row.end_date - today).days
        if days_left <= 30:
            priority = "critical"
            urgency = f"Expires in {days_left} day{'s' if days_left != 1 else ''}"
        elif days_left <= 60:
            priority = "high"
            urgency = f"Expires in {days_left} days"
        else:
            priority = "medium"
            urgency = f"Expires in {days_left} days"

        notifications.append({
            "id": f"contract-{row.id[:8]}",
            "category": "contract",
            "priority": priority,
            "title": f"Contract Expiring: {row.title[:60]}",
            "message": f"{urgency}. Contract value ${float(row.value_usd or 0):,.0f}. Initiate renewal to avoid supply disruption.",
            "action_label": "Review Contract",
            "action_path": "/app/contracts",
            "meta": {"contract_id": row.id, "days_left": days_left, "end_date": str(row.end_date)},
            "read": False,
        })
    return notifications


async def _risk_notifications(db: AsyncSession, tenant_id: str) -> list[dict[str, Any]]:
    """High and critical risk suppliers."""
    q = await db.execute(
        select(Supplier.id, Supplier.canonical_name, Supplier.risk_score, Supplier.category)
        .where(
            and_(
                Supplier.tenant_id == tenant_id,
                Supplier.deleted_at.is_(None),
                Supplier.risk_score.isnot(None),
                Supplier.risk_score >= 7.0,
            )
        )
        .order_by(Supplier.risk_score.desc())
        .limit(8)
    )
    rows = q.all()
    notifications: list[dict] = []
    for row in rows:
        score = float(row.risk_score)
        priority = "critical" if score >= 8.5 else "high"
        level = "Critical" if score >= 8.5 else "High"
        notifications.append({
            "id": f"risk-{row.id[:8]}",
            "category": "risk",
            "priority": priority,
            "title": f"{level} Risk: {row.canonical_name}",
            "message": f"Supplier risk score is {score:.1f}/10 in {row.category or 'Unknown'} category. Review mitigation strategy and consider dual-sourcing.",
            "action_label": "View Risk Profile",
            "action_path": "/app/supplier-risk",
            "meta": {"supplier_id": row.id, "risk_score": score},
            "read": False,
        })
    return notifications


async def _savings_notifications(db: AsyncSession, tenant_id: str) -> list[dict[str, Any]]:
    """Top savings opportunities by category."""
    q = await db.execute(
        select(
            Supplier.category,
            func.sum(SpendTransaction.amount_usd).label("total"),
            func.count(func.distinct(Supplier.id)).label("sup_count"),
        )
        .join(SpendTransaction, SpendTransaction.supplier_id == Supplier.id)
        .where(
            and_(
                SpendTransaction.tenant_id == tenant_id,
                SpendTransaction.deleted_at.is_(None),
            )
        )
        .group_by(Supplier.category)
        .order_by(func.sum(SpendTransaction.amount_usd).desc())
        .limit(3)
    )
    rows = q.all()
    notifications: list[dict] = []
    for i, row in enumerate(rows):
        cat = row.category or "General"
        estimated = float(row.total) * 0.08
        notifications.append({
            "id": f"savings-cat-{i}",
            "category": "savings",
            "priority": "medium",
            "title": f"Savings Opportunity: {cat}",
            "message": f"Consolidating {row.sup_count} suppliers in {cat} could yield ~${estimated:,.0f} (8% savings). Ignite recommends issuing a competitive RFQ.",
            "action_label": "View Opportunities",
            "action_path": "/app/savings",
            "meta": {"category": cat, "estimated_value": round(estimated, 0)},
            "read": False,
        })
    return notifications


async def _tail_spend_notification(db: AsyncSession, tenant_id: str) -> list[dict[str, Any]]:
    """Alert when tail spend % exceeds benchmark."""
    total_q = await db.execute(
        select(func.sum(SpendTransaction.amount_usd))
        .where(
            and_(
                SpendTransaction.tenant_id == tenant_id,
                SpendTransaction.deleted_at.is_(None),
            )
        )
    )
    grand_total = float(total_q.scalar_one() or 0)
    if grand_total == 0:
        return []

    # Suppliers ranked by spend; accumulate top 80%
    q = await db.execute(
        select(func.sum(SpendTransaction.amount_usd).label("total"))
        .join(Supplier, SpendTransaction.supplier_id == Supplier.id)
        .where(
            and_(
                SpendTransaction.tenant_id == tenant_id,
                SpendTransaction.deleted_at.is_(None),
            )
        )
        .group_by(Supplier.id)
        .order_by(func.sum(SpendTransaction.amount_usd).desc())
    )
    rows = q.all()
    cumulative = 0.0
    tail_total = 0.0
    for r in rows:
        s = float(r.total)
        if cumulative / grand_total >= 0.80:
            tail_total += s
        cumulative += s
    tail_pct = tail_total / grand_total * 100

    if tail_pct > 20:
        return [{
            "id": "tail-spend-alert",
            "category": "spend",
            "priority": "high",
            "title": f"Tail Spend Alert: {tail_pct:.1f}% of Budget",
            "message": f"Tail spend is {tail_pct:.1f}% — above the 20% industry benchmark. Consolidating tail suppliers could reduce administrative costs by 40% and improve contract coverage.",
            "action_label": "View Tail Spend",
            "action_path": "/app/tail-spend",
            "meta": {"tail_spend_percent": round(tail_pct, 1)},
            "read": False,
        }]
    return []


@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Return all actionable notifications derived from live DB data."""
    tid = current_user.tenant_id

    contract_notifs = await _contract_notifications(db, tid)
    risk_notifs     = await _risk_notifications(db, tid)
    savings_notifs  = await _savings_notifications(db, tid)
    tail_notifs     = await _tail_spend_notification(db, tid)
    # Flatten and sort: critical → high → medium → low, then by category
    all_notifs = contract_notifs + risk_notifs + tail_notifs + savings_notifs
    all_notifs.sort(key=lambda n: (_PRIORITY_ORDER.get(n["priority"], 9),))

    return {
        "notifications": all_notifs,
        "unread_count": sum(1 for n in all_notifs if not n["read"]),
        "total": len(all_notifs),
        "by_category": {
            "contract": len(contract_notifs),
            "risk": len(risk_notifs),
            "savings": len(savings_notifs),
            "spend": len(tail_notifs),
        },
    }
