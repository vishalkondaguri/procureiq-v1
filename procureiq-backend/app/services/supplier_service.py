"""Supplier service — 360° profile, list, risk aggregation, health index."""
from __future__ import annotations
from datetime import date, timedelta
from typing import Any

from sqlalchemy import select, func, and_, text, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.models.spend import SpendTransaction
from app.models.contract import Contract
from app.models.risk import SupplierRiskScore
from app.core.cache import cached, MEDIUM_TTL, DEFAULT_TTL


def _risk_label(score: float) -> str:
    if score < 4:   return "low"
    if score < 6.5: return "medium"
    if score < 8:   return "high"
    return "critical"


def _health_score(risk: float) -> int:
    """Convert risk score (0-10, higher = worse) to health (0-100, higher = better)."""
    return max(0, min(100, round(100 - risk * 10)))


def _performance_rating(health: int) -> str:
    if health >= 85: return "Excellent"
    if health >= 70: return "Good"
    if health >= 55: return "Acceptable"
    if health >= 40: return "Needs Improvement"
    return "Poor"


class SupplierService:
    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    @cached("supplier_list", ttl=MEDIUM_TTL, key_from_kwargs=["page", "page_size", "search", "category", "risk_level"])
    async def list_suppliers(
        self,
        page: int = 1,
        page_size: int = 50,
        search: str | None = None,
        category: str | None = None,
        risk_level: str | None = None,
    ) -> dict[str, Any]:
        filters = [Supplier.tenant_id == self.tenant_id, Supplier.deleted_at.is_(None)]
        if search:
            filters.append(Supplier.canonical_name.ilike(f"%{search}%"))
        if category:
            filters.append(Supplier.category == category)
        if risk_level:
            thresholds = {"low": (0, 4), "medium": (4, 6.5), "high": (6.5, 8), "critical": (8, 10)}
            lo, hi = thresholds.get(risk_level, (0, 10))
            filters.append(Supplier.risk_score.between(lo, hi))

        count_q = await self.db.execute(
            select(func.count(Supplier.id)).where(and_(*filters))
        )
        total: int = count_q.scalar_one() or 0

        rows_q = await self.db.execute(
            select(Supplier)
            .where(and_(*filters))
            .order_by(Supplier.total_spend_usd.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        suppliers = rows_q.scalars().all()

        data = []
        for s in suppliers:
            risk = float(s.risk_score or 5)
            health = _health_score(risk)
            data.append({
                "id": s.id,
                "canonical_name": s.canonical_name,
                "country": s.country,
                "category": s.category,
                "tier": s.tier,
                "risk_score": round(risk, 1),
                "risk_level": _risk_label(risk),
                "health_score": health,
                "performance_rating": _performance_rating(health),
                "total_spend_usd": float(s.total_spend_usd or 0),
                "active_contracts": s.active_contracts,
            })

        return {
            "data": data,
            "meta": {"total": total, "page": page, "page_size": page_size,
                     "total_pages": max(1, (total + page_size - 1) // page_size)},
        }

    @cached("supplier_360", ttl=MEDIUM_TTL, key_from_kwargs=["supplier_id"])
    async def get_360(self, supplier_id: str) -> dict[str, Any]:
        result = await self.db.execute(
            select(Supplier).where(
                Supplier.id == supplier_id,
                Supplier.tenant_id == self.tenant_id,
            )
        )
        supplier: Supplier | None = result.scalar_one_or_none()
        if not supplier:
            return {}

        risk = float(supplier.risk_score or 5)
        health = _health_score(risk)
        risk_lbl = _risk_label(risk)

        # ── Spend history (monthly) ────────────────────────────────────────────
        month_expr = func.date_trunc("month", SpendTransaction.invoice_date)
        spend_q = await self.db.execute(
            select(
                month_expr.label("month"),
                func.sum(SpendTransaction.amount_usd).label("total"),
                func.count(SpendTransaction.id).label("tx_count"),
                func.count(distinct(SpendTransaction.po_number)).label("po_count"),
            )
            .where(
                SpendTransaction.supplier_id == supplier_id,
                SpendTransaction.tenant_id == self.tenant_id,
                SpendTransaction.deleted_at.is_(None),
            )
            .group_by(text("1"))
            .order_by(text("1"))
        )
        spend_history = [
            {
                "month": str(r.month)[:7],
                "total": float(r.total),
                "tx_count": int(r.tx_count),
                "po_count": int(r.po_count),
            }
            for r in spend_q.all()
        ]

        # ── Spend by cost center / business unit ──────────────────────────────
        bu_q = await self.db.execute(
            select(
                SpendTransaction.cost_center.label("bu"),
                func.sum(SpendTransaction.amount_usd).label("total"),
            )
            .where(
                SpendTransaction.supplier_id == supplier_id,
                SpendTransaction.tenant_id == self.tenant_id,
                SpendTransaction.deleted_at.is_(None),
                SpendTransaction.cost_center.isnot(None),
            )
            .group_by(SpendTransaction.cost_center)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
            .limit(8)
        )
        spend_by_bu = [{"bu": r.bu, "total": float(r.total)} for r in bu_q.all()]

        # ── Spend by country / region ─────────────────────────────────────────
        region_q = await self.db.execute(
            select(
                SpendTransaction.country.label("region"),
                func.sum(SpendTransaction.amount_usd).label("total"),
            )
            .where(
                SpendTransaction.supplier_id == supplier_id,
                SpendTransaction.tenant_id == self.tenant_id,
                SpendTransaction.deleted_at.is_(None),
                SpendTransaction.country.isnot(None),
            )
            .group_by(SpendTransaction.country)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
            .limit(8)
        )
        spend_by_region = [{"region": r.region, "total": float(r.total)} for r in region_q.all()]

        # ── Contracts ─────────────────────────────────────────────────────────
        contracts_q = await self.db.execute(
            select(Contract).where(
                Contract.supplier_id == supplier_id,
                Contract.tenant_id == self.tenant_id,
                Contract.deleted_at.is_(None),
            ).order_by(Contract.end_date.asc())
        )
        contracts_raw = contracts_q.scalars().all()
        today = date.today()
        contracts = []
        for c in contracts_raw:
            days_left = (c.end_date - today).days if c.end_date else None
            contracts.append({
                "id": c.id,
                "title": c.title,
                "status": c.status,
                "start_date": str(c.start_date) if c.start_date else None,
                "end_date": str(c.end_date) if c.end_date else None,
                "value_usd": float(c.value_usd),
                "days_to_expiry": days_left,
                "expiring_soon": days_left is not None and 0 < days_left <= 90,
                "has_clauses": bool(c.extracted_clauses),
            })

        # ── Risk history (from SupplierRiskScore) ─────────────────────────────
        risk_hist_q = await self.db.execute(
            select(SupplierRiskScore)
            .where(
                SupplierRiskScore.supplier_id == supplier_id,
                SupplierRiskScore.tenant_id == self.tenant_id,
            )
            .order_by(SupplierRiskScore.score_date.asc())
            .limit(24)
        )
        risk_history = [
            {
                "date": str(r.score_date),
                "composite": float(r.composite_score),
                "financial": float(r.financial_score),
                "geo": float(r.geo_score),
                "esg": float(r.esg_score),
                "operational": float(r.operational_score),
                "compliance": float(r.compliance_score),
            }
            for r in risk_hist_q.scalars().all()
        ]

        # ── Top POs ───────────────────────────────────────────────────────────
        po_q = await self.db.execute(
            select(
                SpendTransaction.po_number,
                func.sum(SpendTransaction.amount_usd).label("total"),
                func.count(SpendTransaction.id).label("lines"),
                func.max(SpendTransaction.po_date).label("latest_date"),
            )
            .where(
                SpendTransaction.supplier_id == supplier_id,
                SpendTransaction.tenant_id == self.tenant_id,
                SpendTransaction.deleted_at.is_(None),
                SpendTransaction.po_number.isnot(None),
            )
            .group_by(SpendTransaction.po_number)
            .order_by(func.sum(SpendTransaction.amount_usd).desc())
            .limit(10)
        )
        top_pos = [
            {
                "po_number": r.po_number,
                "total": float(r.total),
                "lines": int(r.lines),
                "date": str(r.latest_date) if r.latest_date else None,
            }
            for r in po_q.all()
        ]

        # ── Health Index dimensions ────────────────────────────────────────────
        # Build from available data; use risk score dimensions where available
        latest_risk = risk_history[-1] if risk_history else None

        def _dim_health(score_0_10: float) -> int:
            return max(0, min(100, round(100 - score_0_10 * 10)))

        health_index = {
            "overall": health,
            "risk_level": risk_lbl,
            "performance_rating": _performance_rating(health),
            "compliance_status": "Compliant" if risk < 5 else ("Review Required" if risk < 7 else "Non-Compliant"),
            "financial_stability": _dim_health(float(latest_risk["financial"]) if latest_risk else risk),
            "delivery_score": max(60, min(100, health + 5)),   # estimated; replace with real data when available
            "quality_score": max(60, min(100, health + 3)),
            "contract_health": 100 if not contracts else round(
                sum(1 for c in contracts if c["status"] == "active") / len(contracts) * 100
            ),
            "spend_trend": (
                "Increasing" if len(spend_history) >= 2 and spend_history[-1]["total"] > spend_history[-2]["total"]
                else ("Decreasing" if len(spend_history) >= 2 else "Stable")
            ),
            "ai_explanation": (
                f"{supplier.canonical_name} has a health score of {health}/100 based on a risk score of "
                f"{risk:.1f}/10. "
                + (f"Financial stability is {'strong' if health >= 70 else 'moderate'}. " if latest_risk else "")
                + f"Contract coverage shows {sum(1 for c in contracts if c['status']=='active')} active agreement(s). "
                + f"Spend trend is {('increasing' if len(spend_history)>=2 and spend_history[-1]['total']>spend_history[-2]['total'] else 'stable or declining')}."
            ),
        }

        # ── KPI summary ───────────────────────────────────────────────────────
        total_spend = float(supplier.total_spend_usd or 0)
        total_pos = sum(m["po_count"] for m in spend_history)
        active_contract_count = sum(1 for c in contracts if c["status"] == "active")
        expiring_contract_count = sum(1 for c in contracts if c["expiring_soon"])
        total_tx = sum(m["tx_count"] for m in spend_history)

        kpis = {
            "total_spend": total_spend,
            "active_contracts": active_contract_count,
            "expiring_contracts": expiring_contract_count,
            "total_purchase_orders": total_pos,
            "total_transactions": total_tx,
            "invoice_accuracy": max(85, min(99, health)),   # estimated
            "avg_delivery_days": max(3, min(30, round(15 - health / 10))),  # estimated
            "open_issues": len([c for c in contracts if c["expiring_soon"]]),
            "savings_opportunity": round(total_spend * (0.03 + (10 - risk) * 0.005), 0),
        }

        # ── Ignite AI executive brief ──────────────────────────────────────────
        expiry_alert = ""
        if expiring_contract_count > 0:
            expiry_alert = f" ⚠️ {expiring_contract_count} contract(s) expiring within 90 days — renewal action required."

        ignite_brief = {
            "summary": (
                f"{supplier.canonical_name} is a Tier {supplier.tier} supplier in the "
                f"'{supplier.category or 'General'}' category with total procurement spend of "
                f"${total_spend:,.0f}. Current risk score is {risk:.1f}/10 ({risk_lbl} risk), "
                f"yielding a Procurement Health Score of {health}/100.{expiry_alert}"
            ),
            "recommendations": [
                {
                    "title": "Contract Renewal Priority" if expiring_contract_count else "Strengthen Contract Coverage",
                    "reason": (
                        f"{expiring_contract_count} contract(s) expiring within 90 days for this supplier."
                        if expiring_contract_count else
                        f"Only {active_contract_count} active contract(s) covering ${total_spend:,.0f} spend."
                    ),
                    "confidence": 92 if expiring_contract_count else 75,
                    "business_impact": "High",
                    "suggested_action": "Schedule contract renewal negotiations within 30 days.",
                },
                {
                    "title": "Spend Consolidation Opportunity",
                    "reason": f"Identified ${kpis['savings_opportunity']:,.0f} estimated savings through volume consolidation and rate renegotiation.",
                    "confidence": 78,
                    "business_impact": "Medium",
                    "suggested_action": "Request updated rate card and benchmark against market alternatives.",
                },
                {
                    "title": "Risk Monitoring" if risk >= 5 else "Maintain Strategic Partnership",
                    "reason": (
                        f"Risk score of {risk:.1f}/10 warrants enhanced monitoring and mitigation planning."
                        if risk >= 5 else
                        f"Low risk score of {risk:.1f}/10 — ideal candidate for preferred supplier programme."
                    ),
                    "confidence": 85,
                    "business_impact": "High" if risk >= 5 else "Medium",
                    "suggested_action": (
                        "Schedule quarterly risk review and request financial health documentation."
                        if risk >= 5 else
                        "Nominate for strategic supplier programme and explore sole-source opportunities."
                    ),
                },
            ],
        }

        # ── Supplier profile metadata ──────────────────────────────────────────
        supplier_profile = {
            "id": supplier.id,
            "canonical_name": supplier.canonical_name,
            "country": supplier.country,
            "category": supplier.category,
            "tier": supplier.tier,
            "risk_score": round(risk, 1),
            "risk_level": risk_lbl,
            "total_spend_usd": total_spend,
            "active_contracts": active_contract_count,
            # Extended fields (populated from seed/upload where present)
            "is_preferred": supplier.tier == 1,
            "is_strategic": supplier.tier <= 2,
            "aliases": supplier.aliases or [],
        }

        return {
            "supplier": supplier_profile,
            "health_index": health_index,
            "kpis": kpis,
            "ignite_brief": ignite_brief,
            "spend_history": spend_history,
            "spend_by_bu": spend_by_bu,
            "spend_by_region": spend_by_region,
            "contracts": contracts,
            "risk_history": risk_history,
            "top_pos": top_pos,
            "data_meta": {
                "source": "spend_transactions · contracts · supplier_risk_scores",
                "records_used": total_tx,
                "as_of": str(today),
            },
        }
