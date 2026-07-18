import { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardActionArea, Chip,
  TextField, InputAdornment, Button, Divider,
  Paper, List, ListItem, ListItemButton, ListItemText,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningIcon from '@mui/icons-material/Warning';
import SavingsIcon from '@mui/icons-material/Savings';
import FavoriteIcon from '@mui/icons-material/Favorite';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';

// ── Documentation Data ─────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  title: string;
  content: string;
}

interface ModuleDoc {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  phase: number;
  version: string;
  lastUpdated: string;
  summary: string;
  tags: string[];
  sections: DocSection[];
}

const DOCS: ModuleDoc[] = [
  {
    id: 'executive-command-center',
    title: 'Executive Command Center',
    icon: <DashboardIcon />,
    category: 'Analytics',
    phase: 1,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
    summary: 'The central command hub for procurement executives — real-time KPIs, spend trends, and AI-generated briefings.',
    tags: ['KPIs', 'Dashboard', 'Spend', 'Ignite', 'Executive'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `The Executive Command Center is the primary landing page for procurement leaders. It aggregates the most critical procurement signals into a single, scannable view — enabling executives to assess portfolio health in under 60 seconds.

**Key business value:**
- Immediate visibility into total spend, supplier count, contract coverage, and tail spend ratio
- AI-generated executive briefing from Ignite that summarises performance and flags anomalies
- Month-over-month spend trending with category breakdown
- Top supplier concentration analysis to surface consolidation risk`
      },
      {
        id: 'functional-requirements', title: 'Functional Requirements', content: `**FR-ECC-001**: Display 7 KPI cards — Total Spend, Active Suppliers, Active Contracts, Tail Spend %, Contracted Spend %, Savings Identified, Health Score.

**FR-ECC-002**: Render 12-month spend trend as an area chart with tooltips formatted in base currency.

**FR-ECC-003**: Display category spend breakdown as horizontal progress bars.

**FR-ECC-004**: Display top-10 suppliers by spend in an interactive table with search, sort, and export.

**FR-ECC-005**: ExecutiveSummary component must call Ignite API to generate a contextual briefing paragraph when KPI data loads.

**FR-ECC-006**: All KPI deltas must show directional indicators (↑/↓) coloured green/red based on procurement impact.`
      },
      {
        id: 'ui-specification', title: 'UI Specification', content: `**Layout:** Full-width page within IBM-aligned sidebar layout. Three stacked sections: ExecutiveSummary → KPI Ribbon → Charts → DataTable.

**KPI Ribbon:** 7-column responsive grid. Each KPICard has: accent colour bar (left border), title (caption), value (h4), delta badge (optional), subtitle (optional).

**Spend Trend:** Recharts AreaChart. Y-axis formatted as $XM. X-axis = month abbreviations. Fill gradient from IBM Blue (#0f62fe) to transparent.

**Category Chart:** Horizontal inline progress bars. Each bar = category label + percentage.

**Top Suppliers Table:** DataTable component with sticky header, pagination (10/25/50), column sort, CSV export.

**Responsive breakpoints:** xs (stacked), sm (2-col KPI), md (7-col KPI + side-by-side charts).`
      },
      {
        id: 'database-design', title: 'Database Design', content: `The Executive Command Center is read-only — it queries existing spend_transactions, suppliers, and contracts tables via service layer aggregations.

**Primary query (spend KPIs):**
\`\`\`sql
SELECT
  SUM(amount_usd) AS total_spend,
  COUNT(DISTINCT supplier_id) AS active_suppliers,
  AVG(amount_usd) AS avg_transaction
FROM spend_transactions
WHERE tenant_id = :tenant_id
  AND deleted_at IS NULL
  AND po_date >= :start_date
\`\`\`

**Monthly trend:** GROUP BY DATE_TRUNC('month', po_date)

**Top suppliers:** GROUP BY supplier_name ORDER BY SUM(amount_usd) DESC LIMIT 10`
      },
      {
        id: 'api-design', title: 'API Design', content: `**GET /api/v1/spend/kpis**
Returns SpendKPIs object. Cached 5 minutes per tenant.

**GET /api/v1/spend/trend?months=12**
Returns array of { month, total_spend } sorted chronologically.

**GET /api/v1/spend/top-suppliers?limit=10**
Returns array of { rank, supplier_name, total_spend, spend_percent, cumulative_percent }.

**GET /api/v1/spend/categories**
Returns spend breakdown by commodity_code / category.

All endpoints require Authorization: Bearer {JWT} header. 
Response shape: { data: T, meta?: {...} }`
      },
      {
        id: 'ai-logic', title: 'Ignite AI Logic', content: `The Executive Summary component receives the KPI object and passes it to the Ignite orchestrator with the prompt:

> "Generate a 2-sentence executive procurement briefing for a CPO. Data: {kpi_json}. Highlight the most critical finding and one recommended action."

**Tool dispatch:** The orchestrator calls \`get_spend_summary\` tool which returns live aggregated spend data from PostgreSQL.

**Fallback:** If watsonx is unavailable, a template-generated summary is returned: "Total spend of $X with Y active suppliers. Tail spend at Z% — [above/within] benchmark."

**Streaming:** Executive summary does NOT stream (one-shot) to avoid layout reflow. Full response awaited before render.`
      },
      {
        id: 'test-strategy', title: 'Test Strategy', content: `**Unit tests (services):**
- test_spend_kpis_calculation: seed 100 transactions, assert KPI values correct
- test_monthly_trend_grouping: assert 12 monthly buckets returned
- test_top_suppliers_ordering: assert top-10 by descending spend

**Integration tests (API):**
- GET /spend/kpis → 200, correct schema
- GET /spend/trend → 200, 12 entries
- GET /spend/top-suppliers → 200, len ≤ 10

**Frontend tests (RTL):**
- renders 7 KPI cards when data loads
- shows skeleton when loading
- ExecutiveSummary renders Ignite summary text

**E2E (Playwright):**
- Login → navigate to /dashboard → assert KPI values visible`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0.0   | 2025-01-01 | Initial release — Phase 1 platform foundation |`
      },
    ],
  },
  {
    id: 'intelligent-data-engine',
    title: 'Intelligent Data Engine (IDE)',
    icon: <CloudUploadIcon />,
    category: 'Data Management',
    phase: 1,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
    summary: 'Universal AI-powered data ingestion pipeline that validates, cleanses, normalises, and enriches procurement data from any file format.',
    tags: ['Upload', 'ETL', 'Validation', 'AI', 'Data Quality', 'XLSX', 'CSV'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `The IDE solves the #1 procurement data challenge: inconsistent, messy, multi-format source data. Instead of requiring perfectly formatted uploads, the IDE applies 8 intelligent pipeline stages to automatically detect, correct, and explain every transformation.

**Business value:**
- Eliminates manual data cleaning that consumes 60%+ of procurement analyst time
- Supports real-world data (typos, merged cells, inconsistent supplier names, mixed currencies)
- Generates a Data Health Score (0–100) so data consumers understand confidence level
- Provides a full correction report — every change is transparent and auditable`
      },
      {
        id: 'functional-requirements', title: 'Functional Requirements', content: `**FR-IDE-001**: Accept file uploads: XLSX, XLS, CSV, PDF, DOCX, JSON, XML (max 50MB).

**FR-IDE-002**: Execute 8-stage pipeline: Parse → Validate Schema → Detect Missing Values → Detect Duplicates → Normalize Suppliers → Standardize Currencies → Standardize Dates → Generate Health Score.

**FR-IDE-003**: Map arbitrary column names to canonical model (po_number, supplier_name, amount, date, cost_center) using keyword matching + Ignite AI fallback.

**FR-IDE-004**: Standardize supplier names: lowercase, strip punctuation, deduplicate fuzzy matches within ±80% Jaro-Winkler similarity.

**FR-IDE-005**: Convert all currency amounts to base currency (USD) using configured FX rates.

**FR-IDE-006**: Return real-time pipeline progress via polling endpoint. Frontend polls every 2s.

**FR-IDE-007**: Generate a correction report listing: stage, description, affected_rows, action taken.

**FR-IDE-008**: Continue processing on non-fatal errors (quarantine bad rows, report them, continue with clean rows).`
      },
      {
        id: 'pipeline-stages', title: 'Pipeline Stages', content: `| Stage | Name | Description |
|-------|------|-------------|
| 1 | Parse | Detect file format, extract raw rows, handle encodings |
| 2 | Schema Validation | Check required columns present, infer types |
| 3 | Column Mapping | Map source columns to canonical model via AI/keyword |
| 4 | Missing Value Detection | Flag nulls in critical fields, impute where safe |
| 5 | Duplicate Detection | Identify exact + near-duplicate rows (same PO+supplier+amount+date) |
| 6 | Supplier Normalisation | Fuzzy-match and canonicalise supplier names |
| 7 | Currency Standardisation | Convert all amounts to USD |
| 8 | Date Standardisation | Parse and normalise date formats to ISO 8601 |
| 9 | Health Scoring | Compute weighted composite score (0–100) |`
      },
      {
        id: 'api-design', title: 'API Design', content: `**POST /api/v1/ide/upload**
Accepts: multipart/form-data (file). Returns: { ingestion_id: UUID, status: "pending" }. Launches async Celery task.

**GET /api/v1/ide/status/{ingestion_id}**
Returns: IngestionRun object including pipeline_stages progress array.

**GET /api/v1/ide/history?limit=20**
Returns: paginated list of past ingestion runs.

**GET /api/v1/ide/{ingestion_id}/report**
Returns: full correction report JSON.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-01 | Initial release — Phase 1       |`
      },
    ],
  },
  {
    id: 'contract-intelligence',
    title: 'Contract Intelligence',
    icon: <DescriptionIcon />,
    category: 'Contract Management',
    phase: 2,
    version: '1.0.0',
    lastUpdated: '2025-01-02',
    summary: 'AI-powered contract lifecycle management — tracks expiry, analyses clauses, quantifies risk, and generates renewal recommendations.',
    tags: ['Contracts', 'Risk', 'AI', 'Clauses', 'Expiry', 'Renewal'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `Contract Intelligence transforms passive contract repositories into active risk management tools. By continuously monitoring contract status, extracting risk clauses, and alerting procurement teams well before expiry, the module prevents costly contract lapses and unfavourable auto-renewals.

**Business value:**
- Prevent revenue-impacting supply disruptions from unnoticed contract expirations
- Surface high-risk clauses (liability caps, auto-renewal traps, price escalation triggers)
- Quantify total contracted spend under management vs. maverick spend
- Enable proactive renewal negotiations with AI-generated leverage analysis`
      },
      {
        id: 'functional-requirements', title: 'Functional Requirements', content: `**FR-CI-001**: Display contract list with status badges: Active, Expiring Soon (≤30 days), Expired, Draft, Terminated.

**FR-CI-002**: Compute contract KPIs: Total Contract Value, Active Count, Expiring Count, Avg Days to Expiry, Coverage %.

**FR-CI-003**: Render 12-month expiry timeline chart (bar chart showing contracts expiring by month).

**FR-CI-004**: Ignite AI contract analysis: extract payment terms, liability clauses, price escalation, termination rights, auto-renewal provisions.

**FR-CI-005**: Days-to-expiry column in table with colour coding (red < 30d, amber < 90d, green > 90d).

**FR-CI-006**: Support PDF/DOCX contract upload for clause extraction via Ignite.`
      },
      {
        id: 'database-design', title: 'Database Design', content: `**contracts table:**
\`\`\`
id              UUID PK
tenant_id       VARCHAR(36) INDEX
supplier_id     UUID FK
supplier_name   VARCHAR(255)
title           VARCHAR(512)
start_date      DATE
end_date        DATE
value_usd       DECIMAL(20,2)
status          VARCHAR(30)  -- active|expiring_soon|expired|draft|terminated
document_path   VARCHAR(512)
extracted_clauses  JSON  -- [{type, text, risk_flag, risk_reason}]
created_at      TIMESTAMPTZ
\`\`\`

**Status auto-computation:** The service re-evaluates status on every read:
- end_date ≤ today → expired
- end_date ≤ today+30 → expiring_soon
- Otherwise: active`
      },
      {
        id: 'ai-logic', title: 'Ignite AI Logic', content: `**Contract Analysis Prompt Template:**

> "Analyse this procurement contract and extract:
> 1. Payment terms (net days, early payment discount)
> 2. Price escalation clauses (CPI-linked, fixed %)
> 3. Auto-renewal provisions
> 4. Liability and indemnification caps
> 5. Termination rights (for cause, for convenience, notice period)
> Respond in JSON format with risk_flag (low/medium/high) for each clause."

**Risk scoring:** Clauses flagged high = contract risk score +30pts, medium = +15pts, low = +5pts. Score normalised to 0–100.

**Recommendations:** Ignite generates a 2-sentence renewal recommendation based on supplier risk score, spend volume, and clause risk.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-02 | Initial release — Phase 2       |`
      },
    ],
  },
  {
    id: 'supplier-risk-assessment',
    title: 'Supplier Risk Assessment',
    icon: <WarningIcon />,
    category: 'Risk Management',
    phase: 2,
    version: '1.0.0',
    lastUpdated: '2025-01-02',
    summary: 'Multi-dimensional supplier risk scoring across financial stability, geographic exposure, ESG compliance, and operational resilience.',
    tags: ['Risk', 'Supplier', 'ESG', 'Financial', 'Geographic', 'Compliance'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `Supplier disruptions are among the costliest procurement events. The Supplier Risk Assessment module provides a continuous, quantified view of supplier risk across five dimensions — enabling procurement teams to act before disruption occurs.

**Business value:**
- Prevent supply chain disruptions from financially unstable or geopolitically exposed suppliers
- Meet ESG/sustainability procurement mandates with scored compliance tracking
- Prioritise supplier development efforts on highest-risk relationships
- Support board-level supply chain risk reporting with auditable scores`
      },
      {
        id: 'risk-dimensions', title: 'Risk Dimensions', content: `| Dimension | Weight | Description |
|-----------|--------|-------------|
| Financial Stability | 30% | Payment history, concentration risk, spend volatility |
| Geographic / Political | 25% | Country risk index, single-country dependency |
| ESG Compliance | 20% | Environmental certifications, labour practices flags |
| Operational Resilience | 15% | Delivery performance, quality incidents, lead time variance |
| Regulatory Compliance | 10% | Sanctions screening, certification expiry, audit results |

**Composite Score:** Weighted average. 0–30 = Critical, 31–50 = High, 51–70 = Medium, 71–100 = Low.

**Score computation:** Python service generates scores using seeded heuristics. Phase 5 will integrate real third-party data feeds (Dun & Bradstreet, Refinitiv).`
      },
      {
        id: 'api-design', title: 'API Design', content: `**GET /api/v1/risk/suppliers?page&page_size&risk_level**
Returns paginated list of suppliers with composite risk scores.

**GET /api/v1/risk/supplier/{supplier_id}**
Returns full risk profile: all dimension scores, risk factors, trend (12 months), recommendations.

**GET /api/v1/risk/summary**
Returns fleet-level risk KPIs: count by risk level, average composite score.

**GET /api/v1/risk/country-map**
Returns country-level risk aggregation for geographic heat map.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-02 | Initial release — Phase 2       |`
      },
    ],
  },
  {
    id: 'savings-opportunity-engine',
    title: 'Savings Opportunity Engine',
    icon: <SavingsIcon />,
    category: 'Value Optimisation',
    phase: 2,
    version: '1.0.0',
    lastUpdated: '2025-01-02',
    summary: 'AI-driven identification and prioritisation of procurement savings opportunities across five categories with effort/impact scoring.',
    tags: ['Savings', 'AI', 'Consolidation', 'Negotiation', 'Optimisation'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `The Savings Opportunity Engine transforms spend data into a prioritised savings pipeline. By applying AI pattern recognition to spending patterns, supplier relationships, and contract terms, it surfaces opportunities that manual analysis would miss.

**Opportunity types identified:**
1. **Consolidation** — fragmented spending across similar suppliers that can be merged for volume discounts
2. **Renegotiation** — contracts approaching renewal where market rates suggest leverage
3. **Tail Spend Reduction** — below-threshold transactions with qualified catalogued alternatives
4. **Contract Compliance** — off-contract spending leaking to non-preferred suppliers
5. **Substitution** — equivalent products/services available at significantly lower cost`
      },
      {
        id: 'ai-logic', title: 'AI Scoring Logic', content: `**Confidence score algorithm:**

For each opportunity type, Ignite evaluates:
- Spend volume (higher = more confident, more impactful)
- Supplier count in category (more = higher consolidation confidence)
- Price variance across suppliers in same commodity code
- Contract coverage gap (% of spend without active contract)
- Historical realisation rate for similar opportunities

**Effort scoring:**
- Low: Catalogue switch, policy enforcement
- Medium: Supplier negotiation, new RFP
- High: Market disruption, new supplier qualification

**Impact scoring (1–5):**
> impact = log10(estimated_value_usd) × confidence`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-02 | Initial release — Phase 2       |`
      },
    ],
  },
  {
    id: 'procurement-health-score',
    title: 'Procurement Health Score',
    icon: <FavoriteIcon />,
    category: 'Performance Management',
    phase: 2,
    version: '1.0.0',
    lastUpdated: '2025-01-02',
    summary: 'Composite A–F grade procurement maturity index across 6 dimensions: Spend Control, Supplier, Contract, Risk, Savings, Process.',
    tags: ['Health', 'Score', 'Maturity', 'KPI', 'Benchmark'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `The Procurement Health Score provides a single, defensible number representing overall procurement function maturity. It enables CPOs to track improvement over time, benchmark against industry peers, and justify investment in procurement transformation programmes.`
      },
      {
        id: 'dimensions', title: 'Scoring Dimensions', content: `| Dimension | Weight | Metrics Included |
|-----------|--------|------------------|
| Spend Control | 20% | Contracted spend %, tail spend %, PO compliance rate |
| Supplier Performance | 20% | On-time delivery, quality score, relationship diversification |
| Contract Compliance | 20% | Contract coverage %, expiry risk, clause compliance |
| Risk Management | 15% | Supplier risk distribution, concentration risk |
| Savings Realisation | 15% | Savings identified vs realised, opportunity pipeline value |
| Process Efficiency | 10% | PO cycle time, approval lead time, invoice processing speed |

**Grade bands:** A (85–100), B (70–84), C (55–69), D (40–54), F (< 40)

**Benchmark:** Industry peer average stored as static config (configurable in Settings). Delta from benchmark shown as ±N points.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-02 | Initial release — Phase 2       |`
      },
    ],
  },
  {
    id: 'what-if-analysis',
    title: 'What-if Analysis',
    icon: <CompareArrowsIcon />,
    category: 'Strategic Planning',
    phase: 3,
    version: '1.0.0',
    lastUpdated: '2025-01-03',
    summary: 'Interactive scenario modelling — adjust 5 procurement levers to simulate savings impact and receive Ignite AI strategic recommendations.',
    tags: ['Scenario', 'Modelling', 'Savings', 'Simulation', 'Strategy'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `What-if Analysis enables procurement teams to model the financial impact of strategic interventions before committing resources. By simulating scenarios such as "What if we consolidate 30% of tail spend?" or "What if we renegotiate our top 5 supplier contracts?", teams can prioritise highest-ROI initiatives with confidence.`
      },
      {
        id: 'levers', title: 'Scenario Levers', content: `| Lever | Range | Calculation |
|-------|-------|-------------|
| Supplier Consolidation | 0–50% | % of multi-supplier categories to consolidate |
| Contract Renegotiation | 0–20% | Expected discount on renegotiated contract values |
| Tail Spend Reduction | 0–80% | % of tail spend to eliminate or catalogue |
| Payment Term Optimisation | 0–5% | Early payment discount rate to capture |
| Compliance Improvement | 0–100% | % of off-contract spend to redirect on-contract |

**ROI formula:**
\`\`\`
roi_ratio = total_savings / (implementation_cost_estimate × 0.1)
payback_months = (implementation_cost × 0.1) / (total_savings / 12)
\`\`\`

**Presets:** Aggressive (max levers), Conservative (20%), Quick Win (high-confidence only), Compliance-Focused.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-03 | Initial release — Phase 3       |`
      },
    ],
  },
  {
    id: 'spend-forecasting',
    title: 'Spend Forecasting',
    icon: <TrendingUpIcon />,
    category: 'Predictive Analytics',
    phase: 3,
    version: '1.0.0',
    lastUpdated: '2025-01-03',
    summary: 'Double exponential smoothing spend forecast with seasonal adjustment, 80% confidence intervals, and Ignite-generated narrative.',
    tags: ['Forecast', 'Prediction', 'Trend', 'Budget', 'Planning'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `Spend Forecasting enables procurement teams and CFOs to anticipate future procurement costs with confidence. By combining statistical time series methods with seasonal purchasing patterns, the module provides defensible budget estimates that can be directly incorporated into planning cycles.`
      },
      {
        id: 'algorithm', title: 'Forecast Algorithm', content: `**Method:** Holt's Double Exponential Smoothing (Holt's Linear Trend)

Parameters:
- α (level smoothing) = 0.3
- β (trend smoothing) = 0.1
- Seasonal adjustment: 12-month multiplicative factors computed from historical monthly averages

**Confidence intervals (80%):**
\`\`\`
interval_width = 1.28 × std_dev(residuals) × sqrt(h)
lower = forecast - interval_width
upper = forecast + interval_width
\`\`\`
where h = forecast horizon step.

**Accuracy metrics:** MAE (Mean Absolute Error), MAPE (Mean Absolute Percentage Error) computed on last 3-month holdout.

**Phase 5 enhancement:** Prophet (Facebook) or SARIMA for higher-frequency data.`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-03 | Initial release — Phase 3       |`
      },
    ],
  },
  {
    id: 'executive-reporting',
    title: 'Executive Reporting',
    icon: <AssessmentIcon />,
    category: 'Reporting',
    phase: 3,
    version: '1.0.0',
    lastUpdated: '2025-01-03',
    summary: 'AI-generated board-ready procurement reports with live data assembly, customisable module selection, and HTML/PDF export.',
    tags: ['Report', 'Export', 'PDF', 'Board', 'Executive', 'Ignite'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `Executive Reporting eliminates the 4–8 hours per week procurement teams spend manually assembling board reports. Ignite pulls live data from all active modules, generates a narrative, and renders a print-ready HTML report in under 30 seconds.`
      },
      {
        id: 'workflow', title: 'Generation Workflow', content: `1. User selects modules to include (up to 8 checkboxes)
2. User sets date range and adds optional custom notes
3. Frontend calls POST /api/v1/reports/generate
4. Backend calls each selected module's service for live data
5. Ignite generates a 2-paragraph executive narrative via watsonx
6. Report renderer assembles HTML: cover page → executive summary → KPI grid → module sections → appendix
7. report_id returned, frontend polls GET /reports/{id}/status
8. On completion, GET /reports/{id}/html returns full HTML
9. Rendered in sandboxed iframe with Print button (window.print())
10. Download button saves HTML file locally`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                         |
|---------|------------|---------------------------------|
| 1.0.0   | 2025-01-03 | Initial release — Phase 3       |`
      },
    ],
  },
  {
    id: 'ignite-ai',
    title: 'Ignite AI Assistant',
    icon: <AutoAwesomeIcon />,
    category: 'AI',
    phase: 1,
    version: '3.0.0',
    lastUpdated: '2025-01-03',
    summary: 'IBM watsonx-powered AI procurement advisor with tool dispatch, conversation memory, WebSocket streaming, and domain-specific knowledge.',
    tags: ['AI', 'watsonx', 'Chat', 'Advisor', 'Ignite', 'NLP', 'Streaming'],
    sections: [
      {
        id: 'business-purpose', title: 'Business Purpose', content: `Ignite is not a general chatbot — it is a domain-specific AI Procurement Advisor trained to understand procurement data, strategy, and best practices. It can answer questions about your actual data, generate reports, compare suppliers, model scenarios, and explain its reasoning with data citations.

**Capabilities:**
- Natural language querying of live procurement data
- Contextual recommendations based on current portfolio state
- Executive summary generation for any module
- Supplier comparison and evaluation assistance
- Contract risk explanation in plain English
- What-if scenario narration
- Proactive anomaly detection and alerting`
      },
      {
        id: 'architecture', title: 'Architecture', content: `**v3 Orchestrator (Phase 3+):**

1. **Tool Registry:** 6 registered tools — get_spend_summary, get_supplier_risk, get_savings_opportunities, get_contracts, get_health_score, get_forecast
2. **Conversation Memory:** Last N turns (configurable, default 10) stored in-process (Phase 5: Redis)
3. **Tool Dispatch:** Ignite detects intent from user message, selects tool(s), calls live DB via service layer, formats response
4. **watsonx Integration:** Primary inference via IBM Granite 13B Chat. Bearer token authentication.
5. **Ollama Fallback:** If watsonx unavailable, routes to local Ollama (llama3/mistral)
6. **WebSocket Streaming:** Token-by-token streaming via /api/v1/ignite/stream?token=JWT
7. **REST Fallback:** /api/v1/ignite/chat for environments without WebSocket support`
      },
      {
        id: 'prompt-engineering', title: 'Prompt Engineering', content: `**System prompt (ProcurementAdvisorSystem):**

> "You are Ignite, an AI Procurement Advisor for ProcureIQ. You have access to real-time procurement data. You are concise, data-driven, and always cite specific numbers from the data provided. When you identify a risk or opportunity, explain the business impact first, then the data evidence, then a specific recommended action. Never speculate without data."

**Tool call format:**
\`\`\`
[TOOL_CALL: get_spend_summary]
[TOOL_RESULT: {"total_spend": 45000000, ...}]
[ASSISTANT: Based on your spend data...]
\`\`\`

**Temperature:** 0.3 (factual, consistent responses)
**Max tokens:** 1024 per response`
      },
      {
        id: 'version-history', title: 'Version History', content: `| Version | Date       | Changes                                                          |
|---------|------------|------------------------------------------------------------------|
| 1.0.0   | 2025-01-01 | REST API, basic prompt, watsonx + Ollama                        |
| 2.0.0   | 2025-01-02 | WebSocket streaming, tool dispatch, 6 live tools                |
| 3.0.0   | 2025-01-03 | Conversation memory, structured fallback, offline mode           |`
      },
    ],
  },
];

