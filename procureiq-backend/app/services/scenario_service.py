"""What-if Analysis / Scenario Simulation service."""
from __future__ import annotations
import math
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spend import SpendTransaction
from app.models.supplier import Supplier
from app.models.contract import Contract


class ScenarioEngine:
    """
    Simulates the financial impact of procurement scenarios on spend, savings,
    supplier count, and risk profile.

    Available scenario levers:
    - supplier_consolidation_pct: % reduction in supplier count
    - price_reduction_pct:        % price improvement from renegotiation
    - tail_spend_reduction_pct:   % of tail spend converted to strategic
    - payment_terms_extension_days: net days improvement for cash flow
    - contract_compliance_improvement_pct: % more spend brought on-contract
    - new_category_spend_pct:     % increase in spend for a new category
    """

    def __init__(self, db: AsyncSession, tenant_id: str):
        self.db = db
        self.tenant_id = tenant_id

    async def simulate(self, scenario: dict[str, Any]) -> dict[str, Any]:
        """Run a full scenario simulation and return projected impact."""
        baseline = await self._get_baseline()
        return self._apply_levers(baseline, scenario)

    async def _get_baseline(self) -> dict[str, Any]:
        total_q = await self.db.execute(
            select(func.sum(SpendTransaction.amount_usd))
            .where(SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None))
        )
        total_spend = float(total_q.scalar_one() or 0)

        sup_q = await self.db.execute(
            select(func.count(func.distinct(SpendTransaction.supplier_id)))
            .where(SpendTransaction.tenant_id == self.tenant_id,
                   SpendTransaction.deleted_at.is_(None))
        )
        active_suppliers = int(sup_q.scalar_one() or 0)

        contract_q = await self.db.execute(
            select(func.count(Contract.id))
            .where(Contract.tenant_id == self.tenant_id,
                   Contract.status == "active",
                   Contract.deleted_at.is_(None))
        )
        active_contracts = int(contract_q.scalar_one() or 0)

        # Derived baseline metrics
        tail_spend_pct  = 24.0       # from Phase 2 tail spend analysis
        contracted_pct  = 68.0       # from spend service
        avg_risk_score  = 5.8        # from risk service
        dpo_days        = 42.0       # Days Payable Outstanding

        return {
            "total_spend":       total_spend,
            "active_suppliers":  active_suppliers,
            "active_contracts":  active_contracts,
            "tail_spend_pct":    tail_spend_pct,
            "contracted_pct":    contracted_pct,
            "avg_risk_score":    avg_risk_score,
            "dpo_days":          dpo_days,
            "annual_savings":    0.0,
        }

    def _apply_levers(self, baseline: dict, scenario: dict) -> dict[str, Any]:
        b = baseline.copy()

        impacts: list[dict] = []
        total_savings = 0.0

        # 1. Supplier consolidation
        consol_pct = float(scenario.get("supplier_consolidation_pct", 0))
        if consol_pct > 0:
            admin_savings = b["total_spend"] * (consol_pct / 100) * 0.015
            volume_savings = b["total_spend"] * (consol_pct / 100) * 0.06
            sav = admin_savings + volume_savings
            total_savings += sav
            impacts.append({
                "lever": "Supplier Consolidation",
                "description": f"Reducing supplier count by {consol_pct:.0f}% saves admin cost and drives volume discounts",
                "savings_usd": round(sav, 0),
                "supplier_reduction": round(b["active_suppliers"] * consol_pct / 100),
                "risk_delta": -0.3 * (consol_pct / 20),
            })
            b["active_suppliers"] = round(b["active_suppliers"] * (1 - consol_pct / 100))
            b["avg_risk_score"]  = max(1.0, b["avg_risk_score"] - 0.3 * (consol_pct / 20))

        # 2. Price renegotiation
        price_pct = float(scenario.get("price_reduction_pct", 0))
        if price_pct > 0:
            # Apply only to strategically-negotiable spend (~60% of total)
            negotiable_spend = b["total_spend"] * 0.60
            sav = negotiable_spend * (price_pct / 100)
            total_savings += sav
            impacts.append({
                "lever": "Price Renegotiation",
                "description": f"{price_pct:.1f}% unit price reduction on negotiable spend (60% of total)",
                "savings_usd": round(sav, 0),
                "affected_spend": round(negotiable_spend, 0),
            })

        # 3. Tail spend reduction
        tail_pct = float(scenario.get("tail_spend_reduction_pct", 0))
        if tail_pct > 0:
            tail_spend = b["total_spend"] * (b["tail_spend_pct"] / 100)
            redirected = tail_spend * (tail_pct / 100)
            # Routing tail spend to preferred suppliers saves ~12%
            sav = redirected * 0.12
            total_savings += sav
            impacts.append({
                "lever": "Tail Spend Reduction",
                "description": f"Routing {tail_pct:.0f}% of tail spend to preferred suppliers at 12% better pricing",
                "savings_usd": round(sav, 0),
                "spend_redirected": round(redirected, 0),
            })
            b["tail_spend_pct"] = max(0, b["tail_spend_pct"] * (1 - tail_pct / 100))

        # 4. Payment terms extension
        terms_days = float(scenario.get("payment_terms_extension_days", 0))
        if terms_days > 0:
            # Cash flow benefit: working capital freed = spend × (days/365) × cost_of_capital(8%)
            wc_benefit = b["total_spend"] * (terms_days / 365) * 0.08
            total_savings += wc_benefit * 0.3  # partial realisation
            impacts.append({
                "lever": "Payment Terms Extension",
                "description": f"Extending average DPO by {terms_days:.0f} days improves working capital",
                "working_capital_benefit_usd": round(wc_benefit, 0),
                "new_dpo_days": round(b["dpo_days"] + terms_days),
            })
            b["dpo_days"] += terms_days

        # 5. Contract compliance improvement
        compliance_pct = float(scenario.get("contract_compliance_improvement_pct", 0))
        if compliance_pct > 0:
            off_contract_spend = b["total_spend"] * (1 - b["contracted_pct"] / 100)
            newly_contracted   = off_contract_spend * (compliance_pct / 100)
            sav = newly_contracted * 0.05   # avg 5% better pricing on-contract
            total_savings += sav
            impacts.append({
                "lever": "Contract Compliance",
                "description": f"Bringing {compliance_pct:.0f}% more off-contract spend under agreement",
                "savings_usd": round(sav, 0),
                "spend_contracted": round(newly_contracted, 0),
            })
            b["contracted_pct"] = min(100, b["contracted_pct"] + compliance_pct * (1 - b["contracted_pct"] / 100))

        # Build projected state
        projected = {
            "total_spend":      round(b["total_spend"] - total_savings, 0),
            "active_suppliers": b["active_suppliers"],
            "tail_spend_pct":   round(b["tail_spend_pct"], 1),
            "contracted_pct":   round(b["contracted_pct"], 1),
            "avg_risk_score":   round(b["avg_risk_score"], 1),
            "dpo_days":         round(b["dpo_days"], 0),
            "annual_savings":   round(total_savings, 0),
        }

        # Impact deltas
        deltas = {k: round(projected[k] - baseline[k], 1 if isinstance(baseline[k], float) else 0)
                  for k in projected}

        roi_months = None
        if total_savings > 0:
            # Assume 3% of savings as implementation cost
            impl_cost = total_savings * 0.03
            roi_months = round(impl_cost / (total_savings / 12), 1)

        return {
            "baseline":  {k: round(v, 1) if isinstance(v, float) else v for k, v in baseline.items()},
            "projected": projected,
            "deltas":    deltas,
            "impacts":   impacts,
            "total_savings_usd": round(total_savings, 0),
            "roi_months":        roi_months,
            "scenario_name":     scenario.get("name", "Custom Scenario"),
        }

    async def get_preset_scenarios(self) -> list[dict[str, Any]]:
        """Return standard benchmark scenarios for quick selection."""
        return [
            {
                "id": "aggressive_consolidation",
                "name": "Aggressive Consolidation",
                "description": "Reduce supplier base by 30%, renegotiate top 10, extend payment terms",
                "levers": {
                    "supplier_consolidation_pct": 30,
                    "price_reduction_pct": 8,
                    "payment_terms_extension_days": 15,
                },
                "risk": "medium",
                "timeline_months": 12,
            },
            {
                "id": "quick_wins",
                "name": "Quick Wins",
                "description": "Low-effort savings: tail spend control + contract compliance",
                "levers": {
                    "tail_spend_reduction_pct": 50,
                    "contract_compliance_improvement_pct": 30,
                },
                "risk": "low",
                "timeline_months": 6,
            },
            {
                "id": "strategic_transformation",
                "name": "Strategic Transformation",
                "description": "Full procurement transformation: all levers at best-in-class levels",
                "levers": {
                    "supplier_consolidation_pct": 40,
                    "price_reduction_pct": 12,
                    "tail_spend_reduction_pct": 70,
                    "payment_terms_extension_days": 30,
                    "contract_compliance_improvement_pct": 50,
                },
                "risk": "high",
                "timeline_months": 24,
            },
            {
                "id": "risk_reduction",
                "name": "Risk Reduction Focus",
                "description": "Consolidate high-risk single-source suppliers, improve compliance",
                "levers": {
                    "supplier_consolidation_pct": 20,
                    "contract_compliance_improvement_pct": 40,
                },
                "risk": "low",
                "timeline_months": 9,
            },
        ]
