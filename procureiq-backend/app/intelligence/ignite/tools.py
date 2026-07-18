"""Ignite callable tools v3 — live data retrieval for AI augmentation."""
from __future__ import annotations
from dataclasses import dataclass
import re


@dataclass
class IgniteTool:
    name: str
    description: str
    trigger_patterns: list[str]

    def should_invoke(self, message: str) -> bool:
        msg_lower = message.lower()
        return any(re.search(p, msg_lower) for p in self.trigger_patterns)


# Every question about procurement should load spend + supplier + health data.
# Specific tools add domain detail. The "catch-all" patterns ensure broad coverage.
IGNITE_TOOLS: list[IgniteTool] = [
    IgniteTool(
        name="query_spend_data",
        description="Retrieve current spend KPIs and top suppliers",
        trigger_patterns=[
            # Direct spend keywords
            r"spend", r"how much", r"total", r"cost", r"budget", r"invoice",
            r"expenditure", r"purchas", r"buy", r"bought",
            # Supplier/category questions always need spend context
            r"supplier", r"vendor", r"who", r"which", r"recommend",
            r"categor", r"office", r"supplies", r"product", r"service",
            r"top", r"best", r"compare", r"use for", r"find",
            # General procurement questions
            r"procurement", r"source", r"sourcing", r"help", r"tell me",
            r"what", r"show", r"give", r"list", r"analys",
        ],
    ),
    IgniteTool(
        name="get_risk_scores",
        description="Fetch supplier risk summary and top-risk suppliers",
        trigger_patterns=[
            r"risk", r"risky", r"danger", r"exposure", r"critical", r"vulnerable",
            r"reliable", r"trust", r"concern", r"issue", r"problem", r"threat",
            r"supplier", r"vendor", r"who", r"which", r"recommend", r"safe",
            r"depend", r"single.source",
        ],
    ),
    IgniteTool(
        name="get_savings_opportunities",
        description="List top savings opportunities with rationale",
        trigger_patterns=[
            r"sav(ings|e)", r"opport", r"reduc", r"cheaper", r"negotiat",
            r"cut cost", r"lower", r"discount", r"better deal", r"optimiz",
            r"efficien", r"value", r"improve", r"budget", r"spend less",
        ],
    ),
    IgniteTool(
        name="get_contract_summary",
        description="Contract status, expiry, and compliance summary",
        trigger_patterns=[
            r"contract", r"expir", r"renew", r"agreement", r"clause",
            r"complian", r"sla", r"terms", r"cover", r"licen",
        ],
    ),
    IgniteTool(
        name="get_health_score",
        description="Procurement health score and dimension breakdown",
        trigger_patterns=[
            r"health", r"score", r"performance", r"grade", r"maturity",
            r"how are we", r"overall", r"summary", r"status", r"overview",
            r"doing", r"assess",
        ],
    ),
    IgniteTool(
        name="get_forecast",
        description="Spend forecast for next 6 months",
        trigger_patterns=[
            r"forecast", r"predict", r"project", r"future", r"next (month|quarter|year)",
            r"trend", r"expect", r"plan",
        ],
    ),
]


async def dispatch_tool(tool_name: str, message: str, db=None, tenant_id: str = "") -> dict:
    """Execute a named tool and return a structured result dict with live data when possible."""

    if db and tenant_id:
        try:
            return await _live_dispatch(tool_name, db, tenant_id)
        except Exception:
            pass  # fall through to mock

    # Deterministic mock responses (when no DB connection)
    MOCKS: dict[str, dict] = {
        "query_spend_data": {
            "tool": "query_spend_data", "label": "Spend Data",
            "content": "Total YTD spend: $142.5M across 50 active suppliers. Tail spend: 24.1%. Top category: Software & Cloud ($54.1M, 38%). Top suppliers: Microsoft ($18.5M), IBM ($14.2M), Accenture ($12.8M), SAP ($11.4M), Oracle ($10.1M).",
        },
        "get_risk_scores": {
            "tool": "get_risk_scores", "label": "Risk Scores",
            "content": "Average risk score: 5.2/10. Critical: 3 suppliers (Oracle 8.1, Wipro 7.9, Nexus Technologies 7.6). High-risk: 7 suppliers. Geo concentration: USA 62%, India 18%, Europe 12%.",
        },
        "get_savings_opportunities": {
            "tool": "get_savings_opportunities", "label": "Savings Opportunities",
            "content": "15 opportunities totalling $12.4M. Top: Consolidate Software & Cloud vendors ($4.8M, 82% confidence). Renegotiate Microsoft ($3.7M). Tail spend reduction ($1.5M). Volume rebates with SAP ($1.2M).",
        },
        "get_contract_summary": {
            "tool": "get_contract_summary", "label": "Contract Summary",
            "content": "30 active contracts worth $198M. 4 expiring within 90 days (IBM, Cognizant, Iron Mountain, Regus). 3 expired contracts requiring clean-up.",
        },
        "get_health_score": {
            "tool": "get_health_score", "label": "Health Score",
            "content": "Procurement Health Score: 72.4/100, Grade B. Best: Data Quality (80). Weakest: Risk Management (65). +3.2 pts vs prior period.",
        },
        "get_forecast": {
            "tool": "get_forecast", "label": "Spend Forecast",
            "content": "6-month forecast: $74.2M (avg $12.4M/month). Peak: December ($15.1M, year-end flush). Growth: +4.2% vs prior 6 months. Accuracy: 87%.",
        },
    }
    return MOCKS.get(tool_name, {
        "tool": tool_name, "label": tool_name.replace("_", " ").title(),
        "content": "Data unavailable.",
    })