// ── Helper: Markdown-ish renderer ─────────────────────────────────────────────

function DocContent({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <Box>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <Typography key={i} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>{line.slice(3)}</Typography>;
        if (line.startsWith('**') && line.endsWith('**')) return <Typography key={i} sx={{ fontWeight: 700, mb: 0.5 }}>{line.slice(2, -2)}</Typography>;
        if (line.startsWith('| ')) {
          // Table row
          const cells = line.split('|').filter(c => c.trim());
          const isHeader = lines[i + 1]?.includes('|---');
          const isSeparator = line.includes('|---');
          if (isSeparator) return null;
          return (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, borderBottom: '1px solid #e0e0e0', py: 0.5 }}>
              {cells.map((cell, j) => (
                <Typography key={j} sx={{ fontSize: 13, fontWeight: isHeader ? 700 : 400, px: 1, color: isHeader ? '#161616' : '#525252' }}>
                  {cell.trim()}
                </Typography>
              ))}
            </Box>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.25 }}>
            <Typography sx={{ color: '#0f62fe', fontSize: 13 }}>•</Typography>
            <Typography sx={{ fontSize: 13, color: '#525252' }}>{line.slice(2)}</Typography>
          </Box>
        );
        if (line.startsWith('```')) return null;
        if (line.trim() === '') return <Box key={i} sx={{ mb: 1 }} />;
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <Typography key={i} sx={{ fontSize: 13.5, lineHeight: 1.7, color: '#525252', mb: 0.25 }}>
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#161616' }}>{part}</strong> : part)}
          </Typography>
        );
      })}
    </Box>
  );
}

