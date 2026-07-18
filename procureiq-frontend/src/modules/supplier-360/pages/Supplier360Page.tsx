/**
 * Supplier Intelligence 360 — Enterprise Workspace
 * Full-featured supplier intelligence platform with health index,
 * spend analytics, contract intelligence, and Ignite AI brief.
 */
import { useState, useCallback } from 'react';
import {
  Box, Grid, Typography, Chip, Avatar, Button, Skeleton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Alert, Tooltip, IconButton, Tab, Tabs,
  Drawer,
} from '@mui/material';
import SearchIcon           from '@mui/icons-material/Search';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon      from '@mui/icons-material/AutoAwesome';
import VerifiedIcon         from '@mui/icons-material/Verified';
import StarIcon             from '@mui/icons-material/Star';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import TrendingDownIcon     from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon     from '@mui/icons-material/TrendingFlat';
import ArticleIcon          from '@mui/icons-material/Article';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon     from '@mui/icons-material/ErrorOutline';
import StorageIcon          from '@mui/icons-material/Storage';
import BusinessIcon         from '@mui/icons-material/Business';
import PublicIcon           from '@mui/icons-material/Public';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary    from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import StatusBadge         from '@/core/components/StatusBadge/StatusBadge';
import DataSourceBadge     from '@/core/components/DataSourceBadge';
import { useSuppliers, useSupplier360, useSupplierCategories } from '../hooks/useSupplierData';
import { formatCurrency, formatDate } from '@/core/utils/format';

// ── Palette ──────────────────────────────────────────────────────────────────
const IBM = {
  blue:    '#0f62fe',
  purple:  '#6929c4',
  teal:    '#007d79',
  green:   '#198038',
  yellow:  '#f1c21b',
  red:     '#da1e28',
  orange:  '#ff832b',
  navy:    '#001d6c',
  bg:      '#f4f4f4',
  surface: '#ffffff',
  border:  '#e0e0e0',
  text:    '#161616',
  muted:   '#525252',
};

const CHART_COLORS = [IBM.blue, IBM.purple, IBM.teal, IBM.green, IBM.yellow, IBM.red, IBM.orange];

const RISK_COLOR: Record<string, string> = {
  low: IBM.green, medium: IBM.yellow, high: IBM.orange, critical: IBM.red,
};

// ── Supplier list table columns ───────────────────────────────────────────────
const SUPPLIER_COLS: Column<Record<string, unknown>>[] = [
  { id: 'canonical_name', label: 'Supplier',        minWidth: 220 },
  { id: 'category',       label: 'Category',         minWidth: 150 },
  { id: 'country',        label: 'Country',          minWidth: 80,  align: 'center' },
  { id: 'tier',           label: 'Tier',             minWidth: 80,  align: 'center',
    format: v => <StatusBadge status={`tier${v}`} /> },
  { id: 'health_score',   label: 'Health',           minWidth: 100, align: 'center',
    format: (v) => {
      const s = Number(v);
      const col = s >= 80 ? IBM.green : s >= 60 ? IBM.yellow : IBM.red;
      return (
        <Box sx={{ display:'flex', alignItems:'center', gap:0.5, justifyContent:'center' }}>
          <Box sx={{ width:36, height:6, bgcolor:'#e0e0e0', borderRadius:3, overflow:'hidden' }}>
            <Box sx={{ width:`${s}%`, height:'100%', bgcolor:col, borderRadius:3 }} />
          </Box>
          <Typography sx={{ fontSize:12, fontWeight:700, color:col }}>{s}</Typography>
        </Box>
      );
    },
  },
  { id: 'total_spend_usd', label: 'Total Spend',    minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'active_contracts', label: 'Contracts',     minWidth: 90,  align: 'center' },
  { id: 'risk_level',      label: 'Risk',            minWidth: 90,  align: 'center',
    format: v => <StatusBadge status={String(v)} /> },
];

// ── Contract table columns ────────────────────────────────────────────────────
const CONTRACT_COLS: Column<Record<string, unknown>>[] = [
  { id: 'title',           label: 'Contract',   minWidth: 240 },
  { id: 'status',          label: 'Status',     minWidth: 120, format: v => <StatusBadge status={String(v)} /> },
  { id: 'end_date',        label: 'Expires',    minWidth: 110, format: v => formatDate(String(v)) },
  { id: 'days_to_expiry',  label: 'Days Left',  minWidth: 90,  align: 'center',
    format: (v) => {
      const d = Number(v);
      if (!v || isNaN(d)) return '—';
      const col = d <= 30 ? IBM.red : d <= 90 ? IBM.orange : IBM.green;
      return <Typography sx={{ fontSize:12, fontWeight:700, color:col }}>{d}d</Typography>;
    },
  },
  { id: 'value_usd',       label: 'Value',      minWidth: 140, align: 'right', format: v => formatCurrency(Number(v)) },
];

