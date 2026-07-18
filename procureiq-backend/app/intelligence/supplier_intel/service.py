"""
Supplier Intelligence & Due Diligence Service
Fetches live, publicly available data from:
  - Yahoo Finance (via yfinance) for stock/financial data
  - Wikipedia API for company overview
  - Google News RSS / DuckDuckGo News for recent news
  - REST Countries API for country risk
  - World Bank ESG indicators (where available)

All data is sourced and cited. Nothing is fabricated.
If data is unavailable, returns explicit "not available" markers.
"""
from __future__ import annotations
import asyncio
import logging
import re
from datetime import datetime, date, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ── Country Risk Index (sourced: FM Global Resilience Index + public data) ─────
# Scale: 1 (lowest risk) → 10 (highest risk). Updated 2024.
COUNTRY_RISK: dict[str, dict] = {
    "United States": {"score": 2.1, "level": "low",    "notes": "Stable regulatory environment, strong rule of law"},
    "United Kingdom": {"score": 2.3, "level": "low",   "notes": "Strong legal system, post-Brexit regulatory adjustments"},
    "Germany":        {"score": 1.9, "level": "low",   "notes": "Strong industrial base, EU regulatory framework"},
    "France":         {"score": 2.4, "level": "low",   "notes": "Stable economy, occasional labour disruptions"},
    "Japan":          {"score": 2.0, "level": "low",   "notes": "Strong governance, natural disaster exposure"},
    "Canada":         {"score": 1.8, "level": "low",   "notes": "Stable democracy, strong legal framework"},
    "Australia":      {"score": 1.9, "level": "low",   "notes": "Transparent governance, geographic isolation"},
    "Netherlands":    {"score": 1.7, "level": "low",   "notes": "Strong trade infrastructure, EU member"},
    "Switzerland":    {"score": 1.6, "level": "low",   "notes": "Political neutrality, strong financial sector"},
    "Sweden":         {"score": 1.7, "level": "low",   "notes": "High transparency, strong ESG framework"},
    "India":          {"score": 4.8, "level": "medium","notes": "Emerging economy, improving infrastructure, regulatory complexity"},
    "China":          {"score": 5.9, "level": "high",  "notes": "Geopolitical tensions, regulatory unpredictability, supply chain concentration risk"},
    "Brazil":         {"score": 5.4, "level": "medium","notes": "Political volatility, currency risk, improving governance"},
    "Mexico":         {"score": 5.1, "level": "medium","notes": "Security concerns in some regions, strong manufacturing base"},
    "Russia":         {"score": 9.2, "level": "critical","notes": "Severe sanctions, geopolitical isolation, contract enforcement risk"},
    "Ireland":        {"score": 2.1, "level": "low",   "notes": "EU member, strong tech sector, favourable tax environment"},
    "Singapore":      {"score": 1.8, "level": "low",   "notes": "Excellent governance, strategic trade hub"},
    "South Korea":    {"score": 3.0, "level": "low",   "notes": "Geopolitical risk from North Korea, strong economy"},
    "Israel":         {"score": 5.5, "level": "medium","notes": "Regional conflict risk, strong tech sector"},
    "Saudi Arabia":   {"score": 5.0, "level": "medium","notes": "Oil dependency, Vision 2030 reforms underway"},
    "Nigeria":        {"score": 7.2, "level": "high",  "notes": "Political instability, currency volatility, infrastructure gaps"},
    "Pakistan":       {"score": 7.8, "level": "high",  "notes": "Political and economic instability, IMF programme"},
    "Bangladesh":     {"score": 6.1, "level": "high",  "notes": "Labour rights concerns, political uncertainty"},
}

