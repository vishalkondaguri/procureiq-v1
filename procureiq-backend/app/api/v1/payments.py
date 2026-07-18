"""Payment Analytics API endpoints — derived from spend transactions."""
from __future__ import annotations
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, text
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, get_async_session
from app.models.user import User
from app.models.spend import SpendTransaction
from app.models.supplier import Supplier

router = APIRouter()


@router.get("/summary")
async def get_payment_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """High-level payment KPIs derived from spend transactions."""
    base = [
        SpendTransaction.tenant_id == current_user.tenant_id,
        SpendTransaction.deleted_at.is_(None),
    ]

    # Total invoiced
    total_q = await db.execute(
        select(func.count(SpendTransaction.id), func.sum(SpendTransaction.amount_usd))
        .where(and_(*base))
    )
    total_count, total_amount = total_q.one()
    total_amount = float(total_amount or 0)

    # By payment terms distribution
    terms_q = await db.execute(
        select(
            SpendTransaction.payment_terms,
            func.count(SpendTransaction.id).label("count"),
            func.sum(SpendTransaction.amount_usd).label("amount"),
        )
        .where(and_(*base))
        .group_by(SpendTransaction.payment_terms)
        .order_by(func.count(SpendTransaction.id).desc())
    )
    terms_rows = terms_q.all()

    # Spend by month (for trend)
    monthly_q = await db.execute(
        select(
            func.date_trunc("month", SpendTransaction.invoice_date).label("month"),
            func.count(SpendTransaction.id).label("count"),
            func.sum(SpendTransaction.amount_usd).label("amount"),
        )
        .where(and_(*base, SpendTransaction.invoice_date.is_not(None)))
        .group_by(text("1"))
        .order_by(text("1"))
    )
    monthly_rows = monthly_q.all()

    # Top suppliers by payment volume
    supplier_q = await db.execute(
        select(
            Supplier.canonical_name.label("supplier_name"),
            func.count(SpendTransaction.id).label("invoice_count"),
            func.sum(SpendTransaction.amount_usd).label("total_paid"),
            func.avg(SpendTransaction.amount_usd).label("avg_invoice"),
            SpendTransaction.payment_terms,
        )
        .join(Supplier, SpendTransaction.supplier_id == Supplier.id)
        .where(and_(*base))
        .group_by(Supplier.canonical_name, SpendTransaction.payment_terms)
        .order_by(func.sum(SpendTransaction.amount_usd).desc())
        .limit(15)
    )
    supplier_rows = supplier_q.all()

    # PO vs Invoice lag (days between po_date and invoice_date)
    lag_q = await db.execute(
        select(
            func.avg(
                func.extract("epoch", SpendTransaction.invoice_date - SpendTransaction.po_date) / 86400
            ).label("avg_lag_days")
        )
        .where(
            and_(
                *base,
                SpendTransaction.po_date.is_not(None),
                SpendTransaction.invoice_date.is_not(None),
            )
        )
    )
    avg_lag = lag_q.scalar_one()

    return {
        "kpis": {
            "total_invoices": int(total_count or 0),
            "total_invoiced_amount": total_amount,
            "avg_invoice_value": round(total_amount / max(1, int(total_count or 1)), 2),
            "avg_po_to_invoice_days": round(float(avg_lag or 0), 1),
            "unique_payment_terms": len(terms_rows),
        },
        "payment_terms_breakdown": [
            {
                "terms": r.payment_terms or "Not Specified",
                "count": int(r.count),
                "amount": float(r.amount or 0),
                "percent": round(float(r.count) / max(1, int(total_count or 1)) * 100, 1),
            }
            for r in terms_rows
        ],
        "monthly_trend": [
            {
                "month": str(r.month)[:7],
                "invoice_count": int(r.count),
                "amount": float(r.amount or 0),
            }
            for r in monthly_rows
        ],
        "top_suppliers": [
            {
                "supplier_name": r.supplier_name,
                "invoice_count": int(r.invoice_count),
                "total_paid": float(r.total_paid or 0),
                "avg_invoice": round(float(r.avg_invoice or 0), 2),
                "payment_terms": r.payment_terms or "Not Specified",
            }
            for r in supplier_rows
        ],
    }


@router.get("/aging")
async def get_invoice_aging(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Invoice aging buckets based on invoice date distance from today."""
    from datetime import datetime, timedelta
    today = date.today()

    base = [
        SpendTransaction.tenant_id == current_user.tenant_id,
        SpendTransaction.deleted_at.is_(None),
        SpendTransaction.invoice_date.is_not(None),
    ]

    q = await db.execute(
        select(
            SpendTransaction.invoice_date,
            SpendTransaction.amount_usd,
            Supplier.canonical_name.label("supplier_name"),
            SpendTransaction.invoice_number,
            SpendTransaction.payment_terms,
        )
        .join(Supplier, SpendTransaction.supplier_id == Supplier.id)
        .where(and_(*base))
    )
    rows = q.all()

    buckets = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "91-180": 0.0, "180+": 0.0}
    bucket_counts = {k: 0 for k in buckets}
    aged_invoices = []

    for r in rows:
        if r.invoice_date is None:
            continue
        age = (today - r.invoice_date).days
        if age < 0:
            age = 0

        if age <= 30:
            bucket = "0-30"
        elif age <= 60:
            bucket = "31-60"
        elif age <= 90:
            bucket = "61-90"
        elif age <= 180:
            bucket = "91-180"
        else:
            bucket = "180+"

        buckets[bucket] += float(r.amount_usd or 0)
        bucket_counts[bucket] += 1

        if age > 60:
            aged_invoices.append({
                "invoice_number": r.invoice_number or "—",
                "supplier_name": r.supplier_name,
                "invoice_date": str(r.invoice_date),
                "age_days": age,
                "amount": float(r.amount_usd or 0),
                "payment_terms": r.payment_terms or "Not Specified",
                "bucket": bucket,
            })

    aged_invoices.sort(key=lambda x: x["age_days"], reverse=True)

    return {
        "aging_buckets": [
            {"bucket": k, "amount": round(v, 2), "count": bucket_counts[k]}
            for k, v in buckets.items()
        ],
        "aged_invoices": aged_invoices[:50],
        "total_aged_amount": sum(v for k, v in buckets.items() if k not in ("0-30")),
        "overdue_count": sum(bucket_counts[k] for k in ("61-90", "91-180", "180+")),
    }