// ── PO table columns ──────────────────────────────────────────────────────────
const PO_COLS: Column<Record<string, unknown>>[] = [
  { id: 'po_number', label: 'PO Number', minWidth: 140 },
  { id: 'date',      label: 'Date',      minWidth: 110, format: v => formatDate(String(v)) },
  { id: 'lines',     label: 'Lines',     minWidth: 70,  align: 'center' },
  { id: 'total',     label: 'Amount',    minWidth: 140, align: 'right', format: v => formatCurrency(Number(v)) },
];

// ── Mini components ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, noPad }: {
  title?: string; icon?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <Box sx={{ bgcolor: IBM.surface, border: `1px solid ${IBM.border}`, borderRadius: 1.5,
               overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {title && (
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${IBM.border}`,
                   display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon && <Box sx={{ color: IBM.blue, display:'flex', alignItems:'center' }}>{icon}</Box>}
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: IBM.text }}>{title}</Typography>
        </Box>
      )}
      <Box sx={{ flex: 1, ...(noPad ? {} : { p: 2.5 }) }}>{children}</Box>
    </Box>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
        <Typography sx={{ fontSize: 12, color: IBM.muted }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{value}</Typography>
      </Box>
      <Box sx={{ height: 6, bgcolor: '#e0e0e0', borderRadius: 3 }}>
        <Box sx={{ width: `${value}%`, height: '100%', bgcolor: color, borderRadius: 3,
                   transition: 'width 0.5s ease' }} />
      </Box>
    </Box>
  );
}

function HealthGauge({ score, size = 90 }: { score: number; size?: number }) {
  const color = score >= 80 ? IBM.green : score >= 60 ? IBM.yellow : IBM.red;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const r = size * 0.42, cx = size / 2 + 2, cy = size / 2 + 2;
  const startA = -210, total = 240, filled = (score / 100) * total;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (s: number, e: number) => {
    const [x1, y1] = [cx + r * Math.cos(toRad(s)), cy + r * Math.sin(toRad(s))];
    const [x2, y2] = [cx + r * Math.cos(toRad(e)), cy + r * Math.sin(toRad(e))];
    return `M ${x1} ${y1} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const svgSize = size + 4;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={svgSize} height={svgSize * 0.85} style={{ overflow: 'visible' }}>
        <path d={arc(startA, startA + total)} fill="none" stroke="#e0e0e0" strokeWidth={size * 0.09} strokeLinecap="round" />
        <path d={arc(startA, startA + filled)} fill="none" stroke={color} strokeWidth={size * 0.09} strokeLinecap="round" />
        <text x={cx} y={cy + size * 0.06} textAnchor="middle" fontSize={size * 0.24} fontWeight={700} fill={color}>{score}</text>
        <text x={cx} y={cy + size * 0.22} textAnchor="middle" fontSize={size * 0.12} fill={IBM.muted}>/100</text>
      </svg>
      <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', gap:0.75, mt:-0.5 }}>
        <Box sx={{ width:18, height:18, borderRadius:'50%', bgcolor:color, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Typography sx={{ fontSize:10, fontWeight:800, color:'#fff' }}>{grade}</Typography>
        </Box>
        <Typography sx={{ fontSize:11, fontWeight:600, color }}>{score >= 80 ? 'Good' : score >= 60 ? 'Acceptable' : 'Needs Attention'}</Typography>
      </Box>
    </Box>
  );
}

function KPITile({ label, value, sub, color, icon, onClick }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Box onClick={onClick} sx={{
      bgcolor: IBM.surface, border: `1px solid ${IBM.border}`,
      borderTop: `3px solid ${color ?? IBM.blue}`,
      borderRadius: 1, p: 2, cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s', height: '100%',
      '&:hover': onClick ? { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } : {},
    }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
        <Typography sx={{ fontSize:11, fontWeight:700, color:IBM.muted, textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</Typography>
        {icon && <Box sx={{ color: color ?? IBM.blue, opacity:0.7 }}>{icon}</Box>}
      </Box>
      <Typography sx={{ fontWeight:700, fontSize:22, color:IBM.text, lineHeight:1.2 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize:11, color:IBM.muted, mt:0.25 }}>{sub}</Typography>}
    </Box>
  );
}

function SpendTrendIcon({ trend }: { trend: string }) {
  if (trend === 'Increasing') return <TrendingUpIcon sx={{ fontSize:16, color:IBM.red }} />;
  if (trend === 'Decreasing') return <TrendingDownIcon sx={{ fontSize:16, color:IBM.green }} />;
  return <TrendingFlatIcon sx={{ fontSize:16, color:IBM.muted }} />;
}

// ── Profile Header ────────────────────────────────────────────────────────────
function SupplierProfileHeader({ profile, onClose }: {
  profile: Record<string, unknown>;
  onClose: () => void;
}) {
  const s = profile.supplier as Record<string, unknown>;
  const initial = String(s.canonical_name ?? '?')[0].toUpperCase();
  const isPreferred = Boolean(s.is_preferred);
  const isStrategic = Boolean(s.is_strategic);
  const category    = s.category   != null ? String(s.category)   : '';
  const country     = s.country    != null ? String(s.country)    : '';
  const tier        = s.tier       != null ? String(s.tier)       : '?';
  const riskLevel   = s.risk_level != null ? String(s.risk_level) : 'low';

  return (
    <Box sx={{
      background: `linear-gradient(135deg, ${IBM.navy} 0%, #0a1a4a 60%, #0d1e5a 100%)`,
      p: 3, color: '#fff',
    }}>
      {/* Back + breadcrumb */}
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
        <IconButton size="small" onClick={onClose} sx={{ color:'rgba(255,255,255,0.7)', '&:hover':{color:'#fff'} }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Supplier 360 /</Typography>
        <Typography sx={{ fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>
          {String(s.canonical_name)}
        </Typography>
      </Box>

      {/* Main header */}
      <Box sx={{ display:'flex', gap:2.5, alignItems:'flex-start', mb:2 }}>
        <Avatar sx={{ width:56, height:56, bgcolor:'rgba(15,98,254,0.25)', border:'2px solid rgba(15,98,254,0.5)',
                      color:'#78a9ff', fontWeight:800, fontSize:22 }}>
          {initial}
        </Avatar>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' as const, mb:0.5 }}>
            <Typography sx={{ fontWeight:800, fontSize:20, color:'#fff', lineHeight:1.2 }}>
              {String(s.canonical_name)}
            </Typography>
            {isPreferred && (
              <Tooltip title="Preferred Supplier">
                <StarIcon sx={{ fontSize:16, color:'#f1c21b' }} />
              </Tooltip>
            )}
            {isStrategic && (
              <Tooltip title="Strategic Supplier">
                <VerifiedIcon sx={{ fontSize:16, color:'#78a9ff' }} />
              </Tooltip>
            )}
          </Box>
          <Typography sx={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'.08em', mb:1 }}>
            ID: {String(s.id).substring(0, 8).toUpperCase()}
          </Typography>
          <Box sx={{ display:'flex', flexWrap:'wrap' as const, gap:0.75 }}>
            {category && (
              <Chip label={category} size="small"
                sx={{ bgcolor:'rgba(15,98,254,0.2)', color:'#78a9ff', fontWeight:600, fontSize:11, height:22 }} />
            )}
            {country && (
              <Chip icon={<PublicIcon sx={{ fontSize:'12px !important', color:'rgba(255,255,255,0.5) !important' }} />}
                label={country} size="small"
                sx={{ bgcolor:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:11, height:22 }} />
            )}
            <Chip label={`Tier ${tier}`} size="small"
              sx={{ bgcolor:'rgba(105,41,196,0.3)', color:'#c4b5fd', fontWeight:600, fontSize:11, height:22 }} />
            <Chip label={`${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)} Risk`}
              size="small"
              sx={{
                bgcolor: riskLevel === 'low' ? 'rgba(25,128,56,0.25)' : riskLevel === 'critical' ? 'rgba(218,30,40,0.25)' : 'rgba(255,130,43,0.25)',
                color: RISK_COLOR[riskLevel] ?? IBM.muted,
                fontWeight:600, fontSize:11, height:22,
              }} />
          </Box>
        </Box>
      </Box>

      {/* Quick actions */}
      <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
        {[
          { label:'View Contracts', icon:<ArticleIcon sx={{ fontSize:14 }} /> },
          { label:'Generate AI Report', icon:<AutoAwesomeIcon sx={{ fontSize:14 }} /> },
          { label:'Export Profile', icon:<StorageIcon sx={{ fontSize:14 }} /> },
        ].map(a => (
          <Button key={a.label} size="small" variant="outlined" startIcon={a.icon}
            sx={{
              color:'rgba(255,255,255,0.8)', borderColor:'rgba(255,255,255,0.2)',
              fontSize:11, py:0.5, textTransform:'none', fontWeight:600,
              '&:hover':{ borderColor:'rgba(255,255,255,0.5)', bgcolor:'rgba(255,255,255,0.08)' },
            }}>
            {a.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

// ── Health Index Panel ────────────────────────────────────────────────────────
function HealthIndexPanel({ hi }: { hi: Record<string, unknown> }) {
  const score = Number(hi.overall ?? 0);
  const fin   = Number(hi.financial_stability ?? 0);
  const del   = Number(hi.delivery_score ?? 0);
  const qual  = Number(hi.quality_score ?? 0);
  const contr = Number(hi.contract_health ?? 0);

  const dimColor = (v: number) => v >= 80 ? IBM.green : v >= 60 ? IBM.yellow : IBM.red;

  return (
    <SectionCard title="Supplier Health Index" icon={<CheckCircleIcon sx={{ fontSize:16 }} />}>
      <Box sx={{ display:'flex', gap:3, alignItems:'flex-start', flexWrap:'wrap' }}>
        <Box sx={{ textAlign:'center', minWidth:100 }}>
          <HealthGauge score={score} size={90} />
        </Box>
        <Box sx={{ flex:1, minWidth:160 }}>
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' as const, mb:1.5 }}>
            <Chip label={String(hi.performance_rating ?? '—')} size="small"
              sx={{ bgcolor:`${dimColor(score)}18`, color:dimColor(score), fontWeight:600, fontSize:10, height:20 }} />
            <Chip label={String(hi.compliance_status ?? '—')} size="small"
              sx={{ bgcolor:`${String(hi.compliance_status) === 'Compliant' ? IBM.green : IBM.orange}18`, color:String(hi.compliance_status) === 'Compliant' ? IBM.green : IBM.orange, fontWeight:600, fontSize:10, height:20 }} />
            <Chip
              icon={<SpendTrendIcon trend={String(hi.spend_trend ?? '')} />}
              label={`Spend: ${String(hi.spend_trend ?? '—')}`}
              size="small"
              sx={{ bgcolor:`${IBM.muted}18`, color:IBM.muted, fontWeight:600, fontSize:10, height:20 }} />
          </Box>
          <ScoreBar label="Financial Stability" value={fin}  color={dimColor(fin)} />
          <ScoreBar label="Delivery Score"      value={del}  color={dimColor(del)} />
          <ScoreBar label="Quality Score"       value={qual} color={dimColor(qual)} />
          <ScoreBar label="Contract Health"     value={contr} color={dimColor(contr)} />
        </Box>
      </Box>
      {hi.ai_explanation != null && (
        <Box sx={{ mt:2, pt:1.5, borderTop:`1px solid ${IBM.border}` }}>
          <Box sx={{ display:'flex', gap:1, alignItems:'flex-start' }}>
            <AutoAwesomeIcon sx={{ fontSize:14, color:IBM.blue, flexShrink:0, mt:0.2 }} />
            <Typography sx={{ fontSize:12, color:IBM.muted, lineHeight:1.6 }}>
              {String(hi.ai_explanation)}
            </Typography>
          </Box>
        </Box>
      )}
    </SectionCard>
  );
}

// ── Ignite AI Brief ───────────────────────────────────────────────────────────
function IgniteBrief({ brief }: { brief: Record<string, unknown> }) {
  const recs = (brief.recommendations as Record<string, unknown>[]) ?? [];
  const impactColor = (impact: string) =>
    impact === 'High' ? IBM.red : impact === 'Medium' ? IBM.orange : IBM.muted;

  return (
    <Box sx={{ bgcolor:'#eff4ff', border:`1px solid #d0e2ff`, borderRadius:1.5, p:2.5, mb:3 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1.5 }}>
        <AutoAwesomeIcon sx={{ color:IBM.blue, fontSize:18 }} />
        <Typography sx={{ fontWeight:700, fontSize:13, color:'#0043ce' }}>
          Ignite AI — Executive Supplier Brief
        </Typography>
        <Chip label="AI Generated" size="small"
          sx={{ ml:'auto', bgcolor:'#d0e2ff', color:'#002d9c', fontSize:10, fontWeight:700, height:20 }} />
      </Box>
      <Typography sx={{ fontSize:13, color:IBM.text, lineHeight:1.7, mb:2 }}>
        {String(brief.summary ?? '')}
      </Typography>
      {recs.length > 0 && (
        <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
          {recs.map((r, i) => (
            <Box key={i} sx={{ bgcolor:'#fff', border:`1px solid #d0e2ff`, borderRadius:1, p:1.5 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:0.5, flexWrap:'wrap' }}>
                <Typography sx={{ fontWeight:700, fontSize:12, color:'#0043ce', flex:1 }}>
                  {String(r.title ?? '')}
                </Typography>
                <Chip label={`${r.confidence}% confidence`} size="small"
                  sx={{ bgcolor:'#eff4ff', color:IBM.blue, fontSize:10, height:18, fontWeight:600 }} />
                <Chip label={String(r.business_impact)} size="small"
                  sx={{ bgcolor:`${impactColor(String(r.business_impact))}18`,
                        color:impactColor(String(r.business_impact)), fontSize:10, height:18, fontWeight:700 }} />
              </Box>
              <Typography sx={{ fontSize:12, color:IBM.muted, mb:0.5 }}>{String(r.reason ?? '')}</Typography>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                <Box sx={{ width:6, height:6, borderRadius:'50%', bgcolor:IBM.blue, flexShrink:0 }} />
                <Typography sx={{ fontSize:11, fontWeight:600, color:IBM.blue }}>
                  {String(r.suggested_action ?? '')}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Data Transparency Footer ──────────────────────────────────────────────────
function DataMeta({ meta }: { meta: Record<string, unknown> }) {
  return (
    <Box sx={{ mt:1.5, pt:1, borderTop:`1px solid #f0f0f0` }}>
      <DataSourceBadge
        source={String(meta.source ?? 'spend_transactions · contracts')}
        lastUpdated={new Date().toISOString()}
        recordCount={Number(meta.records_used ?? 0)}
        confidence={92}
      />
    </Box>
  );
}

// ── Profile Content (Tabs) ────────────────────────────────────────────────────
function ProfileContent({ profile }: { profile: Record<string, unknown> }) {
  const [tab, setTab] = useState(0);

  const s     = profile.supplier    as Record<string, unknown> | undefined;
  const hi    = profile.health_index as Record<string, unknown> | undefined;
  const kpis  = profile.kpis        as Record<string, unknown> | undefined;
  const brief = profile.ignite_brief as Record<string, unknown> | undefined;
  const hist  = (profile.spend_history as Record<string, unknown>[]) ?? [];
  const contracts = (profile.contracts as Record<string, unknown>[]) ?? [];
  const topPos    = (profile.top_pos   as Record<string, unknown>[]) ?? [];
  const spendBU   = (profile.spend_by_bu as Record<string, unknown>[]) ?? [];
  const spendReg  = (profile.spend_by_region as Record<string, unknown>[]) ?? [];
  const dataMeta  = profile.data_meta as Record<string, unknown> | undefined;

  if (!s || !hi || !kpis) return null;

  const kpiItems = [
    { label:'Total Spend',      value:formatCurrency(Number(kpis.total_spend)),   color:IBM.blue,   sub:'All time' },
    { label:'Active Contracts', value:String(kpis.active_contracts),             color:IBM.teal,   sub:`${kpis.expiring_contracts} expiring` },
    { label:'Purchase Orders',  value:String(kpis.total_purchase_orders || 0),   color:IBM.purple, sub:'Total POs' },
    { label:'Savings Oppty',    value:formatCurrency(Number(kpis.savings_opportunity)), color:IBM.green, sub:'Estimated' },
    { label:'Invoice Accuracy', value:`${kpis.invoice_accuracy}%`,               color:IBM.teal,   sub:'Estimated' },
    { label:'Avg Lead Time',    value:`${kpis.avg_delivery_days}d`,              color:IBM.orange, sub:'Estimated' },
    { label:'Open Issues',      value:String(kpis.open_issues),                  color:Number(kpis.open_issues) > 0 ? IBM.red : IBM.green, sub:'Action required' },
    { label:'Transactions',     value:String(kpis.total_transactions || 0),      color:IBM.navy,   sub:'Total' },
  ];

  const TABS = ['Overview', 'Spend Analytics', 'Contracts', 'Purchase Orders', 'Notifications'];

  return (
    <Box sx={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Ignite Brief */}
      {brief && (
        <Box sx={{ px:3, pt:3 }}>
          <IgniteBrief brief={brief} />
        </Box>
      )}

      {/* Tab bar */}
      <Box sx={{ px:3, borderBottom:`1px solid ${IBM.border}`, bgcolor:'#fff' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{
            '& .MuiTab-root':{ fontSize:12, fontWeight:500, minHeight:44, textTransform:'none', px:1.5 },
            '& .Mui-selected':{ fontWeight:700, color:IBM.blue },
            '& .MuiTabs-indicator':{ bgcolor:IBM.blue, height:3 },
          }}>
          {TABS.map((t, i) => (
            <Tab key={i} label={t}
              icon={i === 4 && Number(kpis.open_issues) > 0
                ? <Box component="span" sx={{ width:6, height:6, borderRadius:'50%', bgcolor:IBM.red, ml:0.5, display:'inline-block' }} />
                : undefined}
              iconPosition="end"
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex:1, overflow:'auto', p:3 }}>

        {/* ── TAB 0: OVERVIEW ───────────────────────────────────────────── */}
        {tab === 0 && (
          <Box>
            {/* KPI tiles */}
            <Grid container spacing={1.5} sx={{ mb:3 }}>
              {kpiItems.map(k => (
                <Grid item xs={6} sm={3} key={k.label}>
                  <KPITile label={k.label} value={k.value} sub={k.sub} color={k.color} />
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2} sx={{ mb:3 }}>
              {/* Health Index */}
              <Grid item xs={12} md={7}>
                {hi && <HealthIndexPanel hi={hi} />}
              </Grid>

              {/* Spend by Category / BU */}
              <Grid item xs={12} md={5}>
                <SectionCard title="Spend by Business Unit" icon={<BusinessIcon sx={{ fontSize:16 }} />}>
                  {spendBU.length > 0 ? (
                    <Box sx={{ display:'flex', flexDirection:'column', gap:0.75 }}>
                      {spendBU.slice(0,6).map((b, i) => {
                        const grand = spendBU.reduce((acc, x) => acc + Number(x.total), 0) || 1;
                        const pct   = (Number(b.total) / grand * 100).toFixed(1);
                        const col   = CHART_COLORS[i % CHART_COLORS.length];
                        return (
                          <Box key={String(b.bu)}>
                            <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.3 }}>
                              <Typography sx={{ fontSize:11, color:IBM.muted }} noWrap>{String(b.bu)}</Typography>
                              <Typography sx={{ fontSize:11, fontWeight:700, color:col }}>{pct}%</Typography>
                            </Box>
                            <Box sx={{ height:5, bgcolor:'#f0f0f0', borderRadius:3 }}>
                              <Box sx={{ width:`${pct}%`, height:'100%', bgcolor:col, borderRadius:3 }} />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign:'center', py:3, color:IBM.muted }}>
                      <BusinessIcon sx={{ fontSize:32, mb:1, opacity:0.3 }} />
                      <Typography sx={{ fontSize:12 }}>No business unit data in uploaded files</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>
            </Grid>

            {/* Spend Trend mini-chart */}
            {hist.length > 0 && (
              <SectionCard title="Monthly Spend Trend" icon={<TrendingUpIcon sx={{ fontSize:16 }} />}>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={hist} margin={{ top:4, right:16, bottom:0, left:0 }}>
                    <defs>
                      <linearGradient id="sg360" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={IBM.blue} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={IBM.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize:10 }} />
                    <YAxis tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize:10 }} width={50} />
                    <RTooltip formatter={(v: number) => [formatCurrency(v), 'Spend']} contentStyle={{ fontSize:11 }} />
                    <Area type="monotone" dataKey="total" stroke={IBM.blue} strokeWidth={2}
                      fill="url(#sg360)" dot={{ r:3 }} />
                  </AreaChart>
                </ResponsiveContainer>
                {dataMeta && <DataMeta meta={dataMeta} />}
              </SectionCard>
            )}
          </Box>
        )}

        {/* ── TAB 1: SPEND ANALYTICS ────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Grid container spacing={2} sx={{ mb:3 }}>
              {/* Spend trend full */}
              <Grid item xs={12}>
                <SectionCard title="Monthly Spend Trend — Full History" icon={<TrendingUpIcon sx={{ fontSize:16 }} />}>
                  {hist.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={hist} margin={{ top:4, right:16, bottom:0, left:0 }}>
                          <defs>
                            <linearGradient id="sg360b" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={IBM.blue} stopOpacity={0.18} />
                              <stop offset="95%" stopColor={IBM.blue} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize:10 }} />
                          <YAxis tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize:10 }} width={55} />
                          <RTooltip formatter={(v: number) => [formatCurrency(v), 'Spend']} contentStyle={{ fontSize:11 }} />
                          <Area type="monotone" dataKey="total" stroke={IBM.blue} strokeWidth={2.5}
                            fill="url(#sg360b)" dot={{ r:3 }} name="Total Spend" />
                        </AreaChart>
                      </ResponsiveContainer>
                      {dataMeta && <DataMeta meta={dataMeta} />}
                    </>
                  ) : (
                    <Box sx={{ textAlign:'center', py:4, color:IBM.muted }}>
                      <StorageIcon sx={{ fontSize:40, mb:1, opacity:0.3 }} />
                      <Typography sx={{ fontWeight:600, mb:0.5 }}>No spend data available</Typography>
                      <Typography sx={{ fontSize:12 }}>Upload procurement data via the Intelligent Data Engine</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>

              {/* Spend by BU */}
              <Grid item xs={12} sm={6}>
                <SectionCard title="Spend by Business Unit" icon={<BusinessIcon sx={{ fontSize:16 }} />}>
                  {spendBU.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={spendBU.slice(0,6)} layout="vertical" margin={{ top:0, right:40, bottom:0, left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize:9 }} />
                        <YAxis type="category" dataKey="bu" tick={{ fontSize:10 }} width={90} />
                        <RTooltip formatter={(v: number) => [formatCurrency(v), 'Spend']} contentStyle={{ fontSize:11 }} />
                        <Bar dataKey="total" radius={[0,4,4,0]}>
                          {spendBU.slice(0,6).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign:'center', py:3, color:IBM.muted }}>
                      <Typography sx={{ fontSize:12 }}>No business unit breakdown in uploaded data</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>

              {/* Spend by Region */}
              <Grid item xs={12} sm={6}>
                <SectionCard title="Spend by Region" icon={<PublicIcon sx={{ fontSize:16 }} />}>
                  {spendReg.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={spendReg.slice(0,6)} layout="vertical" margin={{ top:0, right:40, bottom:0, left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize:9 }} />
                        <YAxis type="category" dataKey="region" tick={{ fontSize:10 }} width={35} />
                        <RTooltip formatter={(v: number) => [formatCurrency(v), 'Spend']} contentStyle={{ fontSize:11 }} />
                        <Bar dataKey="total" radius={[0,4,4,0]}>
                          {spendReg.slice(0,6).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign:'center', py:3, color:IBM.muted }}>
                      <Typography sx={{ fontSize:12 }}>No regional breakdown in uploaded data</Typography>
                    </Box>
                  )}
                </SectionCard>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ── TAB 2: CONTRACTS ──────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            {/* Expiry alerts */}
            {contracts.filter(c => c.expiring_soon).map((c, i) => (
              <Alert key={i} severity="warning" icon={<WarningAmberIcon />} sx={{ mb:1.5, fontSize:12 }}>
                <strong>{String(c.title)}</strong> — expires in{' '}
                <strong>{Number(c.days_to_expiry)} days</strong> ({String(c.end_date)})
              </Alert>
            ))}

            {contracts.length > 0 ? (
              <Box sx={{ bgcolor:'#fff', border:`1px solid ${IBM.border}`, borderRadius:1, overflow:'hidden' }}>
                <DataTable
                  title={`${contracts.length} Contract${contracts.length !== 1 ? 's' : ''}`}
                  columns={CONTRACT_COLS}
                  rows={contracts as Record<string, unknown>[]}
                  rowKey="id"
                  maxHeight={420}
                />
                {dataMeta && (
                  <Box sx={{ px:2, pb:1.5 }}>
                    <DataMeta meta={dataMeta} />
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign:'center', py:6, color:IBM.muted }}>
                <ArticleIcon sx={{ fontSize:48, mb:1, opacity:0.25 }} />
                <Typography sx={{ fontWeight:700, mb:0.5 }}>No contracts found</Typography>
                <Typography sx={{ fontSize:12 }}>Upload contract documents via the Intelligent Data Engine</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── TAB 3: PURCHASE ORDERS ────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            {topPos.length > 0 ? (
              <Box sx={{ bgcolor:'#fff', border:`1px solid ${IBM.border}`, borderRadius:1, overflow:'hidden' }}>
                <DataTable
                  title={`Top ${topPos.length} Purchase Orders by Value`}
                  columns={PO_COLS}
                  rows={topPos as Record<string, unknown>[]}
                  rowKey="po_number"
                  maxHeight={500}
                />
                {dataMeta && (
                  <Box sx={{ px:2, pb:1.5 }}>
                    <DataMeta meta={dataMeta} />
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign:'center', py:6, color:IBM.muted }}>
                <StorageIcon sx={{ fontSize:48, mb:1, opacity:0.25 }} />
                <Typography sx={{ fontWeight:700, mb:0.5 }}>No purchase orders found</Typography>
                <Typography sx={{ fontSize:12 }}>Upload procurement data with PO numbers via the Intelligent Data Engine</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── TAB 4: NOTIFICATIONS ──────────────────────────────────────── */}
        {tab === 4 && (
          <Box>
            {(() => {
              const alerts: Array<{ type:'warning'|'error'|'info'; msg: string }> = [];
              contracts.filter(c => c.expiring_soon).forEach(c => {
                alerts.push({ type:'warning', msg:`Contract "${String(c.title)}" expiring in ${c.days_to_expiry} days` });
              });
              if (Number(s.risk_score) >= 7) {
                alerts.push({ type:'error', msg:`High risk score (${s.risk_score}/10) — quarterly review recommended` });
              }
              if (Number(kpis.savings_opportunity) > 100_000) {
                alerts.push({ type:'info', msg:`${formatCurrency(Number(kpis.savings_opportunity))} savings opportunity identified — review rate card` });
              }
              if (alerts.length === 0) {
                return (
                  <Box sx={{ textAlign:'center', py:6, color:IBM.muted }}>
                    <CheckCircleIcon sx={{ fontSize:48, mb:1, color:IBM.green, opacity:0.5 }} />
                    <Typography sx={{ fontWeight:700 }}>No active alerts for this supplier</Typography>
                  </Box>
                );
              }
              return alerts.map((a, i) => (
                <Alert key={i} severity={a.type} sx={{ mb:1.5, fontSize:13 }}>{a.msg}</Alert>
              ));
            })()}
          </Box>
        )}

      </Box>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Supplier360Page() {
  const [page, setPage]             = useState(0);
  const [pageSize, setPageSize]     = useState(50);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [riskLevel, setRiskLevel]   = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: categoriesData } = useSupplierCategories();
  const { data, isLoading } = useSuppliers({
    page: page + 1,
    page_size: pageSize,
    search: search || undefined,
    category: category || undefined,
    risk_level: riskLevel || undefined,
  });
  const { data: profile, isLoading: profileLoading } = useSupplier360(selectedId);

  const suppliers = (data?.data ?? []) as Record<string, unknown>[];
  const total     = data?.meta?.total ?? 0;

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const summaryText = total > 0
    ? `Managing ${total} suppliers across multiple tiers and categories. Click any supplier row to open their full Supplier Intelligence 360 workspace — including Health Index, spend analytics, contracts, AI brief, and notifications.`
    : 'No suppliers found. Upload procurement data via the Intelligent Data Engine to populate the supplier registry.';

  return (
    <Box>
      <ExecutiveSummary
        title="Supplier Intelligence 360"
        summary={summaryText}
        highlights={['Health Index', 'Ignite AI Brief', 'Spend Analytics', 'Contract Intelligence', 'Risk Monitoring']}
        isLoading={isLoading}
      />

      {/* Filters */}
      <Box sx={{ display:'flex', gap:1.5, mb:2, flexWrap:'wrap', alignItems:'center' }}>
        <TextField
          size="small"
          placeholder="Search suppliers…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize:18, color:IBM.muted }} /></InputAdornment> }}
          sx={{ minWidth:240, '& .MuiOutlinedInput-root':{ borderRadius:1 } }}
        />
        <FormControl size="small" sx={{ minWidth:180 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category"
            onChange={e => { setCategory(e.target.value); setPage(0); }}>
            <MenuItem value="">All Categories</MenuItem>
            {(categoriesData ?? []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth:140 }}>
          <InputLabel>Risk Level</InputLabel>
          <Select value={riskLevel} label="Risk Level"
            onChange={e => { setRiskLevel(e.target.value); setPage(0); }}>
            <MenuItem value="">All Levels</MenuItem>
            {['low', 'medium', 'high', 'critical'].map(r => (
              <MenuItem key={r} value={r}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                  <Box sx={{ width:8, height:8, borderRadius:'50%', bgcolor:RISK_COLOR[r] }} />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography sx={{ fontSize:12, color:IBM.muted, ml:'auto' }}>
          {total.toLocaleString()} supplier{total !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Supplier Table */}
      <Box sx={{ bgcolor:'#fff', border:`1px solid ${IBM.border}`, borderRadius:1.5, mb:3, overflow:'hidden' }}>
        <DataTable
          columns={SUPPLIER_COLS}
          rows={suppliers.map((s): Record<string, unknown> => ({
            ...s,
            _onClick: () => handleSelect(String(s.id)),
          }))}
          loading={isLoading}
          rowKey="id"
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchPlaceholder="Filter suppliers…"
          maxHeight={480}
        />
      </Box>

      {/* 360 Profile Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100vw', sm: 620, md: 720 },
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          },
        }}
      >
        {profileLoading ? (
          <Box sx={{ flex:1, display:'flex', flexDirection:'column' }}>
            <Box sx={{ height:200, background:'linear-gradient(135deg, #001d6c, #0a1a4a)' }}>
              <Box sx={{ p:3 }}>
                <Skeleton variant="text" width={200} sx={{ bgcolor:'rgba(255,255,255,0.15)' }} />
                <Skeleton variant="circular" width={56} height={56} sx={{ mt:2, bgcolor:'rgba(255,255,255,0.1)' }} />
                <Skeleton variant="text" width={300} sx={{ mt:1, bgcolor:'rgba(255,255,255,0.15)' }} />
              </Box>
            </Box>
            <Box sx={{ p:3, flex:1 }}>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} height={48} sx={{ mb:1.5 }} />
              ))}
            </Box>
          </Box>
        ) : profile?.supplier ? (
          <Box sx={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <SupplierProfileHeader
              profile={profile}
              onClose={() => setSelectedId(null)}
            />
            <Box sx={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' }}>
              <ProfileContent profile={profile} />
            </Box>
          </Box>
        ) : selectedId ? (
          <Box sx={{ p:4, textAlign:'center' }}>
            <ErrorOutlineIcon sx={{ fontSize:48, color:IBM.muted, opacity:0.4, mb:1 }} />
            <Typography sx={{ fontWeight:700, color:IBM.muted }}>Supplier not found</Typography>
          </Box>
        ) : null}
      </Drawer>
    </Box>
  );
}