async def _live_dispatch(tool_name: str, db, tenant_id: str) -> dict:
    """Dispatch tool with live DB data."""
    if tool_name == "query_spend_data":
        from app.services.spend_service import SpendService
        svc   = SpendService(db, tenant_id)
        kpis  = await svc.get_kpis()
        # Pull top suppliers from pareto data
        try:
            pareto = await svc.get_pareto()
            top5   = pareto.get("pareto_data", [])[:5]
            top_names = ", ".join(
                f"{s['supplier_name']} (${s['total_spend']:,.0f})" for s in top5
            ) if top5 else "N/A"
        except Exception:
            top_names = "N/A"

        return {
            "tool": "query_spend_data", "label": "Spend Data",
            "content": (
                f"Total spend: ${kpis['total_spend']:,.0f} ({kpis['total_spend_delta']:+.1f}% vs prior). "
                f"Active suppliers: {kpis['active_suppliers']}. "
                f"Contracted spend: {kpis['contracted_spend_percent']:.1f}%. "
                f"Tail spend: {kpis['tail_spend_percent']:.1f}%. "
                f"Health score: {kpis['procurement_health_score']}/100. "
                f"Top 5 suppliers by spend: {top_names}."
            ),
        }

    if tool_name == "get_risk_scores":
        from app.services.risk_service import RiskService
        svc  = RiskService(db, tenant_id)
        kpis = await svc.get_summary_kpis()
        # Pull top 3 highest-risk supplier names from get_scores (sorted desc by default)
        try:
            scores_page = await svc.get_scores(page=1, page_size=3)
            top3 = scores_page.get("data", [])[:3]
            names = ", ".join(
                f"{s['supplier_name']} ({s['composite_score']:.1f}/10)" for s in top3
            ) if top3 else "N/A"
        except Exception:
            names = "N/A"
        return {
            "tool": "get_risk_scores", "label": "Risk Scores",
            "content": (
                f"Avg risk: {kpis['avg_risk']:.1f}/10. "
                f"Critical: {kpis['critical_count']}, High: {kpis['high_count']}, "
                f"Medium: {kpis['medium_count']}, Low: {kpis['low_count']}. "
                f"Highest-risk suppliers: {names}."
            ),
        }

    if tool_name == "get_savings_opportunities":
        from app.services.savings_service import SavingsService
        svc    = SavingsService(db, tenant_id)
        result = await svc.get_opportunities(page=1, page_size=5)
        top    = result["data"][:5]
        items  = "; ".join(
            f"{o['title']} (${o['estimated_value_usd']:,.0f}, {o['confidence']*100:.0f}% confidence)"
            for o in top
        )
        return {
            "tool": "get_savings_opportunities", "label": "Savings Opportunities",
            "content": (
                f"${result['summary'].get('total_identified_value', 0):,.0f} total across "
                f"{result['summary'].get('opportunity_count', 0)} opportunities. "
                f"Top opportunities: {items}."
            ),
        }

    if tool_name == "get_contract_summary":
        from app.services.contract_service import ContractService
        svc  = ContractService(db, tenant_id)
        kpis = await svc.get_kpis()
        return {
            "tool": "get_contract_summary", "label": "Contract Summary",
            "content": (
                f"Total contracts: {kpis['total_contracts']}. Active: {kpis['active_contracts']}. "
                f"Expiring ≤90 days: {kpis['expiring_within_90_days']}. "
                f"Expired: {kpis['expired_contracts']}. "
                f"Active contract value: ${kpis['total_active_value_usd']:,.0f}."
            ),
        }

    if tool_name == "get_health_score":
        from app.services.health_score_service import HealthScoreService
        svc  = HealthScoreService(db, tenant_id)
        data = await svc.compute()
        dims = data.get("dimensions", {})
        best  = max(dims, key=lambda k: dims[k]) if dims else "N/A"
        worst = min(dims, key=lambda k: dims[k]) if dims else "N/A"
        return {
            "tool": "get_health_score", "label": "Health Score",
            "content": (
                f"Health: {data['composite_score']}/100 Grade {data['grade']}. "
                f"Strongest: {best.replace('_', ' ')} ({dims.get(best, 0):.0f}/100). "
                f"Weakest: {worst.replace('_', ' ')} ({dims.get(worst, 0):.0f}/100). "
                f"Change vs prior: {data.get('vs_prior_period', 0):+.1f} pts."
            ),
        }

    if tool_name == "get_forecast":
        from app.services.forecast_service import ForecastService
        svc  = ForecastService(db, tenant_id)
        data = await svc.compute(periods_ahead=3)
        s    = data.get("summary", {})
        return {
            "tool": "get_forecast", "label": "Spend Forecast",
            "content": (
                f"3-month forecast: ${s.get('total_forecast_spend', 0):,.0f} total "
                f"(avg ${s.get('avg_monthly_forecast', 0):,.0f}/month). "
                f"Growth vs prior 6m: {s.get('growth_vs_prior_6m', 0):+.1f}%. "
                f"Model accuracy: {data.get('model_accuracy', 0):.0f}%."
            ),
        }

    raise ValueError(f"Unknown tool: {tool_name}")
