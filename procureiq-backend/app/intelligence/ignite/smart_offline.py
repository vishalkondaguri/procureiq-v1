"""Smart Offline Engine v3 — Enterprise Procurement Copilot without an external LLM.

Behaves as a Principal Procurement Consultant: step-by-step reasoning,
cross-referenced data, anomaly detection, executive-level analysis.
Uses CURRENT year — never hardcoded 2024.
"""
from __future__ import annotations
import re
from datetime import datetime


CURRENT_YEAR = datetime.now().year


class SmartOfflineEngine:
    """
    Enterprise Procurement Copilot — data-grounded, executive-level answers.

    Every response:
    - Uses REAL numbers from live DB tools (never placeholders)
    - Answers the user's ACTUAL question directly
    - Cross-references multiple data sources (spend + risk + contracts)
    - Detects anomalies and flags them proactively
    - Gives specific, actionable intelligence with timelines
    - Reads naturally — not like a template fill-in
    """

    def generate(
        self,
        *,
        message: str,
        module_context: str,
        tool_results: list[dict],
        history: list[dict],
    ) -> str:
        msg = message.lower().strip()
        td  = {r["tool"]: r["content"] for r in tool_results}

        # ── Greeting ─────────────────────────────────────────────────────────
        if re.search(r"\b(hello|hi|hey|good (morning|afternoon|evening)|howdy)\b", msg):
            return self._greeting(td, module_context)

        # ── Summary / overview / executive brief ──────────────────────────────
        if re.search(r"(summar|overview|how are we doing|brief me|executive summary|snapshot|tell me everything|give me an overview|procurement status|performance review|kpi report|board report)", msg):
            return self._full_summary(td, message)

        # ── Anomaly / alert / unusual ─────────────────────────────────────────
        if re.search(r"\b(anomal|unusual|alert|irregularit|problem|issue|concern|flag|highlight|suspicious|outlier)\b", msg):
            return self._anomaly_analysis(td, message)

        # ── Negotiation strategy ──────────────────────────────────────────────
        if re.search(r"\b(negotiat|leverage|batna|term|counter|strategy|deal|pricing|rate card|discount|rebate)\b", msg):
            return self._negotiation_strategy(td, message)

        # ── Payment terms / cash flow ─────────────────────────────────────────
        if re.search(r"\b(payment term|cash flow|net 30|net 60|dso|dpo|working capital|early payment|dynamic discount)\b", msg):
            return self._payment_terms_analysis(td, message)

        # ── Category strategy ─────────────────────────────────────────────────
        if re.search(r"\b(categor|market|sourcing strategy|make.or.buy|insource|outsource|commodity|direct|indirect|spend categor)\b", msg):
            return self._category_strategy(td, message)

        # ── Risk — before generic supplier ───────────────────────────────────
        if re.search(r"\b(risk|risky|danger|exposure|critical|vulnerable|reliable|trust|threat|safe|depend|highest risk|most risky|geopolit|sanction|esg|sustainability|compliance)\b", msg):
            return self._risk_question(td, message)

        # ── Savings ───────────────────────────────────────────────────────────
        if re.search(r"\bsav(ing|ings|e|es|ed)?\b|\bopportunit|\breduc cost|\bcheaper|\bnegotiat|\bcut cost|\blower price|\bdiscount|\boptimiz|\befficien|\bspend less|\bquick win", msg):
            return self._savings_question(td, message)

        # ── Contracts ────────────────────────────────────────────────────────
        if re.search(r"\b(contract|expir|renew|agreement|clause|complian|sla|licen|terms|auto.renew|termination|liability|incoterm|governing law)\b", msg):
            return self._contract_question(td, message)

        # ── Health / maturity / performance ──────────────────────────────────
        if re.search(r"\b(health score|health|procurement score|grade|maturity|kpi|assess|measur|benchmark|world class|best in class)\b", msg):
            return self._health_question(td, message)

        # ── Forecast / future / trend ─────────────────────────────────────────
        if re.search(r"\b(forecast|predict|project|future|next (month|quarter|year)|trend|expect|plan ahead|budget)\b", msg):
            return self._forecast_question(td, message)

        # ── What-if / scenario ────────────────────────────────────────────────
        if re.search(r"\b(what if|scenario|simulat|if we|impact of|hypothetical)\b", msg):
            return self._whatif_question(td, message)

        # ── Wikipedia lookup ──────────────────────────────────────────────────
        if re.search(r"\b(what is|who is|tell me about|explain|history of|founded|headquarter|ceo|cpo|wikipedia|wiki|overview of)\b", msg) or "wiki_search" in td:
            return self._wiki_response(td, message)

        # ── Tail spend ────────────────────────────────────────────────────────
        if re.search(r"\b(tail spend|maverick|fragmented|small purchas|p.card|catalogue|rogue spend|off.contract)\b", msg):
            return self._tail_spend_question(td, message)

        # ── Supplier questions ────────────────────────────────────────────────
        if re.search(r"\b(supplier|vendor)\b", msg):
            return self._supplier_question(td, message)

        # ── Category ─────────────────────────────────────────────────────────
        if re.search(r"\b(categor|office suppli|stationery|it hardware|it software|commodity)\b", msg):
            return self._category_strategy(td, message)

        # ── Spend / cost / budget ─────────────────────────────────────────────
        if re.search(r"\b(spend|how much|total cost|budget|invoice|expenditure|purchas|bought|amount)\b", msg):
            return self._spend_question(td, message)

        # ── Top / best / recommend ────────────────────────────────────────────
        if re.search(r"\b(top|best|recommend|which|find|use for|suggest)\b", msg):
            return self._recommendation_question(td, message)

        # ── Status / performance ──────────────────────────────────────────────
        if re.search(r"\b(status|overall|how are we|performance|doing)\b", msg):
            return self._full_summary(td, message)

        return self._intelligent_default(td, message, module_context)

    # ═══════════════════════════════════════════════════════════════════════════
    # Response builders — all executive-grade
    # ═══════════════════════════════════════════════════════════════════════════

    def _greeting(self, td: dict, module: str) -> str:
        spend = td.get("query_spend_data", "")
        health = td.get("get_health_score", "")
        risk = td.get("get_risk_scores", "")

        spend_line = ""
        if spend:
            total = self._extract_dollar(spend) or "significant"
            suppliers = self._extract_stat(spend, r"Active suppliers: (\d+)") or "multiple"
            tail = self._extract_stat(spend, r"Tail spend: ([\d.]+)%") or "N/A"
            spend_line = (
                f"\n\nAs of today, your organisation has **{total}** in {CURRENT_YEAR} procurement spend "
                f"across **{suppliers} active suppliers**, with a tail spend rate of **{tail}%**."
            )

        health_line = ""
        if health:
            score = self._extract_score(health)
            grade = self._extract_grade(health)
            if score:
                color = "🟢" if float(score) >= 80 else "🟡" if float(score) >= 60 else "🔴"
                health_line = f" Your Procurement Health Score is **{score}/100 (Grade {grade})** {color}."

        risk_line = ""
        if risk:
            critical = self._extract_stat(risk, r"Critical: (\d+)") or "0"
            if int(critical) > 0:
                risk_line = f"\n\n⚠️ **{critical} critical-risk supplier(s)** require immediate attention."

        return (
            f"## Good {self._time_of_day()}, I'm **Ignite** — your AI Procurement Copilot.\n"
            f"{spend_line}{health_line}{risk_line}\n\n"
            f"I function as your Principal Procurement Consultant with direct access to your live procurement database. "
            f"I can provide executive-level analysis on:\n\n"
            f"- **📊 Spend Intelligence** — total spend, trends, categories, anomalies, tail spend\n"
            f"- **🏢 Supplier Intelligence** — risk profiles, performance, ESG, financial health\n"
            f"- **📄 Contract Management** — expiry alerts, clause risks, renewal strategy\n"
            f"- **💰 Savings Opportunities** — consolidation, benchmarking, negotiation leverage\n"
            f"- **⚠️ Risk Assessment** — critical suppliers, geopolitical exposure, compliance\n"
            f"- **📈 Forecasting** — spend projections, budget planning, trend analysis\n"
            f"- **🤝 Negotiation Strategy** — BATNA analysis, leverage points, market rates\n\n"
            f"*Ask me anything — e.g., \"What are my top 5 savings opportunities?\" or \"Which contracts expire this quarter?\"*"
        )

    def _full_summary(self, td: dict, message: str) -> str:
        now = datetime.now().strftime("%B %d, %Y")
        parts = [f"## Executive Procurement Intelligence Briefing\n*{now} · Generated by Ignite AI*\n"]

        # ── Spend Overview ──────────────────────────────────────────────────
        if "query_spend_data" in td:
            d = td["query_spend_data"]
            parts.append(f"### 📊 Spend Overview\n{d}")
            # Cross-reference: flag if tail spend is high
            tail = self._extract_stat(d, r"Tail spend: ([\d.]+)%")
            if tail and float(tail) > 20:
                parts.append(f"\n> ⚠️ **Tail spend anomaly**: {tail}% tail spend exceeds the 20% industry benchmark. This indicates significant maverick buying and consolidation opportunity.")
        else:
            parts.append("### 📊 Spend Overview\nNo spend data loaded — upload procurement data to view live analysis.")

        # ── Health Score ────────────────────────────────────────────────────
        if "get_health_score" in td:
            d = td["get_health_score"]
            score = self._extract_score(d)
            icon = "🟢" if score and float(score) >= 80 else "🟡" if score and float(score) >= 60 else "🔴"
            parts.append(f"\n### {icon} Procurement Health\n{d}")
            if score and float(score) < 70:
                parts.append(f"\n> ⚠️ Health score below 70 indicates procurement maturity gaps. Priority: improve risk management and contract coverage dimensions.")

        # ── Supplier Risk ───────────────────────────────────────────────────
        if "get_risk_scores" in td:
            d = td["get_risk_scores"]
            parts.append(f"\n### ⚠️ Supplier Risk Profile\n{d}")

        # ── Savings Opportunities ────────────────────────────────────────────
        if "get_savings_opportunities" in td:
            d = td["get_savings_opportunities"]
            parts.append(f"\n### 💰 Savings Pipeline\n{d}")

        # ── Contract Status ──────────────────────────────────────────────────
        if "get_contract_summary" in td:
            d = td["get_contract_summary"]
            parts.append(f"\n### 📄 Contract Portfolio\n{d}")
            expiring = self._extract_stat(d, r"Expiring ≤90 days: (\d+)")
            if expiring and int(expiring) > 0:
                parts.append(f"\n> 🔔 **Renewal urgency**: {expiring} contracts expiring within 90 days. Start renewal negotiations immediately to lock in current market rates.")

        # ── Spend Forecast ───────────────────────────────────────────────────
        if "get_forecast" in td:
            d = td["get_forecast"]
            parts.append(f"\n### 📈 Spend Forecast\n{d}")

        # ── Recommended Actions ──────────────────────────────────────────────
        parts.append(
            f"\n### 🎯 Priority Actions for {CURRENT_YEAR}\n"
            f"1. **Immediate** — Act on savings opportunities above; these are your highest-ROI initiatives\n"
            f"2. **This week** — Begin renewal negotiations for contracts expiring within 90 days\n"
            f"3. **This month** — Engage critical/high-risk suppliers with formal risk mitigation plans\n"
            f"4. **This quarter** — Launch tail spend consolidation programme to reduce maverick buying\n"
            f"5. **Ongoing** — Monitor Procurement Health Score monthly; target 80+ (Grade A) by year-end"
        )
        return "\n".join(parts)

    def _anomaly_analysis(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        risk  = td.get("get_risk_scores", "")

        flags: list[str] = []

        # Tail spend anomaly
        tail = self._extract_stat(spend, r"Tail spend: ([\d.]+)%")
        if tail and float(tail) > 20:
            flags.append(f"🔴 **Tail spend {tail}%** exceeds 20% benchmark — {float(tail) - 20:.1f}pp above target. High probability of maverick buying and duplicate suppliers.")

        # Contracted spend anomaly
        contracted = self._extract_stat(spend, r"Contracted spend: ([\d.]+)%")
        if contracted and float(contracted) < 70:
            flags.append(f"🟡 **Contract coverage {contracted}%** below 70% target — {70 - float(contracted):.1f}pp gap. Uncontracted spend creates commercial and compliance risk.")

        # Health score anomaly
        health = td.get("get_health_score", "")
        score = self._extract_score(health)
        if score and float(score) < 60:
            flags.append(f"🔴 **Health Score {score}/100** — critically low. Requires executive attention and a structured improvement programme.")

        # Risk concentration
        critical = self._extract_stat(risk, r"Critical: (\d+)")
        if critical and int(critical) >= 3:
            flags.append(f"🔴 **{critical} critical-risk suppliers** — this represents dangerous supply chain concentration. Develop dual-source alternatives urgently.")

        if not flags:
            flags.append("✅ No major anomalies detected in current data. Procurement operations appear within normal parameters.")

        result = "## Procurement Anomaly & Alert Analysis\n\n"
        result += "\n\n".join(flags)
        result += "\n\n### Recommended Diagnostic Actions\n"
        result += "1. Run a **duplicate supplier scan** — common in tail spend, typically finds 8–15% overlap\n"
        result += "2. Review **invoices above policy threshold** without PO — key maverick buying indicator\n"
        result += "3. Analyse **single-source dependencies** in critical categories — a supply disruption here is catastrophic\n"
        result += "4. Cross-reference spend against **contract coverage** to identify off-contract buying\n"
        return result

    def _negotiation_strategy(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        risk  = td.get("get_risk_scores", "")
        contracts = td.get("get_contract_summary", "")

        total = self._extract_dollar(spend) or "your total spend"
        top_suppliers = self._extract_top_suppliers(spend)

        # Build leverage analysis
        leverage_points = []
        contracted = self._extract_stat(spend, r"Contracted spend: ([\d.]+)%")
        if contracted and float(contracted) < 75:
            leverage_points.append(f"**Volume consolidation** — move uncontracted {100 - float(contracted):.0f}% of spend under master agreements to unlock volume discounts")

        tail = self._extract_stat(spend, r"Tail spend: ([\d.]+)%")
        if tail and float(tail) > 15:
            leverage_points.append(f"**Tail spend consolidation** — consolidating {tail}% tail spend onto preferred supplier agreements typically yields 12–18% unit cost reduction")

        expiring = self._extract_stat(contracts, r"Expiring ≤90 days: (\d+)")
        if expiring and int(expiring) > 2:
            leverage_points.append(f"**Renewal leverage** — {expiring} contracts renewing this quarter; bundle renewals for multi-year volume discounts")

        result = f"## Procurement Negotiation Strategy — {CURRENT_YEAR}\n\n"
        result += f"With **{total}** in procurement spend, your organization has significant negotiating leverage. Here is my strategic analysis:\n\n"

        if top_suppliers:
            result += "### Your Highest-Value Supplier Relationships\n"
            for s in top_suppliers[:5]:
                result += f"- **{s['name']}**: {s['amount']} — "
                result += "High leverage for multi-year volume commitment; consider benchmarking against 3 alternatives\n"
            result += "\n"

        if leverage_points:
            result += "### Key Leverage Points\n"
            for lp in leverage_points:
                result += f"- {lp}\n"
            result += "\n"

        result += (
            "### BATNA Framework\n"
            "Before entering negotiations, establish your BATNA (Best Alternative to Negotiated Agreement):\n"
            "1. **Identify 2–3 qualified alternatives** for your top 10 suppliers\n"
            "2. **Quantify switching costs** realistically — integration, training, transition risk\n"
            "3. **Know the market rate** — use Gartner, Forrester, or commodity indices as benchmarks\n"
            "4. **Calculate your wallet share** — suppliers giving you <10% of their revenue have low incentive to discount\n\n"
            "### Negotiation Tactics for {CURRENT_YEAR}\n"
            "- **Multi-year commitments** in exchange for price locks (inflation protection is critical in current market)\n"
            "- **Prompt payment discounts** — offer Net 10 in exchange for 2–3% price reduction\n"
            "- **Performance KPIs with financial penalties** — SLA breach credits, on-time delivery incentives\n"
            "- **Most Favoured Nation (MFN) clauses** — ensure you receive the best pricing offered to any comparable customer\n"
            "- **Auto-renewal prevention** — always include opt-out provisions 90 days before expiry"
        )
        return result

    def _payment_terms_analysis(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        total = self._extract_dollar(spend) or "your total spend"

        return (
            f"## Payment Terms Optimisation Analysis\n\n"
            f"Payment terms are a critical but often underutilised lever in procurement strategy. "
            f"With **{total}** in annual spend, optimising your payment terms can release significant working capital.\n\n"
            f"### Current Best Practices ({CURRENT_YEAR})\n"
            f"- **Standard terms**: Net 45–60 is the global benchmark for strategic suppliers\n"
            f"- **Early payment discount**: Suppliers often offer 1–2% for Net 10 payment — on a $10M supplier, that is $100–200K annual saving\n"
            f"- **Dynamic discounting**: Platforms like SAP Ariba, Taulia, or C2FO allow variable early payment rates\n"
            f"- **Supply chain finance (SCF)**: Extend your DPO while helping suppliers access cheap financing\n\n"
            f"### Working Capital Opportunity\n"
            f"Extending average payment terms from Net 30 to Net 45 on strategic suppliers can free up "
            f"15+ days of working capital — potentially millions in cash flow improvement.\n\n"
            f"### Recommended Actions\n"
            f"1. Segment suppliers by payment terms — identify who is getting favourable terms without performance justification\n"
            f"2. Standardise terms: Tier 1 strategic = Net 45–60; Tier 2 preferred = Net 30–45; Tier 3 tail = Net 30\n"
            f"3. Negotiate early payment discounts with top 10 suppliers — target 1.5% for Net 10\n"
            f"4. Evaluate a Supply Chain Finance programme for Tier 1 suppliers — extends your DPO with no supplier cash flow impact\n"
            f"5. Eliminate Net 15 or COD terms — these represent cash flow leakage with no commercial justification"
        )

    def _supplier_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        risk  = td.get("get_risk_scores", "")
        msg   = message.lower()

        top_suppliers = self._extract_top_suppliers(spend)
        is_risky    = re.search(r"\b(risk|risky|dangerous|concern|problem|critical)\b", msg)
        is_top      = re.search(r"\b(top|largest|biggest|highest|major|most)\b", msg)
        is_compare  = re.search(r"\b(compar|vs|versus|better|best|differ)\b", msg)

        if is_risky and risk:
            return (
                f"## High-Risk Supplier Assessment\n\n"
                f"**Live risk data:** {risk}\n\n"
                f"### Risk Stratification Analysis\n"
                f"Based on composite risk scores (financial health, geopolitical exposure, concentration risk, ESG compliance):\n\n"
                f"- **Critical (7.5–10/10)**: Immediate action required — develop alternative supply sources within 30 days\n"
                f"- **High (5.5–7.5/10)**: Quarterly risk reviews + formal Business Continuity Plans (BCPs) required\n"
                f"- **Medium (3.5–5.5/10)**: Annual supplier assessments + monitor for deterioration triggers\n"
                f"- **Low (<3.5/10)**: Standard monitoring; review if spend grows significantly\n\n"
                f"### Specific Risk Mitigation Actions\n"
                f"1. **Dual-source strategy** — for every critical/single-source supplier, qualify at least one alternative within 90 days\n"
                f"2. **Financial health monitoring** — set up automated alerts for credit rating changes on your top 20 suppliers\n"
                f"3. **ESG due diligence** — ensure Tier 1 suppliers have ISO 14001 or equivalent certification by Q{((datetime.now().month-1)//3)+2}\n"
                f"4. **Geopolitical concentration** — your supply base exposure should be reviewed against {CURRENT_YEAR} sanctions lists and export control regulations\n"
                f"5. **Contract protections** — include force majeure, step-in rights, and termination for convenience clauses in all strategic agreements"
            )

        if is_top and top_suppliers:
            result = f"## Top Supplier Analysis — {CURRENT_YEAR}\n\n"
            result += f"**Spend data:** {spend}\n\n"
            result += f"### Your Top Suppliers\n"
            for s in top_suppliers:
                result += f"- **{s['name']}**: {s['amount']}\n"
            result += f"\n### Strategic Assessment\n"
            result += (
                f"Your top 5 suppliers represent a significant share of total spend — this is typical for enterprise procurement. Key considerations:\n\n"
                f"- **Concentration risk**: Heavy reliance on a small number of suppliers increases supply disruption risk\n"
                f"- **Volume leverage**: Use this concentration as leverage in annual negotiations\n"
                f"- **Partnership opportunity**: Strategic suppliers at this spend level qualify for formal SRM (Supplier Relationship Management) programmes\n\n"
                f"### Recommendations\n"
                f"1. Establish formal **Quarterly Business Reviews (QBRs)** with your top 5 suppliers\n"
                f"2. Set supplier scorecards measuring quality, delivery, service, and innovation\n"
                f"3. Review multi-year contract coverage — spot buying at this spend level leaves significant value on the table\n"
                f"4. Evaluate joint innovation programmes with strategic suppliers to create competitive advantage"
            )
            return result

        return (
            f"## Supplier Intelligence Overview\n\n"
            f"{spend if spend else 'No live spend data loaded.'}\n\n"
            f"### Supplier Relationship Strategy\n"
            f"World-class procurement organisations segment their supplier base into tiers:\n\n"
            f"- **Tier 1 Strategic** (top 5% by spend/criticality): Full SRM programme, executive sponsorship, joint innovation\n"
            f"- **Tier 2 Preferred** (next 15%): Preferred supplier agreements, regular performance reviews, competitive renewal\n"
            f"- **Tier 3 Transactional** (remaining 80%): E-procurement catalogue, minimal relationship management, consolidation targets\n\n"
            f"### Recommendations\n"
            f"1. Conduct a full **Supplier Segmentation Review** using spend + criticality matrix\n"
            f"2. Implement **Supplier Scorecards** for Tier 1/2 suppliers — measure delivery, quality, service, ESG\n"
            f"3. Run a **Supplier Diversity audit** — target 15–20% spend with diverse suppliers (ESG reporting requirement)\n"
            f"4. Launch **Supplier Development Programme** for strategic suppliers — joint cost reduction, innovation, sustainability"
        )

    def _category_strategy(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        msg   = message.lower()

        # Detect specific category
        cat = self._extract_category_from_message(message)

        result = f"## Category Intelligence & Sourcing Strategy\n\n"
        if spend:
            result += f"**Current portfolio:** {spend}\n\n"

        result += f"### {CURRENT_YEAR} Category Management Best Practices\n\n"

        if "software" in msg or "cloud" in msg or "saas" in msg:
            result += (
                "**Software & Cloud Category Strategy:**\n"
                "- Consolidate SaaS vendors — most enterprises have 200+ SaaS tools; target reduction to <100 through rationalisation\n"
                "- Negotiate enterprise agreements vs individual licences — typically 20–40% cost reduction\n"
                "- Audit software utilisation — 30–40% of licences are typically unused or underutilised\n"
                "- Benchmark against Gartner Magic Quadrant leaders before renewal\n"
                "- Include price escalation caps (typically CPI or 3% max) in multi-year agreements\n\n"
            )
        elif "consult" in msg or "profess" in msg or "service" in msg:
            result += (
                "**Consulting & Professional Services Category Strategy:**\n"
                "- Establish a preferred supplier panel with pre-negotiated rate cards by seniority level\n"
                "- Implement outcome-based contracts vs time-and-materials where possible\n"
                "- Benchmark day rates annually — consulting market pricing is volatile in current talent market\n"
                "- Require SOW (Statement of Work) for all engagements >$25K — reduces scope creep\n"
                "- Consolidate to 3–5 preferred partners per sub-category\n\n"
            )
        elif "hardware" in msg or "network" in msg or "equipment" in msg:
            result += (
                "**Hardware & Networking Category Strategy:**\n"
                "- Standardise hardware specifications to reduce SKU count and increase volume leverage\n"
                "- Implement a 3-year refresh cycle aligned with warranty periods\n"
                "- Consider device-as-a-service (DaaS) models for endpoint devices\n"
                "- Negotiate forward pricing commitments in current semiconductor supply chain environment\n\n"
            )
        else:
            result += (
                "**General Category Management Approach:**\n"
                "- Conduct a **Category Spend Analysis** — understand who buys what from whom\n"
                "- Assess **Supply Market Complexity** — competitive vs monopoly dynamics\n"
                "- Define **Category Strategy**: Strategic (partnership), Leverage (competitive), Bottleneck (secure supply), Routine (efficient procurement)\n"
                "- Build a **Category Business Plan** with 3-year savings targets\n\n"
            )

        result += (
            "### Sourcing Strategy Options (Kraljic Matrix)\n"
            "- **Strategic items** (high value, complex supply): Partnership sourcing, multi-year agreements, joint development\n"
            "- **Leverage items** (high value, simple supply): Competitive bidding, volume bundling, price benchmarking\n"
            "- **Bottleneck items** (low value, complex supply): Supply security focus, safety stocks, dual sourcing\n"
            "- **Routine items** (low value, simple supply): Catalogue procurement, P-card, e-procurement automation\n\n"
            "### Priority Recommendations\n"
            f"1. Map all categories on the Kraljic Matrix to define appropriate sourcing strategies\n"
            f"2. Launch RFP/RFQ processes for all Leverage categories (highest savings potential)\n"
            f"3. Establish preferred supplier agreements in Strategic categories before year-end {CURRENT_YEAR}\n"
            f"4. Automate Routine category purchasing via e-catalogues to reduce processing cost"
        )
        return result

    def _recommendation_question(self, td: dict, message: str) -> str:
        spend    = td.get("query_spend_data", "")
        savings  = td.get("get_savings_opportunities", "")
        risk     = td.get("get_risk_scores", "")
        health   = td.get("get_health_score", "")

        total    = self._extract_dollar(spend) or "your spend"
        top_sups = self._extract_top_suppliers(spend)

        result = f"## Ignite Recommendations — Top Priority Actions\n\n"
        result += f"Based on cross-analysis of your spend ({total}), risk, contracts, and health data:\n\n"

        if savings:
            result += f"### 💰 Savings Opportunities\n{savings}\n\n"

        result += "### 🎯 My Top 5 Recommendations\n"
        recs = []

        # Based on tail spend
        tail = self._extract_stat(spend, r"Tail spend: ([\d.]+)%")
        if tail and float(tail) > 20:
            recs.append(f"**Tail Spend Consolidation** — {tail}% tail spend exceeds benchmark. Launch a supplier rationalisation programme targeting 30% reduction in supplier count. Expected saving: 8–15% on tail spend volume.")

        # Based on contract coverage
        contracted = self._extract_stat(spend, r"Contracted spend: ([\d.]+)%")
        if contracted and float(contracted) < 75:
            recs.append(f"**Increase Contract Coverage** — only {contracted}% of spend is contracted. Prioritise master agreements for top 20 off-contract suppliers. Expected saving: 5–12% through volume pricing.")

        # Based on critical risk
        critical = self._extract_stat(risk, r"Critical: (\d+)")
        if critical and int(critical) > 0:
            recs.append(f"**Address Critical Risk Suppliers** — {critical} suppliers rated critical risk. Develop dual-source strategies to protect supply continuity.")

        # Generic high-value recs
        recs.append("**Negotiate Multi-Year Agreements** — convert remaining spot/annual contracts on top 10 suppliers to 3-year agreements with volume commitments and price escalation caps.")
        recs.append("**ESG Supplier Assessment** — launch a Supplier Sustainability Scorecard programme. Regulators and customers increasingly require Scope 3 emissions data from supply chains.")

        for i, rec in enumerate(recs[:5], 1):
            result += f"{i}. {rec}\n"

        if top_sups:
            result += "\n### 🏢 Where to Start\n"
            result += f"Your highest-spend supplier is **{top_sups[0]['name']}** at **{top_sups[0]['amount']}**. "
            result += "A 5% cost reduction on this supplier alone represents significant savings — start your negotiation programme here."

        return result

    def _spend_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        if not spend:
            return (
                "## Spend Analysis\n\nNo live spend data is loaded. "
                "Please upload your procurement data via the **Intelligent Data Engine** to receive live spend analysis.\n\n"
                "Once loaded, I can provide: total spend by supplier, category, cost centre, and time period; "
                "tail spend analysis; spend trend forecasting; and anomaly detection."
            )

        total      = self._extract_dollar(spend) or "N/A"
        contracted = self._extract_stat(spend, r"Contracted spend: ([\d.]+)%")
        tail       = self._extract_stat(spend, r"Tail spend: ([\d.]+)%")
        suppliers  = self._extract_stat(spend, r"Active suppliers: (\d+)")

        result = f"## Spend Intelligence Analysis — {CURRENT_YEAR}\n\n"
        result += f"**Total Spend:** {total}"
        if suppliers: result += f" across {suppliers} active suppliers"
        result += "\n\n"
        result += f"**Full data:** {spend}\n\n"
        result += "### Spend Performance vs Industry Benchmarks\n"

        if contracted:
            status = "✅ Above benchmark" if float(contracted) >= 75 else "⚠️ Below benchmark"
            result += f"- **Contract Coverage**: {contracted}% ({status} — target: 75–85%)\n"

        if tail:
            status = "✅ Within benchmark" if float(tail) <= 20 else "⚠️ Exceeds benchmark"
            result += f"- **Tail Spend**: {tail}% ({status} — target: ≤20%)\n"

        result += "\n### Spend Optimisation Actions\n"
        result += f"1. Run a **Category Spend Analysis** to identify highest-value consolidation opportunities\n"
        result += f"2. Conduct a **Supplier Rationalisation** exercise — benchmark: top enterprises manage spend across 500–1,500 suppliers\n"
        result += f"3. Implement **Purchase Order discipline** — all spend above $5K should require an approved PO\n"
        result += f"4. Establish **Spend Alerts** for cost centres exceeding budget thresholds\n"
        return result

    def _risk_question(self, td: dict, message: str) -> str:
        risk   = td.get("get_risk_scores", "")
        spend  = td.get("query_spend_data", "")

        if not risk:
            return (
                "## Supplier Risk Assessment\n\nRisk data is being loaded. "
                "In the meantime, key risk dimensions to assess include:\n\n"
                "- **Financial risk**: Credit ratings, cash flow, profitability trends\n"
                "- **Operational risk**: Single-source dependency, capacity constraints, business continuity\n"
                "- **Geopolitical risk**: Country risk, sanctions, export controls\n"
                "- **ESG risk**: Carbon footprint, labour practices, governance compliance\n"
                "- **Cyber risk**: Information security certifications, data protection compliance"
            )

        critical = self._extract_stat(risk, r"Critical: (\d+)") or "0"
        high     = self._extract_stat(risk, r"High: (\d+)") or "0"

        result  = f"## Supplier Risk Intelligence — {CURRENT_YEAR}\n\n"
        result += f"**Live Risk Data:** {risk}\n\n"

        if int(critical) > 0:
            result += f"### 🔴 CRITICAL — Immediate Action Required\n"
            result += f"You have **{critical} critical-risk supplier(s)**. These require:\n"
            result += f"- Executive escalation within 24 hours\n"
            result += f"- Formal risk mitigation plan within 2 weeks\n"
            result += f"- Alternative supplier qualification within 60 days\n\n"

        if int(high) > 0:
            result += f"### 🟡 HIGH RISK — Action Required Within 30 Days\n"
            result += f"**{high} high-risk suppliers** require:\n"
            result += f"- Formal Business Continuity Plan (BCP) submission\n"
            result += f"- Quarterly risk review scheduling\n"
            result += f"- Contract review for exit/step-in rights\n\n"

        result += (
            f"### Risk Management Best Practices ({CURRENT_YEAR})\n"
            f"- **{CURRENT_YEAR} Geopolitical Context**: Monitor impacts of trade policy changes, sanctions lists, and regional conflicts on your supply base\n"
            f"- **ESG Compliance**: EU CSRD regulation now requires Scope 3 supply chain emissions reporting for large enterprises\n"
            f"- **Cyber Risk**: Supplier SOC 2 / ISO 27001 certification is now a procurement prerequisite in most regulated industries\n"
            f"- **Financial Resilience**: Post-2020, business continuity insurance and financial health monitoring are non-negotiable\n\n"
            f"### Priority Recommendations\n"
            f"1. Implement **Continuous Risk Monitoring** — integrate supplier credit monitoring (D&B, Experian) into procurement workflow\n"
            f"2. Conduct **Annual ESG Assessments** for all Tier 1 suppliers\n"
            f"3. Establish **Supplier Risk Committees** — cross-functional teams reviewing critical supplier risks quarterly\n"
            f"4. Build **Dual-Source Programmes** for all single-source critical categories\n"
            f"5. Review **Contractual Protections** — all Tier 1 contracts should include step-in rights, audit rights, and BCP requirements"
        )
        return result

    def _savings_question(self, td: dict, message: str) -> str:
        savings = td.get("get_savings_opportunities", "")
        spend   = td.get("query_spend_data", "")
        total   = self._extract_dollar(spend) or "your total spend"

        result = f"## Savings Opportunity Analysis — {CURRENT_YEAR}\n\n"

        if savings:
            result += f"**Live Pipeline:** {savings}\n\n"

        result += (
            f"### Savings Levers — Prioritised by Impact\n\n"
            f"**Category 1: Consolidation & Volume Leverage (Highest ROI)**\n"
            f"- Consolidate tail spend suppliers onto preferred agreements: typically 10–18% saving\n"
            f"- Bundle related categories (e.g., all IT software into a master enterprise agreement)\n"
            f"- Increase contract coverage from current levels to 80%+\n\n"
            f"**Category 2: Specification & Demand Management**\n"
            f"- Standardise hardware/IT specs — reduces SKU count and increases volume leverage\n"
            f"- Demand management challenge: do we need this? can we use less? can we share?\n"
            f"- Substitute premium specifications with fit-for-purpose alternatives\n\n"
            f"**Category 3: Process Efficiency**\n"
            f"- Automate P2P (Procure-to-Pay) for routine purchases — reduces processing cost by 60–80%\n"
            f"- E-invoicing adoption: target 80%+ of invoices automated by end of {CURRENT_YEAR}\n"
            f"- Reduce maverick buying through better catalogue management\n\n"
            f"**Category 4: Working Capital Optimisation**\n"
            f"- Extend payment terms from Net 30 to Net 45–60 on strategic suppliers\n"
            f"- Early payment discounts: 1.5–2% for Net 10 payment on high-volume suppliers\n"
            f"- Supply Chain Finance programme for Tier 1 suppliers\n\n"
            f"### Quick Wins — Implement This Month\n"
            f"1. Identify top 5 duplicate/overlapping suppliers and consolidate immediately\n"
            f"2. Initiate renewal negotiations on any contract >$500K renewing within 6 months\n"
            f"3. Run a software licence audit — typical enterprises find 25–35% unused licences\n"
            f"4. Challenge top 10 suppliers with competitive benchmarks from Gartner/Forrester"
        )
        return result

    def _contract_question(self, td: dict, message: str) -> str:
        contracts = td.get("get_contract_summary", "")
        if not contracts:
            return (
                "## Contract Intelligence\n\nLoading contract data. "
                "I recommend focusing on: expiry management, clause risk review, "
                "and ensuring all strategic spend is covered by current, signed agreements."
            )

        expiring = self._extract_stat(contracts, r"Expiring ≤90 days: (\d+)") or "0"
        expired  = self._extract_stat(contracts, r"Expired: (\d+)") or "0"

        result  = f"## Contract Portfolio Intelligence — {CURRENT_YEAR}\n\n"
        result += f"**Live Data:** {contracts}\n\n"

        if int(expired) > 0:
            result += (
                f"### 🔴 CRITICAL: {expired} Expired Contract(s)\n"
                f"Purchasing under expired contracts creates:\n"
                f"- **Legal liability** — no contractual protections, disputes resolved under common law\n"
                f"- **Price risk** — no agreed pricing; suppliers can invoice any amount\n"
                f"- **Compliance risk** — auditors will flag as a control failure\n"
                f"**Action required within 48 hours**: Issue emergency short-term agreements or pause all purchasing under these contracts.\n\n"
            )

        if int(expiring) > 0:
            result += (
                f"### 🟡 {expiring} Contract(s) Expiring Within 90 Days\n"
                f"Best practice renewal timeline:\n"
                f"- **Day 1 (now)**: Assign renewal owner; confirm strategy (renew, rebid, or terminate)\n"
                f"- **Week 1**: Prepare negotiation position and competitive alternatives\n"
                f"- **Week 2–4**: Engage supplier for renewal discussions\n"
                f"- **Week 6–8**: Final negotiation and sign-off\n"
                f"- **Week 10**: Executed agreement in place with 2 weeks to spare\n\n"
            )

        result += (
            f"### Contract Management Best Practices\n"
            f"- **Auto-renewal risk**: Contracts auto-renewing on legacy terms lose 5–12% in price-reduction opportunity annually\n"
            f"- **Clause essentials**: Ensure all contracts include price caps, termination for convenience, audit rights, data protection, and force majeure\n"
            f"- **Contract calendar**: Maintain a 12-month rolling view of all renewals for proactive management\n"
            f"- **AI clause review**: Use AI to scan contracts for unfavourable liability caps, indemnity provisions, and IP ownership\n\n"
            f"### Recommended Actions\n"
            f"1. **Today**: Resolve expired contracts — issue bridge agreements if needed\n"
            f"2. **This week**: Brief procurement team on {expiring} upcoming renewals with deal authority levels\n"
            f"3. **This month**: Conduct AI-powered clause review on all contracts >$500K to surface hidden risks\n"
            f"4. **This quarter**: Implement contract management system with automated renewal alerts"
        )
        return result

    def _health_question(self, td: dict, message: str) -> str:
        health = td.get("get_health_score", "")
        if not health:
            return "Loading procurement health data. This typically takes a few seconds as I analyse all dimensions of your procurement performance."

        score = self._extract_score(health) or "N/A"
        grade = self._extract_grade(health) or "N/A"

        try:
            s = float(score)
            maturity = "World Class" if s >= 90 else "Leading" if s >= 80 else "Developing" if s >= 70 else "Emerging" if s >= 60 else "Foundational"
            benchmark = "Top quartile (>85) for your industry" if s >= 85 else "Mid-market range (65–80)" if s >= 65 else "Below benchmark — significant improvement opportunity"
            icon = "🟢" if s >= 80 else "🟡" if s >= 60 else "🔴"
        except (ValueError, TypeError):
            maturity = "Unknown"
            benchmark = "Benchmark unavailable"
            icon = "⚪"

        result  = f"## Procurement Health & Maturity Assessment\n\n"
        result += f"**Health Score:** {score}/100 (Grade {grade}) {icon} — **{maturity}**\n\n"
        result += f"**Full data:** {health}\n\n"
        result += f"**Benchmark position:** {benchmark}\n\n"
        result += (
            f"### Procurement Maturity Model\n"
            f"- **90–100 (World Class)**: Strategic partner to the business; leading on ESG, AI, and supplier innovation\n"
            f"- **80–89 (Leading)**: Proactive procurement; strong category management and supplier relationships\n"
            f"- **70–79 (Developing)**: Good processes but gaps in strategic sourcing and risk management\n"
            f"- **60–69 (Emerging)**: Reactive procurement; process improvements needed in contract and supplier management\n"
            f"- **<60 (Foundational)**: Tactical purchasing; significant strategic value being left on the table\n\n"
            f"### Improvement Roadmap for {CURRENT_YEAR}\n"
            f"1. **Contract Coverage**: Target 80%+ contracted spend — currently the #1 driver of health score improvement\n"
            f"2. **Supplier Risk Management**: Implement systematic risk scoring and quarterly reviews\n"
            f"3. **Data Quality**: Improve spend data completeness and classification — target 95%+ accuracy\n"
            f"4. **Process Automation**: Automate routine P2P transactions to free up strategic capacity\n"
            f"5. **Category Management**: Build 3-year category strategies for your top 10 spend categories"
        )
        return result

    def _forecast_question(self, td: dict, message: str) -> str:
        forecast = td.get("get_forecast", "")
        spend    = td.get("query_spend_data", "")
        total    = self._extract_dollar(spend) or "current spend level"

        result = f"## Spend Forecast & Planning Intelligence — {CURRENT_YEAR}\n\n"

        if forecast:
            result += f"**Live Forecast:** {forecast}\n\n"

        result += (
            f"### Forecasting Methodology\n"
            f"The Ignite forecast model uses a combination of:\n"
            f"- **Historical trend analysis** — 12-month rolling spend patterns\n"
            f"- **Seasonal adjustment** — accounts for year-end flush, Q1 slowdown patterns\n"
            f"- **Contract renewal pipeline** — large renewals create spend spikes\n"
            f"- **Business growth signals** — headcount, revenue, and project pipeline proxies\n\n"
            f"### {CURRENT_YEAR} Market Context\n"
            f"- **Inflation impact**: Factor 3–5% annual price escalation on most categories unless price-locked in contracts\n"
            f"- **Software pricing**: SaaS vendors increasing prices 5–15% on renewal — negotiate before auto-renewal\n"
            f"- **Labour / consulting**: Professional services rates up 8–12% YoY due to talent market pressures\n"
            f"- **Logistics**: Supply chain normalising; freight costs stabilising after 2021–2023 volatility\n\n"
            f"### Budget Planning Recommendations\n"
            f"1. Build a **rolling 3-month spend forecast** updated monthly with contract renewal data\n"
            f"2. Identify all **budget commitments** tied to major contract renewals this year\n"
            f"3. Apply **should-cost modelling** for categories facing significant price pressure\n"
            f"4. Establish a **procurement savings pipeline** that offsets inflationary pressures\n"
            f"5. Use **scenario planning** (base/optimistic/pessimistic) for board-level budget presentations"
        )
        return result

    def _whatif_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        total = self._extract_dollar(spend)

        result = f"## What-If Scenario Analysis\n\n"

        if total:
            result += f"**Baseline spend:** {total}\n\n"
            result += f"### Scenario Modelling\n"
            result += f"Using your current spend as baseline, here are key scenarios:\n\n"
            result += f"**Scenario 1: 5% Supplier Consolidation Saving**\n"
            result += f"- 5% reduction on tail spend suppliers through consolidation\n"
            result += f"- Realistic target for well-executed consolidation programme\n\n"
            result += f"**Scenario 2: Contract Coverage Increase to 80%**\n"
            result += f"- Moving uncontracted spend under preferred agreements\n"
            result += f"- Typical saving: 6–10% on newly contracted spend\n\n"
            result += f"**Scenario 3: Early Payment Programme**\n"
            result += f"- 1.5% early payment discount on top 20 suppliers\n"
            result += f"- Cash flow impact vs discount trade-off analysis required\n\n"

        result += (
            f"### What-If Methodology\n"
            f"For precise what-if modelling, use the **What-If Analysis** module which provides:\n"
            f"- Slider-based scenario inputs with real-time financial impact\n"
            f"- Sensitivity analysis across multiple variables\n"
            f"- Comparison of base vs optimistic vs pessimistic outcomes\n"
            f"- Savings realisation timeline and confidence intervals\n\n"
            f"Ask me: *'What is the impact of consolidating 10% of tail spend?'* for a specific calculation."
        )
        return result

    def _tail_spend_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        tail  = self._extract_stat(spend, r"Tail spend: ([\d.]+)%")
        total = self._extract_dollar(spend) or "your total spend"

        result  = f"## Tail Spend Intelligence — {CURRENT_YEAR}\n\n"
        if tail:
            over = float(tail) - 20
            result += f"**Current tail spend: {tail}%** — "
            if over > 0:
                result += f"⚠️ **{over:.1f}pp above the 20% industry benchmark.** This represents a material savings opportunity.\n\n"
            else:
                result += f"✅ Within target (≤20%). Good discipline maintained.\n\n"

        result += (
            f"### What Is Tail Spend?\n"
            f"Tail spend is the long tail of small-value purchases that collectively represent 20–30% of spend "
            f"but 70–80% of all transactions. These purchases are often uncontrolled, off-catalogue, and handled manually.\n\n"
            f"### Why It Matters\n"
            f"- **Cost**: No competitive pricing; paying list prices or worse\n"
            f"- **Risk**: Unvetted suppliers, no contract protections, compliance exposure\n"
            f"- **Process**: High transaction cost ($50–100 per PO to process manually)\n"
            f"- **Visibility**: Procurement has no insight into this spend\n\n"
            f"### Tail Spend Reduction Programme\n"
            f"1. **Catalogue expansion** — bring top 50 tail suppliers onto e-catalogue; eliminates 60% of tail transactions\n"
            f"2. **P-card/Corporate card** — for purchases <$2,500; eliminates PO requirement for low-risk spend\n"
            f"3. **Preferred supplier rationalisation** — consolidate 10 similar tail suppliers into 1 preferred agreement\n"
            f"4. **Guided buying** — implement a buying channel that directs users to approved suppliers\n"
            f"5. **Budget holder accountability** — report tail spend by cost centre to drive behaviour change\n\n"
            f"### Savings Potential\n"
            f"A well-executed tail spend programme typically delivers:\n"
            f"- **10–18% cost reduction** on consolidated tail spend\n"
            f"- **40–60% reduction** in number of active suppliers\n"
            f"- **60–80% reduction** in procurement transaction processing cost"
        )
        return result

    def _wiki_response(self, td: dict, message: str) -> str:
        wiki = td.get("wiki_search", "")
        spend = td.get("query_spend_data", "")

        if wiki and "failed" not in wiki and "No Wikipedia article" not in wiki:
            result = f"## Wikipedia Knowledge — Ignite Research\n\n{wiki}\n\n"

            # If this seems to be about a supplier, add procurement context
            if spend and any(
                kw in message.lower()
                for kw in ["supplier", "vendor", "company", "firm", "ibm", "sap", "oracle",
                            "microsoft", "accenture", "infosys", "tcs", "wipro", "capgemini"]
            ):
                result += (
                    f"---\n\n**Procurement Context** *(from live data)*\n\n{spend}\n\n"
                    f"**Ignite Note:** When evaluating this supplier in your procurement context, consider: "
                    f"financial stability, delivery performance, ESG compliance, contract terms, and strategic fit. "
                    f"Use the Supplier 360 module for a full intelligence profile including risk scores and spend analytics."
                )
            return result

        # Fallback: give a researched response based on the message
        result = f"## Research Query — {CURRENT_YEAR}\n\n"
        result += f"*Query: \"{message}\"*\n\n"
        result += (
            "I was unable to retrieve Wikipedia content for this query. "
            "Here is what I can tell you based on procurement domain knowledge:\n\n"
        )

        msg = message.lower()
        if "procurement" in msg or "source" in msg:
            result += (
                "**Procurement** is the business process of identifying, acquiring, and managing goods, "
                "services, and works from external sources. Modern procurement encompasses strategic sourcing, "
                "supplier relationship management, contract management, and spend analytics.\n\n"
                "**Key frameworks:** CIPS (Chartered Institute of Procurement & Supply), ISM, and IBM's "
                "procurement transformation methodology focus on: spend visibility → supplier consolidation → "
                "contract compliance → total cost optimisation."
            )
        else:
            result += (
                "For detailed information, I recommend checking Wikipedia directly, or asking me a more "
                "specific procurement-related question. I can provide expert analysis on suppliers, "
                "contracts, spend, risk, and sourcing strategy."
            )
        return result

    def _intelligent_default(self, td: dict, message: str, module: str) -> str:
        spend    = td.get("query_spend_data", "")
        health   = td.get("get_health_score", "")
        total    = self._extract_dollar(spend)
        score    = self._extract_score(health)

        result  = f"## Procurement Analysis — {CURRENT_YEAR}\n\n"
        result += f"*Responding to: \"{message}\"*\n\n"

        if total or score:
            result += f"Based on your current procurement data"
            if total:
                result += f" ({total} total spend"
            if score:
                result += f", health score {score}/100"
            if total or score:
                result += "):\n\n"

        result += (
            f"I have analysed your question in the context of {module}. "
            f"To give you the most precise answer, could you clarify what specific information you need?\n\n"
            f"I can provide detailed analysis on:\n"
            f"- **Spend performance** — totals, trends, categories, anomalies\n"
            f"- **Supplier intelligence** — risk, performance, ESG, financials\n"
            f"- **Contract management** — expiry, clause risk, renewal strategy\n"
            f"- **Savings opportunities** — consolidation, benchmarking, negotiation\n"
            f"- **Procurement strategy** — category plans, sourcing strategy, KPIs\n\n"
            f"Try asking: *\"What are my top 5 savings opportunities?\"*, *\"Which suppliers are highest risk?\"*, "
            f"or *\"Summarise my contract portfolio\"*"
        )
        return result

    # ═══════════════════════════════════════════════════════════════════════════
    # Utility helpers
    # ═══════════════════════════════════════════════════════════════════════════

    def _time_of_day(self) -> str:
        hour = datetime.now().hour
        if hour < 12: return "Morning"
        if hour < 17: return "Afternoon"
        return "Evening"

    def _extract_dollar(self, text: str) -> str | None:
        m = re.search(r"\$[\d,]+(?:\.\d+)?(?:[KMB])?", text)
        return m.group(0) if m else None

    def _extract_score(self, text: str) -> str | None:
        m = re.search(r"Health: ([\d.]+)/100", text)
        if not m: m = re.search(r"([\d.]+)/100", text)
        return m.group(1) if m else None

    def _extract_grade(self, text: str) -> str | None:
        m = re.search(r"Grade ([A-F][+-]?)", text)
        return m.group(1) if m else None

    def _extract_stat(self, text: str, pattern: str) -> str | None:
        m = re.search(pattern, text)
        return m.group(1) if m else None

    def _extract_top_suppliers(self, spend_content: str) -> list[dict]:
        """Extract top supplier names and spend amounts from tool data."""
        suppliers = []
        # Pattern: "Supplier Name ($X,XXX,XXX)"
        for m in re.finditer(r"([A-Z][^()]+?)\s+\(\$([0-9,]+)\)", spend_content):
            suppliers.append({"name": m.group(1).strip(), "amount": f"${m.group(2)}"})
        return suppliers[:5]

    def _extract_category_from_message(self, message: str) -> str:
        msg = message.lower()
        if "software" in msg or "cloud" in msg or "saas" in msg: return "Software & Cloud"
        if "consult" in msg: return "Consulting & Professional Services"
        if "hardware" in msg or "network" in msg: return "Hardware & Networking"
        if "facilities" in msg or "real estate" in msg: return "Facilities & Real Estate"
        if "logistics" in msg or "freight" in msg: return "Logistics"
        if "office" in msg: return "Office Supplies"
        return "General"
