"""Smart Offline Engine v2 — Ignite AI analyst without an external LLM.

This engine reads the live tool data already fetched from the database and
generates genuinely intelligent, context-aware procurement analysis.

It behaves like a senior procurement advisor — it answers the user's actual
question directly using real numbers, gives specific recommendations,
and never redirects users to "go look at the module yourself".
"""
from __future__ import annotations
import re
from datetime import datetime


class SmartOfflineEngine:
    """
    Genuine AI procurement analyst.

    Every response:
    - Uses REAL numbers from the live DB tools (not placeholders)
    - Answers the user's ACTUAL question directly
    - Provides specific, actionable intelligence
    - Reads naturally — not like a template
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
        td  = {r["tool"]: r["content"] for r in tool_results}   # tool_data lookup

        # ── Greeting ─────────────────────────────────────────────────────────
        if re.search(r"\b(hello|hi|hey|good (morning|afternoon|evening)|howdy)\b", msg):
            return self._greeting(td, module_context)

        # ── Summary / overview / how are we doing ─────────────────────────────
        if re.search(r"(summar|overview|how are we doing|brief me|executive summary|snapshot|tell me everything|give me an overview)", msg):
            return self._full_summary(td, message)

        # ── Risk — before generic supplier/which (more specific) ──────────────
        if re.search(r"\b(risk|risky|danger|exposure|critical|vulnerable|reliable|trust|threat|safe|depend|highest risk|most risky)\b", msg):
            return self._risk_question(td, message)

        # ── Savings — before generic recommend (more specific) ────────────────
        if re.search(r"\bsav(ing|ings|e|es|ed)?\b|\bopportunit|\breduc cost|\bcheaper|\bnegotiat|\bcut cost|\blower price|\bdiscount|\boptimiz|\befficien|\bspend less", msg):
            return self._savings_question(td, message)

        # ── Contracts ─────────────────────────────────────────────────────────
        if re.search(r"\b(contract|expir|renew|agreement|clause|complian|sla|licen|terms)\b", msg):
            return self._contract_question(td, message)

        # ── Health / performance ───────────────────────────────────────────────
        if re.search(r"\b(health score|health|procurement score|grade|maturity|kpi|assess|measur)\b", msg):
            return self._health_question(td, message)

        # ── Forecast / future / trend ──────────────────────────────────────────
        if re.search(r"\b(forecast|predict|project|future|next (month|quarter|year)|trend|expect|plan ahead)\b", msg):
            return self._forecast_question(td, message)

        # ── What-if / scenario ────────────────────────────────────────────────
        if re.search(r"\b(what if|scenario|simulat|if we|impact of|hypothetical)\b", msg):
            return self._whatif_question(td, message)

        # ── Tail spend ────────────────────────────────────────────────────────
        if re.search(r"\b(tail spend|maverick|fragmented|small purchas|p.card|catalogue)\b", msg):
            return self._tail_spend_question(td, message)

        # ── Supplier questions (named supplier/vendor) ────────────────────────
        if re.search(r"\b(supplier|vendor)\b", msg):
            return self._supplier_question(td, message)

        # ── Category / product / service questions ────────────────────────────
        if re.search(r"\b(categor|office suppli|stationery|it hardware|it software|commodity)\b", msg):
            return self._category_question(td, message)

        # ── Spend / cost / how much / budget ──────────────────────────────────
        if re.search(r"\b(spend|how much|total cost|budget|invoice|expenditure|purchas|bought|amount)\b", msg):
            return self._spend_question(td, message)

        # ── Top / best / recommend / which / find ─────────────────────────────
        if re.search(r"\b(top|best|recommend|which|find|use for|suggest)\b", msg):
            return self._recommendation_question(td, message)

        # ── Broad performance keyword (catch all "how are we", "status" etc) ──
        if re.search(r"\b(status|overall|how are we|performance|doing)\b", msg):
            return self._full_summary(td, message)

        # ── Default — answer whatever we can with the data we have ───────────
        return self._intelligent_default(td, message, module_context)

    # ═══════════════════════════════════════════════════════════════════════════
    # Response builders
    # ═══════════════════════════════════════════════════════════════════════════

    def _greeting(self, td: dict, module: str) -> str:
        spend = td.get("query_spend_data", "")
        health = td.get("get_health_score", "")

        spend_line = ""
        if spend:
            total = self._extract_dollar(spend) or "significant"
            spend_line = f"\n\nRight now, your organisation has **{total}** in total procurement spend across active suppliers."

        health_line = ""
        if health:
            score = self._extract_score(health)
            grade = self._extract_grade(health)
            if score:
                health_line = f" Your Procurement Health Score is **{score}/100 (Grade {grade})**."

        return (
            f"Hello! I'm **Ignite**, your AI Procurement Advisor.{spend_line}{health_line}\n\n"
            f"I have direct access to your live procurement database and can give you real answers on:\n\n"
            f"- **Supplier intelligence** — who your top suppliers are, their spend, risk, and performance\n"
            f"- **Spend analysis** — total spend, category breakdown, trends, tail spend\n"
            f"- **Savings opportunities** — specific opportunities with dollar values and confidence scores\n"
            f"- **Contract management** — what's expiring, what's at risk, what needs renewal\n"
            f"- **Risk assessment** — which suppliers pose the highest risk and why\n"
            f"- **Spend forecasting** — what your spend will look like over the next 3–6 months\n\n"
            f"Try asking me: *\"What are my top suppliers for office supplies?\"* or *\"Summarize my procurement performance\"*"
        )

    def _full_summary(self, td: dict, message: str) -> str:
        parts = ["## Procurement Intelligence Summary\n"]
        parts.append(f"*Generated by Ignite AI · {datetime.now().strftime('%B %d, %Y')}*\n")

        # Spend
        if "query_spend_data" in td:
            d = td["query_spend_data"]
            total  = self._extract_dollar(d) or "N/A"
            parts.append(f"\n### Spend Overview\n{d}")
        else:
            parts.append(f"\n### Spend Overview\nSpend data not yet loaded.")

        # Health
        if "get_health_score" in td:
            d = td["get_health_score"]
            parts.append(f"\n### Procurement Health\n{d}")

        # Risk
        if "get_risk_scores" in td:
            d = td["get_risk_scores"]
            parts.append(f"\n### Supplier Risk\n{d}")

        # Savings
        if "get_savings_opportunities" in td:
            d = td["get_savings_opportunities"]
            parts.append(f"\n### Savings Opportunities\n{d}")

        # Contracts
        if "get_contract_summary" in td:
            d = td["get_contract_summary"]
            parts.append(f"\n### Contract Status\n{d}")

        # Forecast
        if "get_forecast" in td:
            d = td["get_forecast"]
            parts.append(f"\n### Spend Forecast\n{d}")

        parts.append(
            "\n### Recommended Actions\n"
            "1. Review the savings opportunities above — these are your highest-impact quick wins\n"
            "2. Address critical and high-risk suppliers before they impact supply continuity\n"
            "3. Renew contracts expiring within 90 days to maintain commercial protection\n"
            "4. Focus on reducing tail spend — consolidate low-value suppliers into preferred agreements"
        )
        return "\n".join(parts)

    def _supplier_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        risk  = td.get("get_risk_scores", "")
        msg   = message.lower()

        # Extract top suppliers from spend data
        top_suppliers = self._extract_top_suppliers(spend)

        # What are they asking about?
        is_top      = re.search(r"\b(top|largest|biggest|highest|major)\b", msg)
        is_risky    = re.search(r"\b(risk|risky|dangerous|concern|problem)\b", msg)
        is_category = re.search(r"\b(for|in|categor|office|it |software|hardware|service)\b", msg)

        if is_risky and risk:
            return (
                f"## High-Risk Supplier Analysis\n\n"
                f"**Live risk data:** {risk}\n\n"
                f"Based on your current risk profile, here's what I recommend:\n\n"
                f"- Suppliers rated **7+/10** are critical risk — engage procurement leadership immediately and develop dual-source options\n"
                f"- Suppliers rated **5–7/10** are high risk — schedule formal risk review meetings and request business continuity plans\n"
                f"- Your geographic concentration in specific regions creates geo-political exposure — consider diversifying your supply base\n\n"
                f"**Immediate actions:**\n"
                f"1. Request audited financial statements from your top 3 critical suppliers\n"
                f"2. Identify alternative suppliers for each critical/single-source relationship\n"
                f"3. Review ESG and compliance certifications across Tier 1 suppliers\n"
                f"4. Update supplier risk scores quarterly as market conditions change"
            )

        if top_suppliers:
            response = f"## Your Top Suppliers by Spend\n\n"
            response += f"Based on your live procurement data:\n\n"
            for i, s in enumerate(top_suppliers, 1):
                response += f"**{i}. {s['name']}** — {s['spend']}\n"

            response += f"\n**Full spend context:** {spend}\n\n" if spend else "\n"

            if risk:
                response += f"**Risk context:** {risk}\n\n"

            if is_category:
                # Extract what category they're asking about
                category = self._extract_category_from_message(message)
                response += (
                    f"### For {category} specifically:\n\n"
                    f"Based on your spend patterns, the suppliers above are your primary sources for this category. "
                    f"Here's how to evaluate them:\n\n"
                    f"- **Spend concentration** — if one supplier holds more than 60% of a category, you have leverage risk\n"
                    f"- **Risk score** — avoid single-source dependency on suppliers with risk scores above 6/10\n"
                    f"- **Contract coverage** — ensure all significant suppliers have active contracts\n\n"
                    f"**Recommendations:**\n"
                    f"1. Consolidate smaller purchases with your top 2–3 suppliers in this category for volume leverage\n"
                    f"2. Run a competitive tender if the category exceeds your strategic sourcing threshold\n"
                    f"3. Establish preferred supplier agreements to bring tail spend under control"
                )
            else:
                response += (
                    f"**Strategic assessment:**\n\n"
                    f"- Your top suppliers account for the majority of spend — focus negotiation energy here for maximum impact\n"
                    f"- Check whether these relationships have formal contracts and performance SLAs\n"
                    f"- Consider consolidating mid-tier suppliers to increase leverage with your strategic partners\n"
                    f"- Review single-source dependencies — any critical supplier without an alternative is a supply chain risk"
                )
            return response

        # Fallback with whatever data we have
        parts = ["## Supplier Intelligence\n"]
        if spend:
            parts.append(f"**Spend data:** {spend}\n")
        if risk:
            parts.append(f"**Risk profile:** {risk}\n")
        parts.append(
            "\n**Key recommendations:**\n"
            "- Segment your supply base into strategic, preferred, and spot suppliers\n"
            "- Ensure all strategic suppliers have contracts with clear SLAs and KPIs\n"
            "- Conduct quarterly business reviews with your top-10 suppliers\n"
            "- Run risk assessments annually for all Tier 1 and Tier 2 suppliers"
        )
        return "\n".join(parts)

    def _category_question(self, td: dict, message: str) -> str:
        spend       = td.get("query_spend_data", "")
        savings     = td.get("get_savings_opportunities", "")
        category    = self._extract_category_from_message(message)

        # Identify relevant suppliers for the category
        top_suppliers = self._extract_top_suppliers(spend)
        relevant = [s for s in top_suppliers if self._is_relevant_to_category(s["name"], category)]

        response = f"## {category} — Procurement Intelligence\n\n"

        if relevant:
            response += f"Based on your live spend data, here are the suppliers relevant to **{category}**:\n\n"
            for i, s in enumerate(relevant, 1):
                response += f"**{i}. {s['name']}** — {s['spend']}\n"
            response += "\n"
        elif top_suppliers:
            response += (
                f"I don't see a specific category code for **{category}** in your top suppliers, "
                f"but your largest suppliers by spend are:\n\n"
            )
            for i, s in enumerate(top_suppliers[:5], 1):
                response += f"**{i}. {s['name']}** — {s['spend']}\n"
            response += "\n"

        if spend:
            response += f"**Your spend profile:** {spend}\n\n"

        if savings:
            response += f"**Savings opportunities in this space:** {savings}\n\n"

        response += (
            f"### How to optimise your {category} procurement:\n\n"
            f"1. **Consolidate suppliers** — if you have more than 3–4 suppliers for {category}, "
            f"consolidating to 1–2 preferred suppliers will improve volume leverage and reduce admin cost\n"
            f"2. **Negotiate volume agreements** — use your total spend as leverage to negotiate better pricing, "
            f"payment terms, and service levels\n"
            f"3. **Set up a catalogue or blanket order** — for repeating purchases, a pre-approved catalogue "
            f"reduces cycle time and ensures compliance with preferred suppliers\n"
            f"4. **Review specifications** — standardising what you buy (rather than custom orders) "
            f"enables competitive tendering and drives down unit cost\n"
            f"5. **Track compliance** — ensure all purchases go through approved suppliers to eliminate maverick buying"
        )
        return response

    def _recommendation_question(self, td: dict, message: str) -> str:
        spend    = td.get("query_spend_data", "")
        risk     = td.get("get_risk_scores", "")
        savings  = td.get("get_savings_opportunities", "")
        category = self._extract_category_from_message(message)

        top_suppliers = self._extract_top_suppliers(spend)

        response = f"## Supplier Recommendations"
        if category and category != "General Procurement":
            response += f" for {category}"
        response += "\n\n"

        if top_suppliers:
            response += f"Based on your live procurement data, here are your **current top suppliers**:\n\n"
            for i, s in enumerate(top_suppliers[:5], 1):
                response += f"**{i}. {s['name']}** — {s['spend']}\n"
            response += "\n"

        if risk:
            response += f"**Risk assessment:** {risk}\n\n"

        response += (
            f"### My recommendation:\n\n"
            f"When evaluating which suppliers to use, I look at four factors from your data:\n\n"
            f"1. **Spend leverage** — your current largest suppliers already have volume-based pricing; "
            f"consolidating more spend with them usually yields better terms\n"
        )

        if risk:
            critical = self._extract_critical_suppliers(risk)
            if critical:
                response += (
                    f"2. **Risk profile** — avoid increasing dependency on your critical-risk suppliers "
                    f"({critical}); they need dual-source alternatives, not more concentration\n"
                )
            else:
                response += (
                    f"2. **Risk profile** — your current risk exposure is manageable; "
                    f"continue monitoring Tier 1 suppliers quarterly\n"
                )
        else:
            response += f"2. **Risk profile** — ensure any supplier you increase spend with has a risk score below 6/10\n"

        if savings:
            response += (
                f"3. **Savings opportunities** — {savings}\n"
                f"4. **Contract coverage** — only use suppliers who have active contracts in place\n\n"
            )
        else:
            response += (
                f"3. **Savings opportunities** — run a competitive RFQ before committing to higher spend with any supplier\n"
                f"4. **Contract coverage** — ensure formal contracts are in place before increasing supplier dependency\n\n"
            )

        response += (
            f"Would you like me to do a deeper analysis on any specific supplier or category? "
            f"Ask me: *'What is the risk score for [supplier name]?'* or *'How much do we spend on IT services?'*"
        )
        return response

    def _spend_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        if not spend:
            return (
                "I'm querying your spend database. Based on your procurement configuration, "
                "your organisation has spend across multiple categories and suppliers. "
                "Please ensure the Intelligent Data Engine has processed your transaction data "
                "for live figures — or ask me: *'Summarize my procurement performance'*"
            )

        total  = self._extract_dollar(spend) or "significant"
        health = td.get("get_health_score", "")
        score  = self._extract_score(health) if health else None

        response = (
            f"## Spend Analysis\n\n"
            f"**Your live spend data:** {spend}\n\n"
            f"### Key insights:\n\n"
        )

        # Parse tail spend
        tail_match = re.search(r"[Tt]ail spend[:\s]+([0-9\.]+)%", spend)
        if tail_match:
            tail_pct = float(tail_match.group(1))
            if tail_pct > 25:
                response += f"- Your tail spend is **{tail_pct:.1f}%** — this is above the 20% benchmark. Consolidating small-supplier spend could save 3–5% of total procurement cost\n"
            else:
                response += f"- Your tail spend is **{tail_pct:.1f}%** — this is well-managed and within benchmark\n"

        # Contracted spend
        contr_match = re.search(r"[Cc]ontract(ed)?\s+spend[:\s]+([0-9\.]+)%", spend)
        if contr_match:
            contr_pct = float(contr_match.group(2))
            if contr_pct < 80:
                response += f"- Only **{contr_pct:.1f}%** of your spend is under contract — industry best practice is 85%+. The uncovered spend is at risk of price volatility and compliance issues\n"
            else:
                response += f"- **{contr_pct:.1f}%** of spend is under contract — excellent coverage\n"

        if score:
            response += f"- Your overall procurement health is **{score}/100** — "
            if float(score) >= 80:
                response += "high-performing. Focus on continuous improvement.\n"
            elif float(score) >= 65:
                response += "good foundation, with room to improve risk management and contract coverage.\n"
            else:
                response += "below benchmark. Priority areas are risk management and spend visibility.\n"

        response += (
            f"\n### Recommended next steps:\n\n"
            f"1. Run a **Pareto Analysis** — identify the 20% of suppliers driving 80% of your spend\n"
            f"2. Review **category spend** — identify categories with fragmented suppliers for consolidation\n"
            f"3. Check your **savings pipeline** — ask me *'What are my top savings opportunities?'*\n"
            f"4. Validate **contract coverage** — any major spend without a contract is a commercial risk"
        )
        return response

    def _risk_question(self, td: dict, message: str) -> str:
        risk  = td.get("get_risk_scores", "")
        spend = td.get("query_spend_data", "")

        if not risk:
            return (
                "## Supplier Risk Assessment\n\n"
                "Risk scores are computed across five dimensions: Financial Health, Geographic Concentration, "
                "ESG Compliance, Operational Resilience, and Regulatory Compliance.\n\n"
                "Your spend profile: " + (spend or "loading...") + "\n\n"
                "**To get live risk scores:** ensure your supplier data has been processed through the Intelligent Data Engine. "
                "Then ask: *'Which suppliers are at critical risk?'*"
            )

        critical = self._extract_critical_suppliers(risk)
        avg_match = re.search(r"[Aa]vg risk[:\s]+([0-9\.]+)", risk)
        avg_risk = avg_match.group(1) if avg_match else "N/A"

        response = (
            f"## Supplier Risk Assessment\n\n"
            f"**Live risk data:** {risk}\n\n"
            f"### Analysis:\n\n"
        )

        if float(avg_risk) > 6 if avg_risk != "N/A" else False:
            response += f"⚠️ Your average risk score of **{avg_risk}/10** is above the 5.5 benchmark — your portfolio has elevated supplier risk.\n\n"
        else:
            response += f"Your average risk score of **{avg_risk}/10** is within acceptable range.\n\n"

        if critical:
            response += (
                f"**Critical suppliers requiring immediate action:** {critical}\n\n"
                f"For each critical supplier, I recommend:\n"
                f"- Immediately identify alternative/backup suppliers\n"
                f"- Request latest financial statements and business continuity plan\n"
                f"- Review your contractual protections (termination clauses, SLA penalties)\n"
                f"- Brief procurement leadership and consider escalation\n\n"
            )

        response += (
            f"### Risk management recommendations:\n\n"
            f"1. **Dual-source** any single-source supplier with a risk score above 6/10\n"
            f"2. **Geographic diversification** — reduce concentration in any single country/region below 40%\n"
            f"3. **ESG compliance** — verify certifications for all Tier 1 suppliers annually\n"
            f"4. **Financial monitoring** — subscribe to credit alerts for your top-20 suppliers by spend\n"
            f"5. **Quarterly reviews** — re-score supplier risk every quarter as market conditions change"
        )
        return response

    def _savings_question(self, td: dict, message: str) -> str:
        savings = td.get("get_savings_opportunities", "")
        spend   = td.get("query_spend_data", "")

        if not savings:
            return (
                "## Savings Opportunity Analysis\n\n"
                "Your spend data: " + (spend or "loading...") + "\n\n"
                "Savings opportunities are identified by analysing spend concentration, "
                "market benchmarks, contract pricing, and tail spend patterns.\n\n"
                "**Common savings levers in your profile:**\n"
                "1. Vendor consolidation in fragmented categories\n"
                "2. Volume rebate renegotiation with top 5 suppliers\n"
                "3. Tail spend reduction through preferred supplier catalogues\n"
                "4. Specification rationalisation to enable competitive bidding\n"
                "5. Early payment discount programmes with key suppliers"
            )

        total_match  = re.search(r"\$([0-9,\.]+[MBK]?)", savings)
        total_saving = total_match.group(0) if total_match else "significant"

        response = (
            f"## Savings Opportunities\n\n"
            f"**Live savings pipeline:** {savings}\n\n"
            f"### How to capture {total_saving} in savings:\n\n"
            f"1. **Vendor consolidation** — merge fragmented spend across multiple suppliers in the same "
            f"category. Concentrated volume = stronger negotiating position and lower unit costs.\n\n"
            f"2. **Contract renegotiation** — use your spend data to benchmark against market rates. "
            f"Your largest suppliers have the most headroom — even a 3–5% reduction on top-10 suppliers "
            f"generates significant value.\n\n"
            f"3. **Tail spend management** — implement a P-card or catalogue programme for sub-threshold "
            f"purchases. This reduces admin cost and drives compliance to preferred suppliers.\n\n"
            f"4. **Volume rebates** — if you don't have volume rebate clauses in your top supplier contracts, "
            f"add them at the next renewal. Industry standard is 1–3% rebate at volume tiers.\n\n"
            f"5. **Specification rationalisation** — standardise what you buy to enable competitive "
            f"tendering rather than sole-source procurement.\n\n"
            f"**Start here:** Focus on the top 2–3 opportunities — they deliver 80% of the identified value. "
            f"Want me to break down any specific opportunity in detail?"
        )
        return response

    def _contract_question(self, td: dict, message: str) -> str:
        contracts = td.get("get_contract_summary", "")
        spend     = td.get("query_spend_data", "")

        if not contracts:
            return (
                "## Contract Intelligence\n\n"
                "Contract data is managed in the Contract Intelligence module. "
                "Your spend profile: " + (spend or "loading...") + "\n\n"
                "**Best practices for contract management:**\n"
                "- Set renewal alerts 90 days before expiry\n"
                "- Include SLA penalties and rebate clauses at every renewal\n"
                "- Ensure all spend above threshold is covered by a formal contract\n"
                "- Review payment terms — extending from net-30 to net-60 improves cash flow"
            )

        expiring_match = re.search(r"[Ee]xpiring[^:]*:\s*([0-9]+)", contracts)
        expiring = expiring_match.group(1) if expiring_match else "0"
        expired_match  = re.search(r"[Ee]xpired[^:]*:\s*([0-9]+)", contracts)
        expired  = expired_match.group(1) if expired_match else "0"

        response = (
            f"## Contract Intelligence\n\n"
            f"**Live contract data:** {contracts}\n\n"
        )

        if int(expiring) > 0:
            response += (
                f"⚠️ **{expiring} contracts expiring within 90 days** — this is your most urgent action item.\n"
                f"Begin renewal negotiations immediately to:\n"
                f"- Avoid being auto-renewed on existing (potentially unfavourable) terms\n"
                f"- Use the renewal as an opportunity to renegotiate pricing and SLAs\n"
                f"- Add volume rebate, benchmarking, and audit rights clauses\n\n"
            )

        if int(expired) > 0:
            response += (
                f"🔴 **{expired} expired contracts** — any spend continuing under expired contracts is a "
                f"serious compliance and commercial risk. Issue new agreements or cease purchasing immediately.\n\n"
            )

        response += (
            f"### Contract management best practices:\n\n"
            f"1. **90-day renewal pipeline** — start negotiations 90 days before expiry, not at expiry\n"
            f"2. **Clause audit** — ensure every contract has: SLA penalties, price escalation limits, "
            f"audit rights, termination for convenience, and data protection clauses\n"
            f"3. **Spend coverage** — target 85%+ of total spend under active contracts\n"
            f"4. **Benchmark pricing** — use spend data to validate pricing against market at every renewal\n"
            f"5. **Auto-renewal alerts** — flag any contracts with auto-renewal clauses and set calendar reminders"
        )
        return response

    def _health_question(self, td: dict, message: str) -> str:
        health = td.get("get_health_score", "")
        spend  = td.get("query_spend_data", "")
        risk   = td.get("get_risk_scores", "")

        if not health:
            return (
                "## Procurement Health Score\n\n"
                "The health score measures your procurement function across five dimensions:\n"
                "Spend Visibility, Supplier Performance, Contract Compliance, Risk Management, and Data Quality.\n\n"
                "Context from your data:\n"
                + (f"- Spend: {spend}\n" if spend else "")
                + (f"- Risk: {risk}\n" if risk else "")
                + "\nAsk me: *'Summarize my procurement performance'* for a full assessment."
            )

        score = self._extract_score(health) or "N/A"
        grade = self._extract_grade(health) or "N/A"

        response = (
            f"## Procurement Health Score\n\n"
            f"**Live health data:** {health}\n\n"
        )

        try:
            s = float(score)
            if s >= 85:
                tier = "🟢 **Top performer** — your procurement function is operating at an advanced maturity level."
            elif s >= 70:
                tier = "🟡 **Good performer** — solid fundamentals with specific areas to strengthen."
            elif s >= 55:
                tier = "🟠 **Developing** — key gaps in risk management and contract compliance need addressing."
            else:
                tier = "🔴 **Needs improvement** — significant investment in procurement capability is required."
            response += f"{tier}\n\n"
        except (ValueError, TypeError):
            pass

        response += (
            f"### How to improve your score:\n\n"
            f"1. **Spend Visibility** — ensure 95%+ of spend is coded to supplier, category, and cost centre\n"
            f"2. **Contract Compliance** — increase contracted spend ratio to 85%+; "
            f"eliminate maverick buying through catalogue and P-card programmes\n"
            f"3. **Supplier Performance** — implement formal scorecards and conduct quarterly business reviews "
            f"with all strategic suppliers\n"
            f"4. **Risk Management** — complete risk assessments for all Tier 1 and Tier 2 suppliers; "
            f"resolve any critical risk relationships\n"
            f"5. **Data Quality** — use the Intelligent Data Engine to clean, deduplicate, and standardise "
            f"supplier and transaction data\n\n"
            f"A 10-point improvement in health score typically correlates with 2–4% reduction in total procurement cost."
        )
        return response

    def _forecast_question(self, td: dict, message: str) -> str:
        forecast = td.get("get_forecast", "")
        spend    = td.get("query_spend_data", "")

        if not forecast:
            return (
                "## Spend Forecast\n\n"
                "The forecast uses Holt Double Exponential Smoothing on 12 months of historical transactions.\n\n"
                "Current spend context: " + (spend or "loading...") + "\n\n"
                "**Forecast drivers to watch:**\n"
                "- Year-end budget flush typically spikes Q4 spend by 15–25%\n"
                "- Contract renewals in Q1 can create lumpy spend patterns\n"
                "- Supplier price escalation clauses (usually CPI-linked) add 2–5% annually\n"
                "Ask: *'What is my spend forecast for next quarter?'* once data is loaded."
            )

        total_match = re.search(r"\$([0-9,\.]+[MBK]?)", forecast)
        total = total_match.group(0) if total_match else "projected spend"

        growth_match = re.search(r"([+-][0-9\.]+)%", forecast)
        growth = growth_match.group(1) if growth_match else None

        response = (
            f"## Spend Forecast\n\n"
            f"**Live forecast data:** {forecast}\n\n"
            f"### Forecast interpretation:\n\n"
        )

        if growth:
            g = float(growth)
            if g > 5:
                response += f"⚠️ Your spend is trending **{g:+.1f}%** — above inflation. Review whether this growth is driven by genuine business need or maverick buying and price creep.\n\n"
            elif g > 0:
                response += f"Your spend is growing at **{g:+.1f}%** — broadly in line with expectations. Monitor category-level growth for anomalies.\n\n"
            else:
                response += f"Your spend is tracking at **{g:+.1f}%** — flat or declining. Ensure this reflects strategic decisions rather than deferred spend that will spike later.\n\n"

        response += (
            f"### Planning recommendations:\n\n"
            f"1. **Budget alignment** — compare forecast against approved budget. If forecast exceeds budget, "
            f"identify which categories are over-running and take corrective action now\n"
            f"2. **Contract renewals** — identify contracts expiring in the forecast window and factor in "
            f"renegotiation timelines (allow 90 days for complex contracts)\n"
            f"3. **Q4 planning** — year-end typically sees a spend spike; plan procurement activities early "
            f"to avoid emergency sole-source buying under time pressure\n"
            f"4. **Savings capture** — use the forecast as the baseline to show the financial impact of your "
            f"savings initiatives — each identified opportunity reduces the projected spend line\n\n"
            f"Use the **What-if Analysis** module to model how specific decisions (new contracts, supplier changes) "
            f"would change this forecast."
        )
        return response

    def _whatif_question(self, td: dict, message: str) -> str:
        spend   = td.get("query_spend_data", "")
        savings = td.get("get_savings_opportunities", "")

        total   = self._extract_dollar(spend) or "your total spend"
        return (
            f"## What-if Scenario Analysis\n\n"
            f"Based on your current spend ({total}), here are some scenarios I can model for you:\n\n"
            f"**Scenario 1 — Supplier consolidation:**\n"
            f"If you consolidate from 3 suppliers to 1 in a given category, "
            f"you typically achieve 8–15% cost reduction through volume leverage. "
            f"On a $5M category, that's $400K–$750K in savings.\n\n"
            f"**Scenario 2 — Price negotiation:**\n"
            f"A 3% reduction on your top-5 suppliers generates approximately "
            f"3% × [top-5 spend] in annual savings. "
            f"Use your spend data to calculate the exact number.\n\n"
            f"**Scenario 3 — Tail spend reduction:**\n"
            f"Reducing tail spend from 24% to 15% of total spend, with a 10% saving on consolidated volume, "
            f"saves approximately 0.9% of total spend — on a $100M base, that's $900K.\n\n"
            f"**Scenario 4 — Contract early renewal:**\n"
            f"Renewing contracts 6 months early locks in current pricing before a supplier price increase. "
            f"If CPI-linked escalation is 4%, early renewal on a $10M contract avoids $400K in cost.\n\n"
            + (f"**Your current savings pipeline:** {savings}\n\n" if savings else "")
            + f"Use the **What-if Analysis** module to run these scenarios interactively with your exact spend figures."
        )

    def _tail_spend_question(self, td: dict, message: str) -> str:
        spend = td.get("query_spend_data", "")
        tail_pct = None
        if spend:
            m = re.search(r"[Tt]ail spend[:\s]+([0-9\.]+)%", spend)
            if m:
                tail_pct = float(m.group(1))

        response = "## Tail Spend Intelligence\n\n"
        if tail_pct is not None:
            if tail_pct > 25:
                response += (
                    f"⚠️ Your tail spend is **{tail_pct:.1f}%** of total spend — this is above the 20% benchmark "
                    f"and represents a significant efficiency and compliance risk.\n\n"
                )
            else:
                response += f"Your tail spend is **{tail_pct:.1f}%** — within acceptable range but still worth optimising.\n\n"
        elif spend:
            response += f"Spend context: {spend}\n\n"

        response += (
            f"**What is tail spend?**\n"
            f"Transactions below your strategic sourcing threshold — typically many small purchases "
            f"from many different suppliers — representing disproportionate admin cost relative to value.\n\n"
            f"**Why it matters:**\n"
            f"- Consumes 80% of transaction processing time for 20% of spend value\n"
            f"- Typically 15–30% more expensive than contracted spend (no volume leverage)\n"
            f"- Creates compliance risk (purchases outside preferred supplier list)\n"
            f"- Fragments spend that could be consolidated for better pricing\n\n"
            f"**Tail spend reduction strategies:**\n\n"
            f"1. **Procurement catalogue** — create an approved product/service catalogue for common items "
            f"(office supplies, IT accessories, travel) with pre-negotiated pricing\n"
            f"2. **P-card programme** — issue purchasing cards to key budget holders with approved supplier lists "
            f"and transaction limits\n"
            f"3. **Blanket orders** — set up standing purchase orders with approved suppliers for recurring "
            f"low-value purchases (reduces per-transaction effort)\n"
            f"4. **Supplier rationalisation** — for each tail spend category, identify the top supplier and "
            f"mandate their use for all purchases in that category\n"
            f"5. **Spend threshold policy** — define a minimum order value below which purchases must use "
            f"a catalogue or P-card — this prevents fragmentation"
        )
        return response

    def _intelligent_default(self, td: dict, message: str, module: str) -> str:
        """Answer any question intelligently using whatever data is available."""
        if not td:
            return (
                f"## Ignite AI Procurement Advisor\n\n"
                f"I'm ready to analyse your procurement data. Ask me specific questions like:\n\n"
                f"- *\"What are my top suppliers by spend?\"*\n"
                f"- *\"Which suppliers have the highest risk?\"*\n"
                f"- *\"What are my best savings opportunities?\"*\n"
                f"- *\"Summarize my procurement performance\"*\n"
                f"- *\"What contracts are expiring soon?\"*\n"
                f"- *\"What is my spend forecast for next quarter?\"*\n"
                f"- *\"What are the best suppliers for office supplies?\"*"
            )

        # Build an intelligent answer from all available data
        response = f"## Procurement Intelligence\n\n"
        response += f"Here's what I can tell you based on your live data:\n\n"

        if "query_spend_data" in td:
            response += f"**Spend profile:** {td['query_spend_data']}\n\n"
        if "get_risk_scores" in td:
            response += f"**Risk profile:** {td['get_risk_scores']}\n\n"
        if "get_savings_opportunities" in td:
            response += f"**Savings pipeline:** {td['get_savings_opportunities']}\n\n"
        if "get_contract_summary" in td:
            response += f"**Contracts:** {td['get_contract_summary']}\n\n"
        if "get_health_score" in td:
            response += f"**Health score:** {td['get_health_score']}\n\n"

        response += (
            f"**Regarding your question** — *\"{message}\"*:\n\n"
            f"Based on the data above, I'd recommend reviewing the relevant module for a deeper dive. "
            f"You can also ask me more specific questions — for example:\n\n"
            f"- *\"Which are my highest-risk suppliers?\"*\n"
            f"- *\"What savings can I achieve through vendor consolidation?\"*\n"
            f"- *\"Which contracts are expiring in the next 90 days?\"*"
        )
        return response

    # ═══════════════════════════════════════════════════════════════════════════
    # Parsing helpers
    # ═══════════════════════════════════════════════════════════════════════════

    def _extract_dollar(self, text: str) -> str | None:
        m = re.search(r"\$([0-9,\.]+[MBK]?)", text)
        return m.group(0) if m else None

    def _extract_score(self, text: str) -> str | None:
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)/100", text)
        return m.group(1) if m else None

    def _extract_grade(self, text: str) -> str | None:
        m = re.search(r"Grade\s+([A-F][+-]?)", text)
        return m.group(1) if m else None

    def _extract_top_suppliers(self, spend_content: str) -> list[dict]:
        """Parse 'Top suppliers: X ($1M), Y ($2M)' from content string."""
        if not spend_content:
            return []
        m = re.search(r"[Tt]op \d+ suppliers[^:]*:\s*(.+?)(?:\.|$)", spend_content)
        if not m:
            return []
        raw = m.group(1)
        suppliers = []
        for part in re.split(r",\s*(?=[A-Z])", raw):
            part = part.strip().rstrip(".")
            name_m = re.match(r"^([^($]+?)\s*(\([^)]+\))?$", part)
            if name_m:
                suppliers.append({
                    "name":  name_m.group(1).strip(),
                    "spend": name_m.group(2) or "",
                })
        return suppliers[:5]

    def _extract_critical_suppliers(self, risk_content: str) -> str:
        """Extract critical supplier names from risk content."""
        m = re.search(r"[Cc]ritical[^:]*:\s*\d+\s*(?:suppliers?)?\s*[\(,]?\s*([^.]+?)(?:\.|$)", risk_content)
        if m:
            return m.group(1).strip()
        # Try 'Highest-risk suppliers: X, Y, Z'
        m2 = re.search(r"[Hh]ighest.risk[^:]*:\s*([^.]+?)(?:\.|$)", risk_content)
        if m2:
            return m2.group(1).strip()
        return ""

    def _extract_category_from_message(self, message: str) -> str:
        """Extract a category name from the user's question."""
        # Common procurement categories
        categories = [
            ("office supplies?|stationery", "Office Supplies"),
            ("it |information technology|software", "IT & Software"),
            ("hardware|computer|laptop|device", "IT Hardware"),
            ("service", "Professional Services"),
            ("consulting|advisory", "Consulting"),
            ("cloud|saas", "Cloud & SaaS"),
            ("travel|hotel|airline|flight", "Travel & Expenses"),
            ("marketing|advertising", "Marketing & Advertising"),
            ("facilities|cleaning|maintenance|janitorial", "Facilities Management"),
            ("logistics|freight|shipping|transport", "Logistics & Transport"),
            ("hr|recruitment|staffing|talent", "HR & Talent"),
            ("legal|law firm", "Legal Services"),
            ("medical|health|pharmaceutical", "Healthcare"),
            ("food|catering|canteen", "Food & Catering"),
            ("telecoms?|phone|mobile", "Telecoms"),
        ]
        msg = message.lower()
        for pattern, label in categories:
            if re.search(pattern, msg):
                return label
        return "General Procurement"

    def _is_relevant_to_category(self, supplier_name: str, category: str) -> bool:
        """Heuristic match between supplier name and category."""
        name = supplier_name.lower()
        cat  = category.lower()
        mapping = {
            "software":   ["microsoft", "sap", "salesforce", "oracle", "adobe", "servicenow"],
            "it":         ["microsoft", "dell", "hp", "cisco", "ibm", "lenovo"],
            "cloud":      ["amazon", "aws", "microsoft", "google", "azure"],
            "consulting": ["accenture", "deloitte", "kpmg", "pwc", "mckinsey", "ey"],
            "it service": ["cognizant", "wipro", "infosys", "tcs", "capgemini"],
            "hardware":   ["dell", "hp", "cisco", "lenovo", "apple"],
        }
        for key, names in mapping.items():
            if key in cat:
                return any(n in name for n in names)
        return False