// ── Doc Viewer ──────────────────────────────────────────────────────────────

function DocViewer({ doc, onBack }: { doc: ModuleDoc; onBack: () => void }) {
  const [activeSection, setActiveSection] = useState(doc.sections[0]?.id ?? '');
  const [, setOpenSections] = useState<Set<string>>(new Set([doc.sections[0]?.id ?? '']));

  const section = doc.sections.find(s => s.id === activeSection);

  const toggleSection = (id: string) => {
    if (activeSection === id) return;
    setActiveSection(id);
    setOpenSections(s => { const n = new Set(s); n.add(id); return n; });
  };

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={onBack} sx={{ color: '#525252', fontWeight: 400 }}>
          Documentation Center
        </Button>
        <Typography color="text.secondary" sx={{ fontSize: 13 }}>›</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{doc.title}</Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Sidebar nav */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ position: 'sticky', top: 16 }}>
            <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
              <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contents
              </Typography>
            </Box>
            <List dense disablePadding>
              {doc.sections.map(s => (
                <ListItem key={s.id} disablePadding>
                  <ListItemButton
                    selected={activeSection === s.id}
                    onClick={() => toggleSection(s.id)}
                    sx={{
                      py: 1, px: 2, fontSize: 13,
                      '&.Mui-selected': { bgcolor: '#eff4ff', color: '#0f62fe', fontWeight: 700 },
                      '&.Mui-selected:hover': { bgcolor: '#d0e2ff' },
                    }}
                  >
                    <ListItemText
                      primary={s.title}
                      primaryTypographyProps={{ fontSize: 13, fontWeight: activeSection === s.id ? 700 : 400 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Content area */}
        <Grid item xs={12} md={9}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            {/* Module header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Box sx={{ width: 48, height: 48, bgcolor: '#eff4ff', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f62fe', flexShrink: 0 }}>
                {doc.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{doc.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{doc.summary}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Phase ${doc.phase}`} size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />
                  <Chip label={`v${doc.version}`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  <Chip label={doc.category} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Updated: {doc.lastUpdated}</Typography>
                </Box>
              </Box>
              <Button
                size="small"
                startIcon={<PrintIcon />}
                variant="outlined"
                onClick={() => window.print()}
                sx={{ flexShrink: 0 }}
              >
                Print
              </Button>
            </Box>

            {/* Section content */}
            {section && (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#0f62fe', fontSize: 15 }}>
                  {section.title}
                </Typography>
                <DocContent content={section.content} />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Category badges ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Analytics': '#0f62fe',
  'Data Management': '#007d79',
  'Contract Management': '#6929c4',
  'Risk Management': '#da1e28',
  'Value Optimisation': '#198038',
  'Performance Management': '#f1c21b',
  'Strategic Planning': '#ee5396',
  'Predictive Analytics': '#0072c3',
  'Reporting': '#8a3ffc',
  'AI': '#ff7eb6',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentationPage() {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ModuleDoc | null>(null);

  const categories = useMemo(() => [...new Set(DOCS.map(d => d.category))], []);

  const filtered = useMemo(() => {
    return DOCS.filter(doc => {
      const q = search.toLowerCase();
      const matchSearch = !q || doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.tags.some(t => t.toLowerCase().includes(q));
      const matchPhase = !phaseFilter || doc.phase === phaseFilter;
      const matchCat = !categoryFilter || doc.category === categoryFilter;
      return matchSearch && matchPhase && matchCat;
    });
  }, [search, phaseFilter, categoryFilter]);

  if (selectedDoc) {
    return <DocViewer doc={selectedDoc} onBack={() => setSelectedDoc(null)} />;
  }

  return (
    <Box>
      <ExecutiveSummary
        title="Documentation Center"
        summary="Comprehensive technical and business documentation for all ProcureIQ modules. Each document covers business purpose, functional requirements, UI specification, database design, API design, AI logic, and test strategy."
        highlights={[
          `${DOCS.length} module documents`,
          'Phase 1–3 coverage',
          'Technical + business specs',
          'Print-ready format',
        ]}
        isLoading={false}
      />

      {/* Search and filters */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search documentation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#525252' }} /></InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {[1, 2, 3].map(p => (
                <Chip
                  key={p}
                  label={`Phase ${p}`}
                  size="small"
                  onClick={() => setPhaseFilter(phaseFilter === p ? null : p)}
                  color={phaseFilter === p ? 'primary' : 'default'}
                  variant={phaseFilter === p ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer', fontSize: 12 }}
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <Chip
                  key={c}
                  label={c}
                  size="small"
                  onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: 11,
                    bgcolor: categoryFilter === c ? CATEGORY_COLORS[c] : undefined,
                    color: categoryFilter === c ? '#fff' : undefined,
                    borderColor: CATEGORY_COLORS[c],
                    border: '1px solid',
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>

        {(search || phaseFilter || categoryFilter) && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {filtered.length} of {DOCS.length} documents
            </Typography>
            <Button
              size="small"
              onClick={() => { setSearch(''); setPhaseFilter(null); setCategoryFilter(null); }}
              sx={{ fontSize: 11, py: 0.25 }}
            >
              Clear filters
            </Button>
          </Box>
        )}
      </Box>

      {/* Document cards */}
      {filtered.length === 0 ? (
        <Alert severity="info">No documents match your search. Try different keywords or clear filters.</Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(doc => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.12)', transform: 'translateY(-2px)' },
                }}
              >
                <CardActionArea
                  onClick={() => setSelectedDoc(doc)}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 2 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, width: '100%' }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: '#f4f4f4', color: CATEGORY_COLORS[doc.category] ?? '#0f62fe', flexShrink: 0,
                    }}>
                      {doc.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, mb: 0.25 }}>{doc.title}</Typography>
                      <Typography variant="caption" sx={{ color: CATEGORY_COLORS[doc.category] ?? '#525252', fontWeight: 600 }}>{doc.category}</Typography>
                    </Box>
                    <Chip label={`P${doc.phase}`} size="small" color="primary" variant="outlined" sx={{ fontSize: 10, flexShrink: 0 }} />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5, lineHeight: 1.5, mb: 1.5, flex: 1 }}>
                    {doc.summary}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {doc.tags.slice(0, 4).map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    ))}
                    {doc.tags.length > 4 && (
                      <Chip label={`+${doc.tags.length - 4}`} size="small" sx={{ fontSize: 10, height: 20 }} />
                    )}
                  </Box>

                  <Divider sx={{ width: '100%', mb: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="caption" color="text.secondary">{doc.sections.length} sections</Typography>
                    <Typography variant="caption" color="text.secondary">v{doc.version} · {doc.lastUpdated}</Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Quick stats footer */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Modules', value: DOCS.length },
          { label: 'Total Sections', value: DOCS.reduce((a, d) => a + d.sections.length, 0) },
          { label: 'Phase 1 Docs', value: DOCS.filter(d => d.phase === 1).length },
          { label: 'Phase 2 Docs', value: DOCS.filter(d => d.phase === 2).length },
          { label: 'Phase 3 Docs', value: DOCS.filter(d => d.phase === 3).length },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#0f62fe' }}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