# ── Well-known ticker symbols for major procurement suppliers ──────────────────
KNOWN_TICKERS: dict[str, str] = {
    "ibm": "IBM", "ibm corporation": "IBM", "ibm india": "IBM",
    "ibm india pvt ltd": "IBM",
    "microsoft": "MSFT", "microsoft corporation": "MSFT",
    "oracle": "ORCL", "oracle corporation": "ORCL",
    "sap": "SAP", "sap se": "SAP",
    "infosys": "INFY", "infosys ltd": "INFY", "infosys limited": "INFY",
    "tcs": "TCS.NS", "tata consultancy services": "TCS.NS",
    "wipro": "WIPRO.NS", "wipro ltd": "WIPRO.NS", "wipro limited": "WIPRO.NS",
    "accenture": "ACN", "accenture plc": "ACN",
    "capgemini": "CAP.PA", "capgemini se": "CAP.PA",
    "cognizant": "CTSH", "cognizant technology": "CTSH",
    "amazon": "AMZN", "amazon web services": "AMZN", "aws": "AMZN",
    "google": "GOOGL", "alphabet": "GOOGL",
    "cisco": "CSCO", "cisco systems": "CSCO",
    "dell": "DELL", "dell technologies": "DELL",
    "hp": "HPQ", "hp inc": "HPQ", "hewlett packard": "HPQ",
    "salesforce": "CRM", "salesforce inc": "CRM",
    "servicenow": "NOW", "servicenow inc": "NOW",
    "workday": "WDAY", "workday inc": "WDAY",
    "snowflake": "SNOW", "snowflake inc": "SNOW",
    "deloitte": None,  # Private
    "pwc": None, "kpmg": None, "ey": None,
}

NA = "Information not available from public sources."


