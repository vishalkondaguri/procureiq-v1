import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, IconButton, Slider, Tooltip, Chip, LinearProgress,
  Dialog, DialogContent, Button, CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import DownloadIcon from '@mui/icons-material/Download';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

// ── Slide Data ────────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  moduleNum: number;
  title: string;
  tagline: string;
  category: string;
  color: string;
  accent: string;
  features: string[];
  narration: string;
  visual: 'dashboard' | 'dataengine' | 'tailspend' | 'supplier360' | 'contract' |
          'risk' | 'pareto' | 'savings' | 'health' | 'payment' | 'whatif' |
          'forecast' | 'reporting' | 'docs' | 'settings' | 'ignite' | 'title';
}

const SLIDES: Slide[] = [
  {
    id: 'title',
    moduleNum: 0,
    title: 'ProcureIQ v1.0',
    tagline: 'Transforming Procurement Data into Intelligent Decisions',
    category: 'IBM watsonx Challenge',
    color: '#001d6c',
    accent: '#0f62fe',
    features: [
      '16 enterprise modules',
      'AI-powered by IBM watsonx',
      'Ignite — Your AI Procurement Advisor',
      'Real-time analytics & forecasting',
      'End-to-end procurement intelligence',
    ],
    narration: 'Welcome to ProcureIQ version 1.0 — Transforming Procurement Data into Intelligent Decisions. This platform is built for the IBM watsonx Challenge, featuring 16 enterprise modules powered by IBM watsonx AI. Let me walk you through every module.',
    visual: 'title',
  },
  {
    id: 'dashboard',
    moduleNum: 1,
    title: 'Executive Command Center',
    tagline: 'Your procurement health at a glance — in under 60 seconds.',
    category: 'Analytics',
    color: '#0f62fe',
    accent: '#0043ce',
    features: [
      'Real-time KPI tiles: Total Spend, Savings, Supplier Count',
      'Spend trend charts with AI anomaly detection',
      'Category breakdown Treemap & Pie charts',
      'Ignite AI daily briefing & smart recommendations',
      'Top supplier leaderboard with risk scores',
    ],
    narration: 'The Executive Command Center is the primary landing page for procurement leaders. It aggregates the most critical procurement signals — total spend, savings achieved, active contracts, and supplier count — into a single scannable view, enabling decisions in under 60 seconds.',
    visual: 'dashboard',
  },
  {
    id: 'data-engine',
    moduleNum: 2,
    title: 'Intelligent Data Engine',
    tagline: 'Universal data ingestion with AI-powered validation and cleansing.',
    category: 'Data Management',
    color: '#6929c4',
    accent: '#491d8b',
    features: [
      'Supports Excel, CSV, PDF, DOCX, JSON, XML',
      'AI column mapping to universal procurement schema',
      'Detects duplicates, missing values, inconsistencies',
      'Standardises currencies and date formats',
      'Generates Data Health Score with explanation',
    ],
    narration: 'The Intelligent Data Engine is the backbone of ProcureIQ. It accepts files in any format — Excel, CSV, PDF, Word, JSON or XML — and uses AI to map columns to a standard schema, detect data quality issues, standardise currencies and dates, and produce a Data Health Score.',
    visual: 'dataengine',
  },
  {
    id: 'tail-spend',
    moduleNum: 3,
    title: 'Tail Spend Intelligence',
    tagline: 'Identify, consolidate and eliminate low-value fragmented spend.',
    category: 'Analytics',
    color: '#0f62fe',
    accent: '#0043ce',
    features: [
      'Tail spend threshold configuration & auto-classification',
      'Supplier consolidation opportunity ranking',
      'Category rationalisation recommendations',
      'Tail spend trend analysis over 12 months',
      'Ignite savings potential estimate',
    ],
    narration: 'Tail Spend Intelligence surfaces the hidden procurement waste that affects most organisations. Typically 80% of suppliers account for only 20% of spend. This module identifies those fragmented purchases, ranks consolidation opportunities, and gives Ignite AI estimates for achievable savings.',
    visual: 'tailspend',
  },
  {
    id: 'supplier-360',
    moduleNum: 4,
    title: 'Supplier 360',
    tagline: 'A complete, living profile for every supplier in your portfolio.',
    category: 'Analytics',
    color: '#005d5d',
    accent: '#004144',
    features: [
      'Unified supplier profile: spend, contracts, performance',
      'ESG scoring — Environmental, Social, Governance',
      'Payment history & DPO trend analysis',
      'Risk profile with geopolitical exposure',
      'Side-by-side supplier comparison tool',
    ],
    narration: 'Supplier 360 gives procurement teams a comprehensive, living profile for every supplier. It combines spend history, contract coverage, performance scores, ESG ratings, payment behaviour, and risk signals into one unified view — enabling truly informed supplier relationship management.',
    visual: 'supplier360',
  },
  {
    id: 'contracts',
    moduleNum: 5,
    title: 'Contract Intelligence',
    tagline: 'Never miss a renewal. Never overlook a risk clause.',
    category: 'Contract Management',
    color: '#9f1853',
    accent: '#740937',
    features: [
      'Contract lifecycle timeline with milestone alerts',
      'AI clause risk detection & scoring',
      'Expiry pipeline with days-remaining countdown',
      'Savings captured vs committed tracking',
      'Contract coverage vs un-contracted spend gap',
    ],
    narration: 'Contract Intelligence brings full visibility to your contract portfolio. It maps every contract lifecycle milestone, uses AI to detect risky clauses, tracks savings committed versus captured, and alerts teams before expiry windows close — eliminating costly auto-renewals and missed opportunities.',
    visual: 'contract',
  },
  {
    id: 'risk',
    moduleNum: 6,
    title: 'Supplier Risk Assessment',
    tagline: 'Proactive risk identification before disruption strikes.',
    category: 'Risk Management',
    color: '#da1e28',
    accent: '#a2191f',
    features: [
      'Multi-dimensional risk scoring: financial, geo, ESG, operational',
      'Interactive risk heatmap by supplier & category',
      'Procurement Maturity Scorecard (CMMI-aligned)',
      'Risk trend monitoring over rolling 6 months',
      'Ignite mitigation strategy recommendations',
    ],
    narration: 'Supplier Risk Assessment provides a multi-dimensional view of supply chain risk. Financial health, geographic concentration, ESG compliance, and operational dependency are all scored and visualised in an interactive heatmap. Ignite proactively recommends mitigation strategies before disruption occurs.',
    visual: 'risk',
  },
  {
    id: 'pareto',
    moduleNum: 7,
    title: '80/20 Pareto Analysis',
    tagline: 'Focus effort where it delivers 80% of the value.',
    category: 'Analytics',
    color: '#0f62fe',
    accent: '#0043ce',
    features: [
      'Cumulative spend concentration chart',
      'Supplier and category Pareto ranking',
      'Identifies the critical 20% driving 80% of spend',
      'Strategic vs tactical supplier segmentation',
      'Ignite AI prioritisation recommendations',
    ],
    narration: 'The 80/20 Pareto Analysis module reveals the critical concentration of procurement spend. By identifying which 20% of suppliers or categories drive 80% of total spend, procurement leaders can focus strategic effort exactly where it generates the greatest return.',
    visual: 'pareto',
  },
  {
    id: 'savings',
    moduleNum: 8,
    title: 'Savings Opportunity Engine',
    tagline: 'Identify, quantify and prioritise every savings lever.',
    category: 'Value Optimisation',
    color: '#198038',
    accent: '#0e6027',
    features: [
      '30/60/90-day savings pipeline view',
      'Opportunity scoring by effort vs impact',
      'Category-level savings benchmarking',
      'Realised vs projected savings tracking',
      'Ignite AI strategy panel with next best actions',
    ],
    narration: 'The Savings Opportunity Engine systematically identifies, quantifies, and prioritises every savings lever across your procurement portfolio. A 30-60-90 day pipeline view, effort-impact scoring matrix, and Ignite AI strategy recommendations keep savings programmes on track.',
    visual: 'savings',
  },
  {
    id: 'health',
    moduleNum: 9,
    title: 'Procurement Health Score',
    tagline: 'A single number that tells the story of procurement excellence.',
    category: 'Performance Management',
    color: '#007d79',
    accent: '#005a5a',
    features: [
      'Composite score across 6 dimensions',
      'Spend under management ratio',
      'Contract coverage, supplier diversity, savings rate',
      'Process compliance & cycle time metrics',
      'Trend vs prior quarter benchmarking',
    ],
    narration: 'The Procurement Health Score distils the performance of your entire procurement function into a single composite index. It measures spend under management, contract coverage, savings rate, supplier diversity, process compliance, and cycle time — providing an at-a-glance benchmark against best-in-class.',
    visual: 'health',
  },
  {
    id: 'payment',
    moduleNum: 10,
    title: 'Payment Analytics',
    tagline: 'Optimise payment terms to protect cash flow and supplier trust.',
    category: 'Analytics',
    color: '#0f62fe',
    accent: '#0043ce',
    features: [
      'Days Payable Outstanding (DPO) trend analysis',
      'Early payment discount opportunity tracking',
      'Working capital impact modelling',
      'Overdue invoice aging report',
      'Payment term compliance by supplier',
    ],
    narration: 'Payment Analytics gives finance and procurement teams full visibility into payment behaviour. DPO trends, early payment discount opportunities, working capital impact modelling, and overdue invoice ageing are all surfaced — enabling cash flow optimisation without damaging supplier relationships.',
    visual: 'payment',
  },
  {
    id: 'whatif',
    moduleNum: 11,
    title: 'What-if Analysis',
    tagline: 'Model procurement scenarios before committing to a decision.',
    category: 'Strategic Planning',
    color: '#6929c4',
    accent: '#491d8b',
    features: [
      'Supplier consolidation scenario modelling',
      'Price escalation & volume discount simulation',
      'Contract renegotiation impact analysis',
      'Multi-variable sensitivity sliders',
      'Ignite AI scenario comparison & recommendation',
    ],
    narration: 'What-if Analysis empowers procurement teams to test decisions safely before committing. Model supplier consolidations, simulate price escalations, project savings from renegotiations, and compare multiple scenarios side-by-side — all with Ignite AI guiding you to the optimal outcome.',
    visual: 'whatif',
  },
  {
    id: 'forecast',
    moduleNum: 12,
    title: 'Spend Forecasting',
    tagline: 'Predict future spend with AI — plan budgets with confidence.',
    category: 'Predictive Analytics',
    color: '#005d5d',
    accent: '#004144',
    features: [
      '12-month AI spend forecast by category',
      'Seasonal trend decomposition',
      'Budget vs forecast variance tracking',
      'Confidence interval bands on all projections',
      'Ignite commentary on forecast drivers',
    ],
    narration: 'Spend Forecasting uses AI time-series models to project spend 12 months ahead across every category. Seasonal decomposition, budget vs forecast variance tracking, and confidence interval bands give procurement and finance teams the data they need for accurate planning.',
    visual: 'forecast',
  },
  {
    id: 'reporting',
    moduleNum: 13,
    title: 'Executive Reporting',
    tagline: 'Board-ready procurement reports — generated in seconds.',
    category: 'Reporting',
    color: '#9f1853',
    accent: '#740937',
    features: [
      'One-click executive summary generation',
      'KPI scorecards with trend arrows',
      'Print-optimised PDF export layout',
      'Period comparison (MoM, QoQ, YoY)',
      'Ignite AI narrative generation',
    ],
    narration: 'Executive Reporting turns procurement data into polished, board-ready reports in seconds. Ignite generates the narrative, KPI scorecards show trend direction, and the one-click PDF export delivers a print-optimised layout that impresses stakeholders at every level.',
    visual: 'reporting',
  },
  {
    id: 'docs',
    moduleNum: 14,
    title: 'Documentation Center',
    tagline: 'Professional technical documentation for every module.',
    category: 'Knowledge',
    color: '#525252',
    accent: '#393939',
    features: [
      'Business purpose & functional requirements',
      'UI specification & database design',
      'API design & AI logic documentation',
      'Full test strategy for every module',
      'This very presentation — live in the app',
    ],
    narration: 'The Documentation Center provides comprehensive technical and business documentation for every ProcureIQ module. From business purpose and functional requirements through to API design, AI logic, and test strategy — all searchable, filterable, and print-ready.',
    visual: 'docs',
  },
  {
    id: 'ignite',
    moduleNum: 15,
    title: 'Ignite AI Assistant',
    tagline: 'Your AI Procurement Advisor — always on, always insightful.',
    category: 'AI',
    color: '#6929c4',
    accent: '#491d8b',
    features: [
      'Powered by IBM watsonx foundation models',
      'Procurement domain expertise built-in',
      'Voice input & text-to-speech narration',
      'Wikipedia live knowledge enrichment',
      'Context-aware per module — no generic answers',
    ],
    narration: 'Ignite is not just a chatbot — it is a genuine AI Procurement Advisor powered by IBM watsonx. With voice input, text-to-speech, Wikipedia live knowledge enrichment, and deep procurement domain expertise, Ignite provides intelligent guidance in every module of ProcureIQ.',
    visual: 'ignite',
  },
];

