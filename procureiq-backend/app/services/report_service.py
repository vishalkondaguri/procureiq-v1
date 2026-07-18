"""Executive Report service — assembles data, generates AI narrative, produces PDF."""
from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.spend_service import SpendService
from app.services.contract_service import ContractService
from app.services.risk_service import RiskService
from app.services.savings_service import SavingsService
from app.services.health_score_service import HealthScoreService
from app.services.forecast_service import ForecastService

# In-memory report store (Phase 4: move to Redis/DB)
_report_store: dict[str, dict] = {}


class ReportService:
    """
    Orchestrates executive report generation:
    1. Collect KPIs from all modules
    2. Call Ignite (watsonx) for AI narrative sections
    3. Render HTML template
    4. Convert to PDF via WeasyPrint (Phase 4 — HTML returned in Phase 3)
    """

    def __init__(self, db: AsyncSession, tenant_id: str, user=None):
        self.db        = db
        self.tenant_id = tenant_id
        self.user      = user

    async def generate(self, config: dict[str, Any]) -> str:
        """Assemble report data, build narrative, store. Returns report_id."""
        report_id = str(uuid.uuid4())
        _report_store[report_id] = {"status": "processing", "report_id": report_id}

        try:
            data = await self._collect_data(config)
            narrative = await self._build_narrative(data, config)
            html = self._render_html(data, narrative, config)

            _report_store[report_id] = {
                "status":       "completed",
                "report_id":    report_id,
                "title":        config.get("title", "Executive Procurement Report"),
                "period_start": config.get("period_start"),
                "period_end":   config.get("period_end"),
                "generated_at": datetime.now().isoformat(),
                "html":         html,
                "sections":     list(data.keys()),
                "word_count":   len(narrative.split()),
            }
        except Exception as exc:
            _report_store[report_id] = {
                "status": "failed", "report_id": report_id, "error": str(exc)
            }

        return report_id

    async def get_status(self, report_id: str) -> dict[str, Any]:
        return _report_store.get(report_id, {"status": "not_found", "report_id": report_id})

    async def _collect_data(self, config: dict) -> dict[str, Any]:
        """Pull live KPIs from every module included in the report."""
        modules = config.get("include_modules",
                              ["spend", "contracts", "suppliers", "risk", "savings", "forecast"])
        data: dict[str, Any] = {}

        if "spend" in modules:
            svc = SpendService(self.db, self.tenant_id)
            data["spend"] = await svc.get_kpis()
            data["top_suppliers"] = (await svc.get_pareto())["pareto_data"][:5]

        if "contracts" in modules:
            svc = ContractService(self.db, self.tenant_id)
            data["contracts"] = await svc.get_kpis()

        if "risk" in modules:
            svc = RiskService(self.db, self.tenant_id)
            data["risk"] = await svc.get_summary_kpis()

        if "savings" in modules:
            svc = SavingsService(self.db, self.tenant_id)
            result = await svc.get_opportunities(page=1, page_size=5)
            data["savings"] = result["summary"]
            data["top_opportunities"] = result["data"][:5]

        if "health" in modules or "health_score" in modules:
            svc = HealthScoreService(self.db, self.tenant_id)
            data["health_score"] = await svc.compute()

        if "forecast" in modules:
            svc = ForecastService(self.db, self.tenant_id)
            data["forecast"] = await svc.compute(periods_ahead=6)

        return data

    async def _build_narrative(self, data: dict, config: dict) -> str:
        """
        Attempt Ignite/watsonx narrative generation.
        Falls back to a structured template if AI is unavailable.
        """
        try:
            from app.intelligence.ignite.watsonx_client import WatsonxClient
            from app.intelligence.ignite.prompt_templates import build_system_prompt

            system = build_system_prompt(module_context="executive_reporting", user=self.user)
            prompt = self._build_narrative_prompt(data, config)
            client = WatsonxClient()
            text, _ = await client.generate(system=system, user=prompt)
            return text
        except Exception:
            return self._template_narrative(data, config)

    def _build_narrative_prompt(self, data: dict, config: dict) -> str:
        spend = data.get("spend", {})
        contracts = data.get("contracts", {})
        risk = data.get("risk", {})
        health = data.get("health_score", {})
        savings = data.get("savings", {})

        return f"""Generate a professional executive procurement report narrative for the period {config.get('period_start')} to {config.get('period_end')}.

Key metrics:
- Total Spend: ${spend.get('total_spend', 0):,.0f} ({spend.get('total_spend_delta', 0):+.1f}% vs prior period)
- Active Suppliers: {spend.get('active_suppliers', 0)}
- Active Contracts: {spend.get('active_contracts_count', 0)}
- Tail Spend: {spend.get('tail_spend_percent', 0):.1f}%
- Contracted Spend: {spend.get('contracted_spend_percent', 0):.1f}%
- Contract Risk: {contracts.get('expiring_within_90_days', 0)} expiring within 90 days
- Avg Supplier Risk: {risk.get('avg_risk', 0):.1f}/10 ({risk.get('critical_count', 0)} critical)
- Health Score: {health.get('composite_score', 0)}/100 Grade {health.get('grade', 'N/A')}
- Savings Identified: ${savings.get('total_identified_value', 0):,.0f}

Write 4 sections: Executive Summary, Key Findings, Risk Highlights, and Recommended Actions.
Be concise, data-driven, and executive-level. Use bold for key figures."""

    def _template_narrative(self, data: dict, config: dict) -> str:
        """Fallback structured narrative when AI is unavailable."""
        spend = data.get("spend", {})
        contracts = data.get("contracts", {})
        risk = data.get("risk", {})
        health = data.get("health_score", {})
        savings = data.get("savings", {})

        total_s = spend.get('total_spend', 0)
        delta   = spend.get('total_spend_delta', 0)

        return f"""**Executive Summary**

Procurement spend for the period {config.get('period_start', 'YTD')} to {config.get('period_end', 'present')} totalled **${total_s:,.0f}**, representing a **{delta:+.1f}%** change versus the prior period. The organisation managed **{spend.get('active_suppliers', 0)} active suppliers** across **{spend.get('active_contracts_count', 0)} contracts**, with a contracted spend coverage of **{spend.get('contracted_spend_percent', 0):.1f}%**.

The Procurement Health Score stands at **{health.get('composite_score', 0)}/100** (Grade **{health.get('grade', 'N/A')}**), indicating {'strong' if health.get('composite_score', 0) >= 75 else 'moderate' if health.get('composite_score', 0) >= 65 else 'below-average'} procurement maturity.

**Key Findings**

• **Tail Spend:** {spend.get('tail_spend_percent', 0):.1f}% of total spend is in the tail across many low-value suppliers. Industry benchmark is 20%. {'Action required.' if spend.get('tail_spend_percent', 0) > 20 else 'Within target.'}
• **Contract Compliance:** {spend.get('contracted_spend_percent', 0):.1f}% of spend is under contract. {contracts.get('expiring_within_90_days', 0)} contracts expire within 90 days, requiring urgent renewal action.
• **Supplier Risk:** Average composite risk score of {risk.get('avg_risk', 0):.1f}/10. {risk.get('critical_count', 0)} suppliers are rated critical risk, representing potential supply chain exposure.
• **Savings Pipeline:** ${savings.get('total_identified_value', 0):,.0f} in savings opportunities identified across {savings.get('opportunity_count', 0)} initiatives.

**Risk Highlights**

{risk.get('critical_count', 0)} suppliers are classified as critical risk. {risk.get('high_count', 0)} additional suppliers carry high risk. Immediate mitigation actions include dual-sourcing critical categories and initiating supplier development programmes for high-risk strategic suppliers.

Contract expiry risk is {'elevated' if contracts.get('expiring_within_90_days', 0) > 3 else 'manageable'}, with {contracts.get('expiring_within_90_days', 0)} agreements requiring renewal within 90 days.

**Recommended Actions**

1. **Immediate (0–30 days):** Initiate renewal negotiations for {contracts.get('expiring_within_90_days', 0)} expiring contracts. Assign category managers to critical risk suppliers.
2. **Short-term (30–90 days):** Launch tail spend consolidation programme targeting ${spend.get('total_spend', 0) * spend.get('tail_spend_percent', 0) / 100 * 0.08:,.0f} in potential savings.
3. **Strategic (90+ days):** Implement preferred supplier programme to improve contracted spend from {spend.get('contracted_spend_percent', 0):.1f}% toward 80% industry benchmark.
4. **Governance:** Establish monthly procurement steering committee with CPO to track Health Score improvement trajectory toward Grade A."""

    def _render_html(self, data: dict, narrative: str, config: dict) -> str:
        """Render a complete HTML report document."""
        spend    = data.get("spend", {})
        health   = data.get("health_score", {})
        savings  = data.get("savings", {})
        risk     = data.get("risk", {})
        contracts = data.get("contracts", {})
        forecast = data.get("forecast", {})

        def fmt(v: float) -> str:
            if v >= 1_000_000_000: return f"${v/1_000_000_000:.1f}B"
            if v >= 1_000_000:     return f"${v/1_000_000:.1f}M"
            if v >= 1_000:         return f"${v/1_000:.0f}K"
            return f"${v:.0f}"

        # Convert narrative markdown bold to HTML
        html_narrative = narrative.replace("**", "<strong>", 1)
        i = 0
        result = []
        in_bold = False
        for chunk in narrative.split("**"):
            if in_bold:
                result.append(f"<strong>{chunk}</strong>")
            else:
                result.append(chunk.replace("\n\n", "</p><p>").replace("\n", "<br/>"))
            in_bold = not in_bold
        html_narrative = "".join(result)

        top_suppliers = data.get("top_suppliers", [])
        sup_rows = "".join(
            f"<tr><td>{i+1}</td><td>{s.get('supplier_name','')}</td>"
            f"<td style='text-align:right'>{fmt(s.get('total_spend',0))}</td>"
            f"<td style='text-align:right'>{s.get('spend_percent',0):.1f}%</td></tr>"
            for i, s in enumerate(top_suppliers)
        )

        forecast_pts = forecast.get("forecast", [])
        forecast_rows = "".join(
            f"<tr><td>{p['month']}</td>"
            f"<td style='text-align:right'>{fmt(p['predicted_spend'])}</td>"
            f"<td style='text-align:right'>{fmt(p['confidence_lower'])} – {fmt(p['confidence_upper'])}</td>"
            f"<td>{p.get('driver','')}</td></tr>"
            for p in forecast_pts
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<title>{config.get('title','Executive Procurement Report')}</title>
<style>
body{{font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:#161616;line-height:1.7;max-width:900px;margin:0 auto;padding:40px 32px}}
h1{{font-size:24px;font-weight:700;color:#0f62fe;margin-bottom:4px}}
h2{{font-size:16px;font-weight:700;color:#161616;margin:28px 0 8px;border-bottom:2px solid #0f62fe;padding-bottom:6px}}
h3{{font-size:14px;font-weight:700;color:#161616;margin:16px 0 4px}}
.meta{{color:#525252;font-size:12px;margin-bottom:32px}}
.kpi-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0 24px}}
.kpi{{background:#f4f4f4;border-top:3px solid #0f62fe;padding:12px;border-radius:4px}}
.kpi .val{{font-size:22px;font-weight:700;color:#0f62fe}}
.kpi .lbl{{font-size:11px;color:#525252;text-transform:uppercase;letter-spacing:.06em}}
.badge{{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}}
.badge-green{{background:#defbe6;color:#0e6027}}
.badge-red{{background:#fff1f1;color:#da1e28}}
.badge-yellow{{background:#fff8e1;color:#b45309}}
table{{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}}
th{{background:#f4f4f4;border:1px solid #e0e0e0;padding:7px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#525252}}
td{{border:1px solid #e0e0e0;padding:7px 10px;vertical-align:top}}
tr:nth-child(even) td{{background:#fafafa}}
.narrative p{{margin-bottom:12px}}
.footer{{border-top:1px solid #e0e0e0;margin-top:40px;padding-top:12px;font-size:11px;color:#8d8d8d;text-align:center}}
@media print{{body{{padding:24px}} .kpi-grid{{grid-template-columns:repeat(4,1fr)}}}}
</style>
</head>
<body>
<h1>{config.get('title','Executive Procurement Report')}</h1>
<div class="meta">Period: {config.get('period_start','N/A')} to {config.get('period_end','N/A')} &nbsp;|&nbsp; Generated: {datetime.now().strftime('%d %b %Y %H:%M')} &nbsp;|&nbsp; Powered by Ignite AI (IBM watsonx)</div>

<h2>Performance KPIs</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="val">{fmt(spend.get('total_spend',0))}</div><div class="lbl">Total Spend</div></div>
  <div class="kpi"><div class="val">{spend.get('active_suppliers',0)}</div><div class="lbl">Active Suppliers</div></div>
  <div class="kpi"><div class="val">{spend.get('active_contracts_count',0)}</div><div class="lbl">Active Contracts</div></div>
  <div class="kpi"><div class="val">{health.get('composite_score',0)}/100</div><div class="lbl">Health Score</div></div>
  <div class="kpi"><div class="val">{spend.get('tail_spend_percent',0):.1f}%</div><div class="lbl">Tail Spend %</div></div>
  <div class="kpi"><div class="val">{spend.get('contracted_spend_percent',0):.1f}%</div><div class="lbl">Contracted Spend</div></div>
  <div class="kpi"><div class="val">{fmt(savings.get('total_identified_value',0))}</div><div class="lbl">Savings Identified</div></div>
  <div class="kpi"><div class="val">{risk.get('avg_risk',0):.1f}/10</div><div class="lbl">Avg Risk Score</div></div>
</div>

<h2>Executive Narrative</h2>
<div class="narrative"><p>{html_narrative}</p></div>

<h2>Top Suppliers by Spend</h2>
<table><thead><tr><th>#</th><th>Supplier</th><th>Spend</th><th>Share %</th></tr></thead>
<tbody>{sup_rows}</tbody></table>

{f'<h2>Spend Forecast — Next {len(forecast_pts)} Months</h2><table><thead><tr><th>Month</th><th>Predicted Spend</th><th>Confidence Range</th><th>Key Driver</th></tr></thead><tbody>{forecast_rows}</tbody></table>' if forecast_pts else ''}

<h2>Risk Summary</h2>
<table><thead><tr><th>Risk Level</th><th>Supplier Count</th><th>Action</th></tr></thead>
<tbody>
  <tr><td><span class="badge badge-red">Critical</span></td><td>{risk.get('critical_count',0)}</td><td>Immediate mitigation required</td></tr>
  <tr><td><span class="badge badge-red">High</span></td><td>{risk.get('high_count',0)}</td><td>30-day action plan</td></tr>
  <tr><td><span class="badge badge-yellow">Medium</span></td><td>{risk.get('medium_count',0)}</td><td>Quarterly review</td></tr>
  <tr><td><span class="badge badge-green">Low</span></td><td>{risk.get('low_count',0)}</td><td>Standard monitoring</td></tr>
</tbody></table>

<div class="footer">ProcureIQ Executive Report &nbsp;|&nbsp; Ignite AI · IBM watsonx &nbsp;|&nbsp; Confidential</div>
</body></html>"""