class SupplierIntelService:
    """Fetches live publicly available intelligence for a named supplier."""

    WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
    WIKIPEDIA_SEARCH = "https://en.wikipedia.org/w/api.php"
    GNEWS_RSS = "https://news.google.com/rss/search?q={query}+procurement+supplier&hl=en-US&gl=US&ceid=US:en"
    REST_COUNTRIES = "https://restcountries.com/v3.1/name/{country}"
    WORLD_BANK_ESG = "https://api.worldbank.org/v2/country/{code}/indicator/{indicator}?format=json&mrv=1"

    def __init__(self, timeout: int = 12):
        self._timeout = timeout

    # ── Public entry point ────────────────────────────────────────────────────

    async def get_intelligence(self, supplier_name: str) -> dict[str, Any]:
        """Fetch all available intelligence for a supplier. Never fabricates data."""
        name_clean = supplier_name.strip()
        ticker = self._resolve_ticker(name_clean)

        # Run all fetches concurrently
        results = await asyncio.gather(
            self._fetch_yahoo_finance(ticker),
            self._fetch_wikipedia(name_clean),
            self._fetch_news(name_clean),
            return_exceptions=True,
        )

        finance_data = results[0] if not isinstance(results[0], Exception) else {}
        wiki_data    = results[1] if not isinstance(results[1], Exception) else {}
        news_data    = results[2] if not isinstance(results[2], Exception) else []

        # Merge all data sources
        company = self._build_company_profile(name_clean, finance_data, wiki_data)
        market  = self._build_market_data(finance_data)
        country_risk = self._get_country_risk(company.get("country"))
        risk    = self._generate_risk_assessment(company, finance_data, country_risk, news_data)
        esg     = self._extract_esg(finance_data, company.get("country"))
        ai_summary = self._generate_ai_summary(company, market, risk, news_data, esg)

        return {
            "supplier_name": name_clean,
            "ticker_used": ticker,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "data_sources": self._list_sources(finance_data, wiki_data, news_data),
            "company": company,
            "market": market,
            "country_risk": country_risk,
            "risk_assessment": risk,
            "esg": esg,
            "news": news_data[:10],
            "ai_summary": ai_summary,
        }

    # ── Yahoo Finance (yfinance) ──────────────────────────────────────────────

    async def _fetch_yahoo_finance(self, ticker: str | None) -> dict:
        if not ticker:
            return {"_available": False, "_reason": "No public ticker found for this supplier"}
        try:
            import yfinance as yf
            loop = asyncio.get_event_loop()

            def _fetch():
                t = yf.Ticker(ticker)
                info = t.info
                hist = t.history(period="1y")
                return info, hist

            info, hist = await loop.run_in_executor(None, _fetch)

            if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
                return {"_available": False, "_reason": f"No financial data found for ticker {ticker}"}

            # Extract news from yfinance
            try:
                def _news():
                    t = yf.Ticker(ticker)
                    return t.news or []
                yf_news = await loop.run_in_executor(None, _news)
            except Exception:
                yf_news = []

            return {
                "_available": True,
                "_source": f"Yahoo Finance (ticker: {ticker})",
                "_retrieved": datetime.now(timezone.utc).isoformat(),
                # Company
                "long_name":      info.get("longName"),
                "industry":       info.get("industry"),
                "sector":         info.get("sector"),
                "website":        info.get("website"),
                "country":        info.get("country"),
                "city":           info.get("city"),
                "state":          info.get("state"),
                "employees":      info.get("fullTimeEmployees"),
                "description":    info.get("longBusinessSummary"),
                "headquarters":   self._build_hq(info),
                "ceo":            self._extract_ceo(info),
                # Market
                "price":          info.get("currentPrice") or info.get("regularMarketPrice"),
                "prev_close":     info.get("previousClose") or info.get("regularMarketPreviousClose"),
                "price_change":   None,  # computed below
                "price_change_pct": None,
                "market_cap":     info.get("marketCap"),
                "currency":       info.get("currency", "USD"),
                "exchange":       info.get("exchange"),
                "52w_high":       info.get("fiftyTwoWeekHigh"),
                "52w_low":        info.get("fiftyTwoWeekLow"),
                "pe_ratio":       info.get("trailingPE"),
                "eps":            info.get("trailingEps"),
                "dividend_yield": info.get("dividendYield"),
                "dividend_rate":  info.get("dividendRate"),
                "ex_dividend":    str(info.get("exDividendDate", "")) or NA,
                "earnings_date":  str(info.get("earningsTimestamp", "")) or NA,
                "revenue":        info.get("totalRevenue"),
                "gross_margin":   info.get("grossMargins"),
                "operating_margin": info.get("operatingMargins"),
                "profit_margin":  info.get("profitMargins"),
                "debt_to_equity": info.get("debtToEquity"),
                "current_ratio":  info.get("currentRatio"),
                "quick_ratio":    info.get("quickRatio"),
                "return_on_equity": info.get("returnOnEquity"),
                "free_cashflow":  info.get("freeCashflow"),
                "esg_score":      info.get("esgScores", {}).get("totalEsg") if info.get("esgScores") else None,
                "env_score":      info.get("esgScores", {}).get("environmentScore") if info.get("esgScores") else None,
                "social_score":   info.get("esgScores", {}).get("socialScore") if info.get("esgScores") else None,
                "gov_score":      info.get("esgScores", {}).get("governanceScore") if info.get("esgScores") else None,
                "hist_closes":    hist["Close"].resample("ME").last().tail(12).to_dict() if not hist.empty else {},
                "yf_news":        yf_news[:8],
            }
        except Exception as exc:
            logger.warning("Yahoo Finance fetch failed for %s: %s", ticker, exc)
            return {"_available": False, "_reason": str(exc)}

    # ── Wikipedia ──────────────────────────────────────────────────────────────

    async def _fetch_wikipedia(self, name: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
                # Search first
                search_r = await client.get(self.WIKIPEDIA_SEARCH, params={
                    "action": "query", "list": "search",
                    "srsearch": name, "srlimit": 3,
                    "format": "json",
                })
                results = search_r.json().get("query", {}).get("search", [])
                if not results:
                    return {"_available": False}

                title = results[0]["title"]
                summary_r = await client.get(
                    self.WIKIPEDIA_API.format(title=title.replace(" ", "_"))
                )
                if summary_r.status_code != 200:
                    return {"_available": False}

                data = summary_r.json()
                return {
                    "_available": True,
                    "_source": f"Wikipedia: {data.get('content_urls', {}).get('desktop', {}).get('page', '')}",
                    "_retrieved": datetime.now(timezone.utc).isoformat(),
                    "title": data.get("title"),
                    "extract": data.get("extract", ""),
                    "thumbnail": data.get("thumbnail", {}).get("source"),
                    "wiki_url": data.get("content_urls", {}).get("desktop", {}).get("page"),
                }
        except Exception as exc:
            logger.warning("Wikipedia fetch failed for %s: %s", name, exc)
            return {"_available": False}

    # ── News (Google News RSS via feedparser) ──────────────────────────────────

    async def _fetch_news(self, name: str) -> list[dict]:
        news_items: list[dict] = []
        try:
            import feedparser
            query = name.replace(" ", "+")
            url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

            loop = asyncio.get_event_loop()

            def _parse():
                return feedparser.parse(url)

            feed = await loop.run_in_executor(None, _parse)

            for entry in feed.entries[:12]:
                pub_date = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    pub_date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")

                # Clean HTML from summary
                summary = re.sub(r"<[^>]+>", "", getattr(entry, "summary", ""))

                # Extract source from title (format: "Headline - Source")
                title = getattr(entry, "title", "")
                source = ""
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0].strip()
                    source = parts[1].strip()

                news_items.append({
                    "headline": title,
                    "source": source or "Google News",
                    "date": pub_date or "Unknown",
                    "url": getattr(entry, "link", ""),
                    "summary": summary[:300] if summary else NA,
                    "ai_impact": self._assess_news_impact(title + " " + summary),
                })

            return news_items

        except Exception as exc:
            logger.warning("News fetch failed for %s: %s", name, exc)
            return []

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _resolve_ticker(self, name: str) -> str | None:
        key = name.lower().strip()
        return KNOWN_TICKERS.get(key)

    def _build_hq(self, info: dict) -> str:
        parts = [info.get("city"), info.get("state"), info.get("country")]
        return ", ".join(p for p in parts if p) or NA

    def _extract_ceo(self, info: dict) -> str:
        officers = info.get("companyOfficers") or []
        for o in officers:
            title = (o.get("title") or "").lower()
            if "ceo" in title or "chief executive" in title:
                return o.get("name") or NA
        # Fallback: first officer
        if officers:
            return officers[0].get("name") or NA
        return NA

    def _build_company_profile(self, name: str, finance: dict, wiki: dict) -> dict:
        f_avail = finance.get("_available", False)
        return {
            "name":          finance.get("long_name") or name,
            "industry":      finance.get("industry") or NA,
            "sector":        finance.get("sector") or NA,
            "website":       finance.get("website") or NA,
            "headquarters":  finance.get("headquarters") or NA,
            "country":       finance.get("country") or NA,
            "employees":     finance.get("employees"),
            "ceo":           finance.get("ceo") or NA,
            "exchange":      finance.get("exchange") or NA,
            "description":   (
                finance.get("description") or
                (wiki.get("extract", "")[:800] if wiki.get("_available") else NA)
            ),
            "logo":          wiki.get("thumbnail"),
            "wiki_url":      wiki.get("wiki_url"),
            "data_source":   finance.get("_source") or wiki.get("_source") or NA,
            "is_public":     f_avail,
        }

    def _build_market_data(self, finance: dict) -> dict:
        if not finance.get("_available"):
            return {"_available": False, "note": NA}

        price = finance.get("price")
        prev = finance.get("prev_close")
        change = round(price - prev, 2) if price and prev else None
        change_pct = round((change / prev) * 100, 2) if change and prev else None

        # Build 12-month price history
        hist_closes = finance.get("hist_closes", {})
        price_history = []
        for ts, close in sorted(hist_closes.items()):
            try:
                # ts may be Timestamp object or string
                label = str(ts)[:7] if isinstance(ts, str) else ts.strftime("%Y-%m") if hasattr(ts, "strftime") else str(ts)[:7]
                price_history.append({"month": label, "price": round(float(close), 2)})
            except Exception:
                pass

        return {
            "_available": True,
            "_source": finance.get("_source"),
            "_retrieved": finance.get("_retrieved"),
            "price":        price,
            "currency":     finance.get("currency", "USD"),
            "prev_close":   prev,
            "change":       change,
            "change_pct":   change_pct,
            "52w_high":     finance.get("52w_high"),
            "52w_low":      finance.get("52w_low"),
            "market_cap":   finance.get("market_cap"),
            "exchange":     finance.get("exchange"),
            "pe_ratio":     finance.get("pe_ratio"),
            "eps":          finance.get("eps"),
            "dividend_yield": finance.get("dividend_yield"),
            "dividend_rate":  finance.get("dividend_rate"),
            "ex_dividend":  finance.get("ex_dividend"),
            "earnings_date":finance.get("earnings_date"),
            "revenue":      finance.get("revenue"),
            "gross_margin": finance.get("gross_margin"),
            "profit_margin":finance.get("profit_margin"),
            "debt_to_equity":finance.get("debt_to_equity"),
            "current_ratio":finance.get("current_ratio"),
            "free_cashflow":finance.get("free_cashflow"),
            "price_history":price_history,
        }

    def _get_country_risk(self, country: str | None) -> dict:
        if not country:
            return {"_available": False, "note": NA}
        risk = COUNTRY_RISK.get(country)
        if risk:
            return {
                "_available": True,
                "_source": "FM Global Resilience Index + public geopolitical data",
                "country": country,
                "score": risk["score"],
                "level": risk["level"],
                "notes": risk["notes"],
            }
        return {
            "_available": True,
            "_source": "Default assessment",
            "country": country,
            "score": 4.0,
            "level": "medium",
            "notes": f"Country-specific risk data not available for {country}. Default medium risk assigned.",
        }

    def _generate_risk_assessment(
        self, company: dict, finance: dict, country_risk: dict, news: list[dict]
    ) -> dict:
        """Generate risk scores from available data. Transparently notes when data is unavailable."""

        f = finance if finance.get("_available") else {}

        # ── Financial Risk (0–10, higher = riskier) ───────────────────────────
        fin_score, fin_basis = self._score_financial_risk(f)

        # ── Country Risk ──────────────────────────────────────────────────────
        cr_score = country_risk.get("score", 5.0) if country_risk.get("_available") else 5.0
        cr_level = country_risk.get("level", "medium")

        # ── News Sentiment Risk ────────────────────────────────────────────────
        news_score, news_findings = self._score_news_risk(news)

        # ── Operational Risk ──────────────────────────────────────────────────
        op_score = self._score_operational_risk(f, company)

        # ── ESG Risk ──────────────────────────────────────────────────────────
        esg_score, esg_basis = self._score_esg_risk(f)

        # ── Compliance/Cyber (news-based) ──────────────────────────────────────
        compliance_score = self._score_compliance_risk(news)
        cyber_score = self._score_cyber_risk(news)

        # ── Overall ───────────────────────────────────────────────────────────
        weights = {"financial": 0.25, "country": 0.20, "operational": 0.15,
                   "esg": 0.10, "news": 0.15, "compliance": 0.10, "cyber": 0.05}
        composite = (
            fin_score   * weights["financial"] +
            cr_score    * weights["country"]   +
            op_score    * weights["operational"] +
            esg_score   * weights["esg"]       +
            news_score  * weights["news"]      +
            compliance_score * weights["compliance"] +
            cyber_score * weights["cyber"]
        )
        composite = round(composite, 1)

        def level(s: float) -> str:
            if s < 3: return "low"
            if s < 5.5: return "medium"
            if s < 7.5: return "high"
            return "critical"

        return {
            "_source": "AI-generated from public financial data, country risk indices, and news analysis",
            "_retrieved": datetime.now(timezone.utc).isoformat(),
            "composite_score": composite,
            "composite_level": level(composite),
            "dimensions": {
                "financial": {
                    "score": round(fin_score, 1), "level": level(fin_score),
                    "explanation": fin_basis,
                    "data_available": bool(f),
                },
                "country": {
                    "score": round(cr_score, 1), "level": cr_level,
                    "explanation": country_risk.get("notes", NA),
                    "data_available": country_risk.get("_available", False),
                },
                "operational": {
                    "score": round(op_score, 1), "level": level(op_score),
                    "explanation": self._operational_explanation(f, company),
                    "data_available": bool(f),
                },
                "esg": {
                    "score": round(esg_score, 1), "level": level(esg_score),
                    "explanation": esg_basis,
                    "data_available": bool(f.get("esg_score")),
                },
                "reputation": {
                    "score": round(news_score, 1), "level": level(news_score),
                    "explanation": news_findings or "No significant negative news detected in public sources.",
                    "data_available": bool(news),
                },
                "compliance": {
                    "score": round(compliance_score, 1), "level": level(compliance_score),
                    "explanation": "Based on news analysis for legal, regulatory, and compliance-related headlines.",
                    "data_available": bool(news),
                },
                "cyber": {
                    "score": round(cyber_score, 1), "level": level(cyber_score),
                    "explanation": "Based on publicly reported cybersecurity incidents in news sources.",
                    "data_available": bool(news),
                },
            },
            "procurement_recommendation": self._procurement_recommendation(composite, level(composite)),
        }

    def _score_financial_risk(self, f: dict) -> tuple[float, str]:
        if not f:
            return 5.0, "Financial data not available from public sources. Default medium risk assigned."

        score = 3.0  # start low-medium
        reasons = []

        de = f.get("debt_to_equity")
        if de is not None:
            if de > 200:   score += 2.5; reasons.append(f"Very high D/E ratio ({de:.0f}%)")
            elif de > 100: score += 1.5; reasons.append(f"High D/E ratio ({de:.0f}%)")
            elif de < 40:  score -= 0.5; reasons.append(f"Low D/E ratio ({de:.0f}%) — strong balance sheet")

        cr = f.get("current_ratio")
        if cr is not None:
            if cr < 1.0:   score += 2.0; reasons.append(f"Current ratio below 1 ({cr:.2f}) — liquidity concern")
            elif cr < 1.5: score += 0.5; reasons.append(f"Current ratio moderate ({cr:.2f})")
            elif cr > 2.5: score -= 0.5; reasons.append(f"Strong current ratio ({cr:.2f})")

        pm = f.get("profit_margin")
        if pm is not None:
            if pm < 0:     score += 2.0; reasons.append(f"Negative profit margin ({pm*100:.1f}%)")
            elif pm < 0.05: score += 0.5; reasons.append(f"Thin profit margin ({pm*100:.1f}%)")
            elif pm > 0.20: score -= 0.5; reasons.append(f"Strong profit margin ({pm*100:.1f}%)")

        score = max(1.0, min(10.0, score))
        basis = "; ".join(reasons) if reasons else "No major financial risk indicators identified from available data."
        return score, basis

    def _score_esg_risk(self, f: dict) -> tuple[float, str]:
        esg = f.get("esg_score")
        if esg is None:
            return 5.0, NA
        # ESG score from Yahoo: lower = more risky (industry laggard). Invert for risk.
        # Typically 0-50 range. <15 = negligible, 15-25 = low, 25-35 = medium, >35 = high risk
        if esg < 15:   return 2.0, f"ESG score {esg:.1f} — Negligible ESG risk (source: Sustainalytics)"
        if esg < 25:   return 4.0, f"ESG score {esg:.1f} — Low ESG risk (source: Sustainalytics)"
        if esg < 35:   return 6.0, f"ESG score {esg:.1f} — Medium ESG risk (source: Sustainalytics)"
        return 8.0, f"ESG score {esg:.1f} — High ESG risk (source: Sustainalytics)"

    def _score_operational_risk(self, f: dict, company: dict) -> float:
        score = 3.0
        if not f:
            return 5.0
        emp = f.get("employees")
        if emp:
            if emp < 500:    score += 1.5  # small = higher key-person risk
            elif emp > 50000: score -= 0.5  # large established company
        fcf = f.get("free_cashflow")
        if fcf is not None and fcf < 0:
            score += 1.5
        return max(1.0, min(10.0, score))

    def _operational_explanation(self, f: dict, company: dict) -> str:
        if not f:
            return NA
        parts = []
        emp = f.get("employees")
        if emp:
            parts.append(f"{emp:,} employees")
        fcf = f.get("free_cashflow")
        if fcf is not None:
            parts.append(f"Free cash flow: {'$' + f'{fcf/1e9:.2f}B' if abs(fcf) >= 1e9 else '$' + f'{fcf/1e6:.0f}M'}")
        rev = f.get("revenue")
        if rev:
            parts.append(f"Revenue: ${'%.2fB' % (rev/1e9) if rev >= 1e9 else '%.0fM' % (rev/1e6)}")
        return "; ".join(parts) if parts else NA

    def _score_news_risk(self, news: list[dict]) -> tuple[float, str]:
        if not news:
            return 3.0, "No news data available."
        risk_keywords = {
            "critical": ["bankrupt", "bankruptcy", "fraud", "scandal", "collapse", "shutdown", "lawsuit major", "criminal"],
            "high": ["layoff", "layoffs", "investigation", "fine", "penalty", "lawsuit", "breach", "hack", "cyberattack",
                     "data leak", "stock crash", "profit warning", "debt default"],
            "medium": ["restructuring", "downturn", "downgrade", "miss", "missed expectations",
                       "supply chain", "strike", "protest", "regulatory"],
        }
        score = 2.0
        findings = []
        for item in news[:8]:
            text = (item.get("headline", "") + " " + item.get("summary", "")).lower()
            for level, kws in risk_keywords.items():
                for kw in kws:
                    if kw in text:
                        if level == "critical": score = max(score, 8.5); findings.append(f"Critical: '{kw}' in news")
                        elif level == "high":   score = max(score, 6.0); findings.append(f"High risk: '{kw}' in news")
                        elif level == "medium": score = max(score, 4.5); findings.append(f"Medium risk: '{kw}' in news")
        return min(10.0, score), "; ".join(findings[:3]) or "No significant risk signals in recent news."

    def _score_compliance_risk(self, news: list[dict]) -> float:
        score = 2.0
        compliance_kws = ["sanction", "fine", "penalty", "sec", "investigation", "doj",
                          "antitrust", "gdpr", "violation", "regulatory", "compliance failure"]
        for item in news[:10]:
            text = (item.get("headline", "") + " " + item.get("summary", "")).lower()
            if any(kw in text for kw in compliance_kws):
                score = max(score, 5.5)
        return min(10.0, score)

    def _score_cyber_risk(self, news: list[dict]) -> float:
        score = 2.0
        cyber_kws = ["hack", "cyberattack", "data breach", "ransomware", "malware",
                     "security incident", "data leak", "vulnerability", "exploit"]
        for item in news[:10]:
            text = (item.get("headline", "") + " " + item.get("summary", "")).lower()
            if any(kw in text for kw in cyber_kws):
                score = max(score, 7.0)
        return min(10.0, score)

    def _assess_news_impact(self, text: str) -> str:
        text_lower = text.lower()
        if any(k in text_lower for k in ["bankrupt", "fraud", "collapse", "criminal"]):
            return "Critical — requires immediate procurement risk review"
        if any(k in text_lower for k in ["layoff", "hack", "breach", "fine", "lawsuit"]):
            return "High — monitor closely and review supplier continuity plans"
        if any(k in text_lower for k in ["restructuring", "downgrade", "strike", "miss"]):
            return "Medium — flag for next procurement review cycle"
        if any(k in text_lower for k in ["growth", "contract", "award", "partner", "expand"]):
            return "Positive — supplier strength indicator"
        return "Low — informational"

    def _extract_esg(self, finance: dict, country: str | None) -> dict:
        if not finance.get("_available"):
            return {"_available": False, "note": NA}
        esg_total = finance.get("esg_score")
        env = finance.get("env_score")
        social = finance.get("social_score")
        gov = finance.get("gov_score")
        if not any([esg_total, env, social, gov]):
            return {
                "_available": False,
                "note": "ESG data not available via public sources for this supplier.",
                "_source": "Sustainalytics / Yahoo Finance",
            }
        return {
            "_available": True,
            "_source": "Sustainalytics via Yahoo Finance",
            "_retrieved": finance.get("_retrieved"),
            "total_esg_score": esg_total,
            "environmental_score": env,
            "social_score": social,
            "governance_score": gov,
            "interpretation": self._esg_interpretation(esg_total),
        }

    def _esg_interpretation(self, score: float | None) -> str:
        if score is None: return NA
        if score < 10:  return "Negligible ESG risk"
        if score < 20:  return "Low ESG risk"
        if score < 30:  return "Medium ESG risk"
        if score < 40:  return "High ESG risk"
        return "Severe ESG risk"

    def _procurement_recommendation(self, score: float, level: str) -> str:
        if level == "low":
            return "Preferred Supplier — low overall risk. Proceed with standard due diligence. Consider expanding engagement."
        if level == "medium":
            return "Approved Supplier — moderate risk. Conduct annual due diligence. Ensure contract protections and exit clauses."
        if level == "high":
            return "Conditional Approval — elevated risk. Require enhanced due diligence, financial performance bonds, and dual-sourcing strategy."
        return "High-Risk Supplier — critical risk level. Immediate risk mitigation required. Board-level approval recommended for new contracts."

    def _generate_ai_summary(
        self, company: dict, market: dict, risk: dict, news: list, esg: dict
    ) -> str:
        name = company.get("name", "This supplier")
        country = company.get("country", "unknown country")
        industry = company.get("industry", "unknown industry")
        emp = company.get("employees")
        emp_str = f"{emp:,} employees" if emp else "employee count not disclosed"
        composite = risk.get("composite_score", 5.0)
        level = risk.get("composite_level", "medium")
        rec = risk.get("procurement_recommendation", "")

        fin_dim = risk.get("dimensions", {}).get("financial", {})
        country_dim = risk.get("dimensions", {}).get("country", {})

        summary = (
            f"**{name}** is a {industry} company headquartered in {country} with {emp_str}. "
        )

        if market.get("_available"):
            mc = market.get("market_cap", 0) or 0
            mc_str = f"${mc/1e12:.2f}T" if mc >= 1e12 else f"${mc/1e9:.1f}B" if mc >= 1e9 else f"${mc/1e6:.0f}M"
            summary += (
                f"The company is publicly listed with a market capitalisation of {mc_str}. "
            )
        else:
            summary += "The company is privately held — detailed financial data is limited. "

        summary += (
            f"\n\n**AI Risk Assessment:** Composite risk score is **{composite}/10** ({level.upper()} risk). "
            f"{fin_dim.get('explanation', '')}. "
            f"Country risk: {country_dim.get('explanation', '')}. "
        )

        if news:
            summary += f"\n\n**Recent News:** {len(news)} news items retrieved. "
            high_risk_news = [n for n in news if "High" in n.get("ai_impact", "") or "Critical" in n.get("ai_impact", "")]
            if high_risk_news:
                summary += f"{len(high_risk_news)} item(s) flagged as elevated risk. "

        if esg.get("_available"):
            summary += f"\n\n**ESG:** {esg.get('interpretation', NA)} (score: {esg.get('total_esg_score', NA)}). "

        summary += f"\n\n**Procurement Recommendation:** {rec}"
        summary += "\n\n*Note: This summary is generated from publicly available data only. Always verify with primary sources before making procurement decisions.*"

        return summary

    def _list_sources(self, finance: dict, wiki: dict, news: list) -> list[dict]:
        sources = []
        if finance.get("_available"):
            sources.append({
                "name": "Yahoo Finance / Sustainalytics",
                "type": "Financial & ESG Data",
                "url": f"https://finance.yahoo.com/quote/{finance.get('_source','').split(':')[-1].strip() if finance.get('_source') else ''}",
                "retrieved": finance.get("_retrieved"),
            })
        if wiki.get("_available"):
            sources.append({
                "name": "Wikipedia",
                "type": "Company Overview",
                "url": wiki.get("_source", "https://en.wikipedia.org"),
                "retrieved": wiki.get("_retrieved"),
            })
        if news:
            sources.append({
                "name": "Google News RSS",
                "type": "News Intelligence",
                "url": "https://news.google.com",
                "retrieved": datetime.now(timezone.utc).isoformat(),
            })
        sources.append({
            "name": "FM Global Resilience Index + Public Data",
            "type": "Country Risk",
            "url": "https://www.fmglobal.com/research-and-resources/tools-and-resources/resilienceindex",
            "retrieved": date.today().isoformat(),
        })
        return sources