// ── SVG Visuals ───────────────────────────────────────────────────────────────

function SlideVisual({ type, color, accent }: { type: Slide['visual']; color: string; accent: string }) {
  const w = 420;
  const h = 260;

  if (type === 'title') {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
        <rect width={w} height={h} fill="#001d6c" rx="8" />
        <rect x="0" y="0" width={w} height="8" fill="#0f62fe" rx="4" />
        {/* IBM logo area */}
        <rect x="20" y="20" width="80" height="24" rx="4" fill="#0f62fe" opacity="0.9" />
        <text x="36" y="37" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">IBM</text>
        <text x="60" y="37" fill="#a6c8ff" fontSize="10" fontFamily="system-ui"> watsonx</text>
        {/* Decorative circles */}
        <circle cx="340" cy="60" r="50" fill="#0f62fe" opacity="0.15" />
        <circle cx="380" cy="100" r="30" fill="#6929c4" opacity="0.2" />
        <circle cx="50" cy="200" r="40" fill="#6929c4" opacity="0.12" />
        {/* Title */}
        <text x="210" y="110" fill="white" fontSize="28" fontWeight="800" textAnchor="middle" fontFamily="system-ui">ProcureIQ</text>
        <text x="210" y="135" fill="#a6c8ff" fontSize="13" textAnchor="middle" fontFamily="system-ui">v1.0</text>
        <line x1="80" y1="148" x2="340" y2="148" stroke="#0f62fe" strokeWidth="1.5" opacity="0.6" />
        <text x="210" y="170" fill="#78a9ff" fontSize="11" textAnchor="middle" fontFamily="system-ui">Transforming Procurement Data</text>
        <text x="210" y="186" fill="#78a9ff" fontSize="11" textAnchor="middle" fontFamily="system-ui">into Intelligent Decisions</text>
        {/* Module count badges */}
        {['16 Modules', 'watsonx AI', 'Ignite Advisor'].map((label, i) => (
          <g key={label}>
            <rect x={60 + i * 105} y="210" width="95" height="28" rx="14" fill="#0f62fe" opacity="0.3" />
            <text x={107.5 + i * 105} y="228" fill="white" fontSize="10" textAnchor="middle" fontFamily="system-ui">{label}</text>
          </g>
        ))}
      </svg>
    );
  }

  if (type === 'dashboard') {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
        <rect width={w} height={h} fill="#f4f4f4" rx="8" />
        {/* KPI tiles */}
        {[
          { label: 'Total Spend', val: '$24.7M', x: 10 },
          { label: 'Savings', val: '$2.1M', x: 115 },
          { label: 'Suppliers', val: '347', x: 220 },
          { label: 'Contracts', val: '128', x: 325 },
        ].map(k => (
          <g key={k.label}>
            <rect x={k.x} y="10" width="95" height="54" rx="4" fill="white" />
            <rect x={k.x} y="10" width="95" height="4" rx="2" fill={color} />
            <text x={k.x + 8} y="36" fill="#161616" fontSize="14" fontWeight="700" fontFamily="system-ui">{k.val}</text>
            <text x={k.x + 8} y="52" fill="#525252" fontSize="9" fontFamily="system-ui">{k.label}</text>
          </g>
        ))}
        {/* Trend chart */}
        <rect x="10" y="74" width="250" height="110" rx="4" fill="white" />
        <text x="18" y="89" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">Spend Trend (12 months)</text>
        <polyline points="20,165 55,155 90,145 125,140 160,130 195,120 230,110 245,100" fill="none" stroke={color} strokeWidth="2" />
        <polyline points="20,165 55,155 90,145 125,140 160,130 195,120 230,110 245,100 245,175 20,175" fill={color} opacity="0.08" />
        {/* Category pie mockup */}
        <rect x="270" y="74" width="140" height="110" rx="4" fill="white" />
        <text x="278" y="89" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">Category Spend</text>
        <circle cx="316" cy="138" r="30" fill="none" stroke={color} strokeWidth="18" strokeDasharray="60 126" />
        <circle cx="316" cy="138" r="30" fill="none" stroke={accent} strokeWidth="18" strokeDasharray="40 146" strokeDashoffset="-60" />
        <circle cx="316" cy="138" r="30" fill="none" stroke="#6929c4" strokeWidth="18" strokeDasharray="26 160" strokeDashoffset="-100" />
        {['IT', 'MRO', 'Prof.Svc'].map((lbl, i) => (
          <g key={lbl}>
            <rect x="356" y={100 + i * 16} width="8" height="8" fill={[color, accent, '#6929c4'][i]} rx="1" />
            <text x="368" y={109 + i * 16} fill="#525252" fontSize="9" fontFamily="system-ui">{lbl}</text>
          </g>
        ))}
        {/* Ignite insight */}
        <rect x="10" y="192" width="400" height="36" rx="4" fill={color} opacity="0.1" />
        <circle cx="26" cy="210" r="8" fill={color} />
        <text x="22" y="214" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">AI</text>
        <text x="40" y="206" fill="#161616" fontSize="9" fontWeight="600" fontFamily="system-ui">Ignite Insight:</text>
        <text x="40" y="220" fill="#525252" fontSize="9" fontFamily="system-ui">Tail spend ratio 34% — 3% above benchmark. Consider supplier consolidation in MRO category.</text>
      </svg>
    );
  }

  if (type === 'dataengine') {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
        <rect width={w} height={h} fill="#f4f4f4" rx="8" />
        {/* Upload zone */}
        <rect x="10" y="10" width="180" height="80" rx="4" fill="white" strokeDasharray="6 3" stroke={color} strokeWidth="1.5" />
        <text x="100" y="42" fill={color} fontSize="22" textAnchor="middle" fontFamily="system-ui">↑</text>
        <text x="100" y="58" fill="#525252" fontSize="10" textAnchor="middle" fontFamily="system-ui">Drop file or click to upload</text>
        <text x="100" y="72" fill="#8d8d8d" fontSize="9" textAnchor="middle" fontFamily="system-ui">XLSX · CSV · PDF · DOCX · JSON · XML</text>
        {/* Health score gauge */}
        <rect x="200" y="10" width="210" height="80" rx="4" fill="white" />
        <text x="210" y="28" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">Data Health Score</text>
        <rect x="210" y="35" width="190" height="12" rx="6" fill="#e0e0e0" />
        <rect x="210" y="35" width="152" height="12" rx="6" fill="#198038" />
        <text x="366" y="46" fill="#198038" fontSize="10" fontWeight="700" fontFamily="system-ui">80%</text>
        {['Duplicates: 3 removed', 'Missing values: 12 filled', 'Currency: USD normalised', 'Dates: ISO 8601 applied'].map((t, i) => (
          <text key={t} x="210" y={62 + i * 11} fill="#525252" fontSize="9" fontFamily="system-ui">✓ {t}</text>
        ))}
        {/* Column mapping */}
        <rect x="10" y="100" width="400" height="90" rx="4" fill="white" />
        <text x="18" y="116" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">AI Column Mapping</text>
        {[
          ['Source Column', 'Mapped To', 'Confidence'],
          ['Vendor Name', 'supplier_name', '98%'],
          ['Invoice Amt', 'invoice_value', '95%'],
          ['PO Date', 'order_date', '99%'],
          ['Dept Code', 'cost_centre', '87%'],
        ].map((row, i) => (
          <g key={i}>
            <rect x="12" y={120 + i * 14} width="396" height="13" rx="2" fill={i === 0 ? color : i % 2 === 0 ? '#f4f4f4' : 'white'} opacity={i === 0 ? 0.15 : 1} />
            <text x="18" y={131 + i * 14} fill={i === 0 ? color : '#161616'} fontSize="9" fontFamily="system-ui" fontWeight={i === 0 ? '600' : '400'}>{row[0]}</text>
            <text x="160" y={131 + i * 14} fill={i === 0 ? color : '#525252'} fontSize="9" fontFamily="system-ui">{row[1]}</text>
            <text x="340" y={131 + i * 14} fill={i === 0 ? color : '#198038'} fontSize="9" fontFamily="system-ui">{row[2]}</text>
          </g>
        ))}
        {/* Ignite */}
        <rect x="10" y="200" width="400" height="36" rx="4" fill={color} opacity="0.1" />
        <circle cx="26" cy="218" r="8" fill={color} />
        <text x="22" y="222" fill="white" fontSize="9" fontWeight="700" fontFamily="system-ui">AI</text>
        <text x="40" y="214" fill="#161616" fontSize="9" fontWeight="600" fontFamily="system-ui">Ignite:</text>
        <text x="40" y="228" fill="#525252" fontSize="9" fontFamily="system-ui">Detected 3 supplier name variants for "Acme Corp" — consolidated to single canonical name.</text>
      </svg>
    );
  }

  // Generic fallback visual for all other module types
  const featureItems = {
    tailspend: ['Tail Spend %', 'Consolidation Ops', 'Category Split', 'Trend 12M'],
    supplier360: ['ESG Score', 'Payment DPO', 'Risk Profile', 'Contracts'],
    contract: ['Active', 'Expiring 90d', 'Savings %', 'Coverage'],
    risk: ['Financial Risk', 'Geo Risk', 'ESG Risk', 'Op Risk'],
    pareto: ['Top 20%', 'Spend Conc.', 'Suppliers', 'Categories'],
    savings: ['Pipeline', 'Realised', 'Projected', 'Quick Wins'],
    health: ['SUM Ratio', 'Coverage', 'Diversity', 'Compliance'],
    payment: ['DPO Trend', 'Discounts', 'Overdue', 'On-time %'],
    whatif: ['Scenario A', 'Scenario B', 'Delta', 'Recommend'],
    forecast: ['12M Forecast', 'Variance', 'Confidence', 'Seasonal'],
    reporting: ['KPI Score', 'Trend', 'QoQ Delta', 'YoY Delta'],
    docs: ['Modules', 'Sections', 'API Specs', 'Test Plans'],
    settings: ['Profile', 'Integrations', 'Security', 'Audit'],
    ignite: ['Queries', 'Insights', 'Actions', 'Voice'],
  } as Record<string, string[]>;

  const items = featureItems[type] || ['KPI 1', 'KPI 2', 'KPI 3', 'KPI 4'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      <rect width={w} height={h} fill="#f4f4f4" rx="8" />
      {/* Header bar */}
      <rect x="0" y="0" width={w} height="40" rx="4" fill={color} />
      <text x="16" y="25" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">
        {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
      </text>
      {/* KPI cards */}
      {items.map((item, i) => (
        <g key={item}>
          <rect x={10 + i * 100} y="52" width="90" height="60" rx="4" fill="white" />
          <rect x={10 + i * 100} y="52" width="90" height="4" rx="2" fill={i % 2 === 0 ? color : accent} />
          <text x={55 + i * 100} y="82" fill={i % 2 === 0 ? color : accent} fontSize="16" fontWeight="700" textAnchor="middle" fontFamily="system-ui">
            {['94%', '$1.2M', '347', '82%', '18%', '128'][i] || '—'}
          </text>
          <text x={55 + i * 100} y="98" fill="#525252" fontSize="9" textAnchor="middle" fontFamily="system-ui">{item}</text>
        </g>
      ))}
      {/* Bar chart */}
      <rect x="10" y="124" width="260" height="90" rx="4" fill="white" />
      <text x="18" y="139" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">Trend Analysis</text>
      {[40, 55, 48, 65, 72, 60, 80].map((h2, i) => (
        <rect key={i} x={20 + i * 34} y={195 - h2} width="22" height={h2} rx="2" fill={i % 2 === 0 ? color : accent} opacity="0.8" />
      ))}
      {/* Side panel */}
      <rect x="280" y="124" width="130" height="90" rx="4" fill="white" />
      <text x="288" y="139" fill="#161616" fontSize="10" fontWeight="600" fontFamily="system-ui">Breakdown</text>
      {['Category A', 'Category B', 'Category C'].map((lbl, i) => (
        <g key={lbl}>
          <rect x="288" y={145 + i * 20} width={[70, 50, 35][i]} height="12" rx="2" fill={[color, accent, '#6929c4'][i]} opacity="0.7" />
          <text x="368" y={155 + i * 20} fill="#525252" fontSize="9" fontFamily="system-ui">{['42%', '31%', '27%'][i]}</text>
        </g>
      ))}
      {/* Ignite strip */}
      <rect x="10" y="222" width="400" height="28" rx="4" fill={color} opacity="0.1" />
      <circle cx="24" cy="236" r="7" fill={color} />
      <text x="21" y="240" fill="white" fontSize="8" fontWeight="700" fontFamily="system-ui">AI</text>
      <text x="36" y="233" fill="#161616" fontSize="9" fontWeight="600" fontFamily="system-ui">Ignite AI Insight</text>
      <text x="36" y="245" fill="#525252" fontSize="9" fontFamily="system-ui">Analysis complete · 3 recommendations available · Click Ignite to explore</text>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PresentationTourProps {
  open: boolean;
  onClose: () => void;
}

export default function PresentationTour({ open, onClose }: PresentationTourProps) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [narrationOn, setNarrationOn] = useState(true);
  const [rate, setRate] = useState(1.0);
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingSlide, setRecordingSlide] = useState(0);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideAreaRef = useRef<HTMLDivElement>(null);

  const slide = SLIDES[current];
  const total = SLIDES.length;

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!narrationOn || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate;
    utt.pitch = 1.0;
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  }, [narrationOn, rate]);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const SLIDE_DURATION = 18000; // ms per slide in auto-play

  const startProgress = useCallback(() => {
    setProgress(0);
    if (progressTimer.current) clearInterval(progressTimer.current);
    const step = 100 / (SLIDE_DURATION / 100);
    progressTimer.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 100));
    }, 100);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
    setProgress(0);
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const goTo = useCallback((idx: number) => {
    stopSpeech();
    if (autoTimer.current) clearTimeout(autoTimer.current);
    stopProgress();
    const clamped = Math.max(0, Math.min(idx, total - 1));
    setCurrent(clamped);
  }, [total, stopSpeech, stopProgress]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // ── Auto-play ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      stopProgress();
      return;
    }
    speak(slide.narration);
    startProgress();
    autoTimer.current = setTimeout(() => {
      if (current < total - 1) {
        setCurrent(c => c + 1);
      } else {
        setPlaying(false);
      }
    }, SLIDE_DURATION);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [playing, current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Narrate on manual navigation when not auto-playing
  useEffect(() => {
    if (!playing && open) speak(slide.narration);
  }, [current, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop everything when dialog closes
  useEffect(() => {
    if (!open) {
      stopSpeech();
      setPlaying(false);
      stopProgress();
      if (autoTimer.current) clearTimeout(autoTimer.current);
    }
  }, [open, stopSpeech, stopProgress]);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen(f => !f);
  }, [fullscreen]);

  // ── Video export — records the slide area + TTS audio into a WebM file ────────
  const downloadVideo = useCallback(async () => {
    if (recording) return;

    // Stop any current speech/playback first
    stopSpeech();
    setPlaying(false);
    if (autoTimer.current) clearTimeout(autoTimer.current);

    setRecording(true);
    setRecordingSlide(0);
    goTo(0);

    // Small delay to let the first slide render
    await new Promise(r => setTimeout(r, 400));

    const el = slideAreaRef.current;
    if (!el) { setRecording(false); return; }

    // Capture the slide area as a video stream
    let stream: MediaStream;
    try {
      // @ts-expect-error captureStream is not in TS types yet
      stream = el.closest('dialog, [role="dialog"]')?.captureStream?.()
        // @ts-expect-error
        ?? document.querySelector('.MuiDialog-paper')?.captureStream?.();
    } catch {
      stream = new MediaStream();
    }

    // Add audio from speechSynthesis via AudioContext destination
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    if (stream) {
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } else {
      stream = dest.stream;
    }

    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder | null = null;

    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        // MediaRecorder not supported — fallback: just export audio as narration script
        setRecording(false);
        alert('Video recording is not supported in your browser.\n\nUse Chrome or Edge for best results.\n\nYou can still use PDF or PPTX export.');
        return;
      }
    }

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start(200);

    // Walk through every slide with TTS narration
    const PER_SLIDE_MS = 20000;
    for (let i = 0; i < SLIDES.length; i++) {
      goTo(i);
      setRecordingSlide(i);
      await new Promise(r => setTimeout(r, 300)); // let DOM settle

      // Speak narration
      const utt = new SpeechSynthesisUtterance(SLIDES[i].narration);
      utt.rate = 0.95;
      utt.pitch = 1.0;
      utt.lang = 'en-US';
      window.speechSynthesis.speak(utt);

      // Wait for narration to finish OR max slide duration
      await new Promise<void>(resolve => {
        const timeout = setTimeout(resolve, PER_SLIDE_MS);
        utt.onend = () => { clearTimeout(timeout); setTimeout(resolve, 800); };
      });

      window.speechSynthesis.cancel();
    }

    recorder.stop();

    await new Promise(r => setTimeout(r, 500));

    // Download the recorded video
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ProcureIQ-v1.0-Presentation.webm';
    a.click();
    URL.revokeObjectURL(url);

    setRecording(false);
    goTo(0);
    audioCtx.close().catch(() => {});
  }, [recording, stopSpeech, goTo]);

  // ── PDF export ───────────────────────────────────────────────────────────────
  const downloadPDF = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>ProcureIQ v1.0 — Module Presentation</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; background: white; }
  .slide { width: 267mm; min-height: 180mm; border: 1px solid #e0e0e0; border-radius: 4px;
           page-break-after: always; display: flex; flex-direction: column;
           overflow: hidden; margin-bottom: 4mm; }
  .slide-header { padding: 10mm 12mm 6mm; }
  .slide-num { font-size: 9pt; color: #8d8d8d; margin-bottom: 2mm; }
  .slide-cat { display: inline-block; font-size: 9pt; font-weight: 600;
               padding: 1mm 3mm; border-radius: 2mm; margin-bottom: 3mm; }
  .slide-title { font-size: 20pt; font-weight: 800; color: #161616; margin-bottom: 2mm; }
  .slide-tagline { font-size: 11pt; color: #525252; margin-bottom: 4mm; }
  .slide-body { flex: 1; display: flex; gap: 8mm; padding: 0 12mm 10mm; }
  .features { flex: 1; }
  .features h3 { font-size: 10pt; font-weight: 700; color: #525252; margin-bottom: 3mm; text-transform: uppercase; letter-spacing: 0.05em; }
  .feature-item { display: flex; align-items: flex-start; gap: 2mm; margin-bottom: 2mm; font-size: 10pt; color: #161616; }
  .feature-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 1.5mm; flex-shrink: 0; }
  .narration-box { flex: 1; background: #f4f4f4; border-radius: 3mm; padding: 4mm; }
  .narration-box h3 { font-size: 9pt; font-weight: 700; color: #525252; margin-bottom: 2mm; text-transform: uppercase; }
  .narration-box p { font-size: 9.5pt; color: #393939; line-height: 1.6; }
  .footer { text-align: center; font-size: 8pt; color: #8d8d8d; padding: 3mm; border-top: 1px solid #e0e0e0; }
</style>
</head>
<body>
${SLIDES.map((s, i) => `
<div class="slide">
  <div class="slide-header" style="border-top: 5px solid ${s.color}">
    <div class="slide-num">Slide ${i + 1} of ${SLIDES.length} · ProcureIQ v1.0</div>
    <div class="slide-cat" style="background:${s.color}20; color:${s.color}">${s.category}</div>
    ${s.moduleNum > 0 ? `<div style="font-size:9pt;color:#8d8d8d;margin-bottom:1mm">Module ${s.moduleNum}</div>` : ''}
    <div class="slide-title">${s.title}</div>
    <div class="slide-tagline">${s.tagline}</div>
  </div>
  <div class="slide-body">
    <div class="features">
      <h3>Key Capabilities</h3>
      ${s.features.map(f => `<div class="feature-item"><div class="feature-dot" style="background:${s.color}"></div><span>${f}</span></div>`).join('')}
    </div>
    <div class="narration-box">
      <h3>Executive Summary</h3>
      <p>${s.narration}</p>
    </div>
  </div>
  <div class="footer">ProcureIQ v1.0 — IBM watsonx Challenge · Powered by Ignite AI</div>
</div>`).join('')}
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  }, []);

  // ── PowerPoint export ─────────────────────────────────────────────────────────
  const downloadPPTX = useCallback(async () => {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const prs = new PptxGenJS();
    prs.layout = 'LAYOUT_WIDE';
    prs.title = 'ProcureIQ v1.0 — Module Presentation';
    prs.author = 'ProcureIQ — IBM watsonx Challenge';
    prs.subject = 'Procurement Intelligence Platform';

    SLIDES.forEach((s) => {
      const slide = prs.addSlide();

      // Background
      slide.addShape(prs.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { color: 'FFFFFF' },
      });

      // Left colour bar
      slide.addShape(prs.ShapeType.rect, {
        x: 0, y: 0, w: 0.15, h: '100%',
        fill: { color: s.color.replace('#', '') },
      });

      // Header strip
      slide.addShape(prs.ShapeType.rect, {
        x: 0.15, y: 0, w: '100%', h: 1.2,
        fill: { color: s.color.replace('#', '') },
        line: { color: s.color.replace('#', ''), width: 0 },
      });

      // Module number badge
      if (s.moduleNum > 0) {
        slide.addText(`MODULE ${s.moduleNum}`, {
          x: 0.3, y: 0.08, w: 2, h: 0.25,
          fontSize: 9, color: 'FFFFFF', bold: false, italic: false,
          align: 'left', fontFace: 'Segoe UI',
        });
      }

      // Category badge
      slide.addText(s.category.toUpperCase(), {
        x: 0.3, y: 0.3, w: 3, h: 0.28,
        fontSize: 9, color: 'FFFFFF', bold: true,
        align: 'left', fontFace: 'Segoe UI',
      });

      // Title
      slide.addText(s.title, {
        x: 0.3, y: 0.55, w: 9, h: 0.5,
        fontSize: 24, color: 'FFFFFF', bold: true,
        align: 'left', fontFace: 'Segoe UI',
      });

      // IBM + ProcureIQ brand top-right
      slide.addText('ProcureIQ v1.0  |  IBM watsonx Challenge', {
        x: 6, y: 0.08, w: 3.8, h: 0.25,
        fontSize: 8, color: 'FFFFFF', align: 'right',
        fontFace: 'Segoe UI', italic: true,
      });

      // Tagline
      slide.addText(s.tagline, {
        x: 0.3, y: 1.25, w: 9.4, h: 0.4,
        fontSize: 12, color: '525252', italic: true,
        align: 'left', fontFace: 'Segoe UI',
      });

      // Divider line
      slide.addShape(prs.ShapeType.line, {
        x: 0.3, y: 1.65, w: 9.4, h: 0,
        line: { color: 'E0E0E0', width: 1 },
      });

      // Key Capabilities header
      slide.addText('KEY CAPABILITIES', {
        x: 0.3, y: 1.75, w: 4.5, h: 0.25,
        fontSize: 9, color: '8D8D8D', bold: true,
        fontFace: 'Segoe UI',
      });

      // Feature bullets
      s.features.forEach((f, fi) => {
        slide.addShape(prs.ShapeType.ellipse, {
          x: 0.3, y: 2.1 + fi * 0.42 + 0.07, w: 0.1, h: 0.1,
          fill: { color: s.color.replace('#', '') },
          line: { color: s.color.replace('#', ''), width: 0 },
        });
        slide.addText(f, {
          x: 0.5, y: 2.1 + fi * 0.42, w: 4.3, h: 0.38,
          fontSize: 11, color: '161616',
          align: 'left', fontFace: 'Segoe UI',
        });
      });

      // Right panel — narration
      slide.addShape(prs.ShapeType.rect, {
        x: 5.1, y: 1.75, w: 4.6, h: 4.4,
        fill: { color: 'F4F4F4' },
        line: { color: 'E0E0E0', width: 1 },
      });

      slide.addText('EXECUTIVE SUMMARY', {
        x: 5.2, y: 1.85, w: 4.4, h: 0.25,
        fontSize: 9, color: '8D8D8D', bold: true,
        fontFace: 'Segoe UI',
      });

      slide.addText(s.narration, {
        x: 5.2, y: 2.15, w: 4.4, h: 3.8,
        fontSize: 10.5, color: '393939',
        align: 'left', fontFace: 'Segoe UI',
        valign: 'top', wrap: true,
      });

      // Footer
      slide.addShape(prs.ShapeType.rect, {
        x: 0, y: 7.1, w: '100%', h: 0.4,
        fill: { color: 'F4F4F4' },
        line: { color: 'E0E0E0', width: 1 },
      });

      slide.addText(
        `ProcureIQ v1.0  ·  Powered by IBM watsonx & Ignite AI  ·  Slide ${SLIDES.indexOf(s) + 1} of ${SLIDES.length}`,
        {
          x: 0.2, y: 7.12, w: 9.6, h: 0.28,
          fontSize: 8, color: '8D8D8D', align: 'center',
          fontFace: 'Segoe UI',
        }
      );
    });

    await prs.writeFile({ fileName: 'ProcureIQ-v1.0-Presentation.pptx' });
  }, []);

  // ── Keyboard nav ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, next, prev, onClose]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        ref: containerRef,
        sx: {
          width: fullscreen ? '100vw' : '92vw',
          maxWidth: fullscreen ? '100vw' : '1100px',
          height: fullscreen ? '100vh' : '88vh',
          m: fullscreen ? 0 : 2,
          borderRadius: fullscreen ? 0 : 2,
          bgcolor: '#0a0a0a',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, bgcolor: '#161616', borderBottom: '1px solid #262626', gap: 1.5, flexShrink: 0 }}>
          <SlideshowIcon sx={{ color: '#0f62fe', fontSize: 20 }} />
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1 }}>
            ProcureIQ v1.0 — Module Presentation
          </Typography>
          <Typography sx={{ color: '#8d8d8d', fontSize: 12 }}>
            {current + 1} / {total}
          </Typography>
          <Tooltip title={recording ? `Recording slide ${recordingSlide + 1}/${total}…` : 'Record video with voice narration (WebM)'}>
            <IconButton size="small" onClick={downloadVideo} disabled={recording} sx={{ color: recording ? '#6929c4' : '#8d8d8d', '&:hover': { color: '#be95ff' } }}>
              {recording ? <CircularProgress size={16} sx={{ color: '#6929c4' }} /> : <VideocamIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton size="small" onClick={downloadPDF} sx={{ color: '#8d8d8d', '&:hover': { color: 'white' } }}>
              <PictureAsPdfIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PowerPoint">
            <IconButton size="small" onClick={downloadPPTX} sx={{ color: '#8d8d8d', '&:hover': { color: 'white' } }}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen} sx={{ color: '#8d8d8d', '&:hover': { color: 'white' } }}>
              {fullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" onClick={onClose} sx={{ color: '#8d8d8d', '&:hover': { color: 'white' } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Progress bar ── */}
        {playing && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 3, bgcolor: '#262626', '& .MuiLinearProgress-bar': { bgcolor: slide.color } }}
          />
        )}

        {/* ── Slide content ── */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Slide nav dots (left) */}
          <Box sx={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, gap: 0.5, overflowY: 'auto', bgcolor: '#111', flexShrink: 0, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#333' } }}>
            {SLIDES.map((s, i) => (
              <Tooltip key={s.id} title={s.title} placement="right">
                <Box
                  onClick={() => goTo(i)}
                  sx={{
                    width: 28, height: 28, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s',
                    bgcolor: i === current ? s.color : '#1a1a1a',
                    border: i === current ? `2px solid ${s.color}` : '2px solid transparent',
                    '&:hover': { bgcolor: i === current ? s.color : '#2a2a2a' },
                    flexShrink: 0,
                  }}
                >
                  <Typography sx={{ fontSize: 9, color: i === current ? 'white' : '#8d8d8d', fontWeight: 700 }}>
                    {i === 0 ? '★' : i}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>

          {/* Main slide */}
          <Box ref={slideAreaRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2.5, gap: 2, position: 'relative' }}>
            {/* Recording overlay */}
            {recording && (
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, bgcolor: '#da1e28', color: 'white', borderRadius: 1, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white', animation: 'pulse 1s infinite' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                  REC {recordingSlide + 1}/{total}
                </Typography>
              </Box>
            )}

            {/* Slide header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexShrink: 0 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={slide.category}
                    size="small"
                    sx={{ bgcolor: slide.color, color: 'white', fontSize: 10, fontWeight: 700, height: 22 }}
                  />
                  {slide.moduleNum > 0 && (
                    <Typography sx={{ color: '#8d8d8d', fontSize: 11 }}>Module {slide.moduleNum}</Typography>
                  )}
                </Box>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: { xs: 18, md: 24 }, lineHeight: 1.2, mb: 0.5 }}>
                  {slide.title}
                </Typography>
                <Typography sx={{ color: '#a8a8a8', fontSize: 13, fontStyle: 'italic' }}>
                  {slide.tagline}
                </Typography>
              </Box>
            </Box>

            {/* Slide body */}
            <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden', minHeight: 0 }}>

              {/* Left: features */}
              <Box sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
                <Typography sx={{ color: '#8d8d8d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
                  Key Capabilities
                </Typography>
                {slide.features.map((f, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: slide.color, mt: 0.7, flexShrink: 0 }} />
                    <Typography sx={{ color: '#e0e0e0', fontSize: 12, lineHeight: 1.5 }}>{f}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Centre: mock visual */}
              <Box sx={{ flex: 1, bgcolor: '#1a1a1a', borderRadius: 1.5, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${slide.color}22` }}>
                <Box sx={{ width: '100%', maxWidth: 480, maxHeight: '100%' }}>
                  <SlideVisual type={slide.visual} color={slide.color} accent={slide.accent} />
                </Box>
              </Box>

              {/* Right: narration */}
              <Box sx={{ width: 200, flexShrink: 0, bgcolor: '#1a1a1a', borderRadius: 1.5, p: 1.5, border: '1px solid #262626', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: slide.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 8, color: 'white', fontWeight: 700 }}>AI</Typography>
                  </Box>
                  <Typography sx={{ color: '#8d8d8d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ignite Narration
                  </Typography>
                </Box>
                <Typography sx={{ color: '#c6c6c6', fontSize: 11.5, lineHeight: 1.65 }}>
                  {slide.narration}
                </Typography>
              </Box>

            </Box>
          </Box>
        </Box>

        {/* ── Controls bar ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center', px: 2, py: 1,
          bgcolor: '#161616', borderTop: '1px solid #262626', gap: 1.5, flexShrink: 0, flexWrap: 'wrap',
        }}>

          {/* Playback */}
          <Tooltip title="Previous (←)">
            <span>
              <IconButton size="small" onClick={prev} disabled={current === 0} sx={{ color: current === 0 ? '#525252' : '#c6c6c6' }}>
                <SkipPreviousIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={playing ? 'Pause (Space)' : 'Auto-play (Space)'}>
            <IconButton
              size="small"
              onClick={() => setPlaying(p => !p)}
              sx={{ color: 'white', bgcolor: slide.color, width: 36, height: 36, '&:hover': { bgcolor: slide.accent } }}
            >
              {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Stop & Reset">
            <IconButton size="small" onClick={() => { setPlaying(false); goTo(0); stopSpeech(); }} sx={{ color: '#c6c6c6' }}>
              <StopIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Next (→)">
            <span>
              <IconButton size="small" onClick={next} disabled={current === total - 1} sx={{ color: current === total - 1 ? '#525252' : '#c6c6c6' }}>
                <SkipNextIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Box sx={{ width: 1, height: 28, bgcolor: '#333', mx: 0.5 }} />

          {/* Narration toggle */}
          <Tooltip title={narrationOn ? 'Mute narration' : 'Enable narration'}>
            <IconButton size="small" onClick={() => { setNarrationOn(n => !n); if (narrationOn) stopSpeech(); }} sx={{ color: narrationOn ? '#0f62fe' : '#525252' }}>
              {narrationOn ? <VolumeUpIcon sx={{ fontSize: 18 }} /> : <VolumeOffIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Speed */}
          <Typography sx={{ color: '#8d8d8d', fontSize: 11, ml: 0.5 }}>Speed</Typography>
          <Box sx={{ width: 80 }}>
            <Slider
              value={rate}
              min={0.5}
              max={2.0}
              step={0.25}
              size="small"
              onChange={(_, v) => setRate(v as number)}
              sx={{ color: '#0f62fe', py: 0.5 }}
            />
          </Box>
          <Typography sx={{ color: '#8d8d8d', fontSize: 11, minWidth: 28 }}>{rate}×</Typography>

          <Box sx={{ flex: 1 }} />

          {/* Slide counter */}
          <Typography sx={{ color: '#8d8d8d', fontSize: 12 }}>
            {current + 1} / {total}
          </Typography>

          {/* Download buttons */}
          <Button
            size="small"
            startIcon={recording ? <CircularProgress size={12} sx={{ color: '#be95ff' }} /> : <VideocamIcon sx={{ fontSize: 14 }} />}
            onClick={downloadVideo}
            disabled={recording}
            variant="outlined"
            sx={{ borderColor: '#333', color: recording ? '#be95ff' : '#c6c6c6', fontSize: 11, py: 0.25, '&:hover': { borderColor: '#6929c4', color: '#be95ff' } }}
          >
            {recording ? `REC ${recordingSlide + 1}/${total}` : 'VIDEO'}
          </Button>
          <Button
            size="small"
            startIcon={<PictureAsPdfIcon sx={{ fontSize: 14 }} />}
            onClick={downloadPDF}
            variant="outlined"
            sx={{ borderColor: '#333', color: '#c6c6c6', fontSize: 11, py: 0.25, '&:hover': { borderColor: '#0f62fe', color: '#78a9ff' } }}
          >
            PDF
          </Button>
          <Button
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
            onClick={downloadPPTX}
            variant="outlined"
            sx={{ borderColor: '#333', color: '#c6c6c6', fontSize: 11, py: 0.25, '&:hover': { borderColor: '#6929c4', color: '#be95ff' } }}
          >
            PPTX
          </Button>
        </Box>

      </DialogContent>
    </Dialog>
  );
}
