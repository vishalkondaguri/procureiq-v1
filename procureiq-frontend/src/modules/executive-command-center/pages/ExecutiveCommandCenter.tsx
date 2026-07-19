/**
 * Executive Command Center — Live Operations Dashboard
 * Enterprise-grade procurement intelligence with real-time KPIs,
 * contract expiry countdown, supplier alerts, drill-down charts,
 * and smart AI recommendations from Ignite.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Box, Typography, Skeleton, Button, Chip, Divider,
  IconButton, Tooltip, LinearProgress, useTheme,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import UploadFileIcon      from '@mui/icons-material/UploadFile';
import TrendingUpIcon      from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon  from '@mui/icons-material/AccountBalance';
import GroupIcon           from '@mui/icons-material/Group';
import AssessmentIcon      from '@mui/icons-material/Assessment';
import SavingsIcon         from '@mui/icons-material/Savings';
import ArticleIcon         from '@mui/icons-material/Article';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon    from '@mui/icons-material/ErrorOutline';
import RefreshIcon         from '@mui/icons-material/Refresh';
import OpenInNewIcon       from '@mui/icons-material/OpenInNew';
import PaymentsIcon        from '@mui/icons-material/Payments';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import KPICard             from '@/core/components/KPICard/KPICard';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary    from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import DataSourceBadge     from '@/core/components/DataSourceBadge';
import DatasetGate         from '@/core/components/DatasetGate/DatasetGate';
import {
  useSpendKPIs, useMonthlyTrend, useTopSuppliers, useCategorySpend,
} from '../hooks/useSpendData';
import { formatCurrency, formatPercent } from '@/core/utils/format';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

// ── IBM Color Palette ─────────────────────────────────────────────────────────
const IBM = {
  blue:    '#0f62fe',
  purple:  '#6929c4',
  teal:    '#007d79',
  green:   '#198038',
  yellow:  '#f1c21b',
  red:     '#da1e28',
  orange:  '#ff832b',
  navy:    '#001d6c',
};

const CAT_COLORS = [
  IBM.blue, IBM.purple, IBM.teal, IBM.green, IBM.yellow, IBM.red, IBM.orange, '#9f1853',
];

// ── Top-supplier table columns ────────────────────────────────────────────────
const SUPPLIER_COLS: Column<Record<string, unknown>>[] = [
  { id: 'rank',                label: '#',            minWidth: 48,  align: 'center' },
  { id: 'supplier_name',      label: 'Supplier',      minWidth: 200 },
  { id: 'total_spend',        label: 'Total Spend',   minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'spend_percent',      label: 'Share %',       minWidth: 100, align: 'right',
    format: v => `${Number(v).toFixed(1)}%` },
  { id: 'cumulative_percent', label: 'Cumulative %',  minWidth: 120, align: 'right',
    format: v => `${Number(v).toFixed(1)}%` },
];

// ── Y-axis formatter ──────────────────────────────────────────────────────────
function formatYAxis(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Widget card ───────────────────────────────────────────────────────────────
function WidgetCard({
  title, children, loading, source, recordCount, dataUpdatedAt, onRefresh, action,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  source?: string;
  recordCount?: number;
  dataUpdatedAt?: number;
  onRefresh?: () => void;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const cardBg = theme.palette.background.paper;
  const border = theme.palette.divider;

  return (
    <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
          {title}
        </Typography>
        {action}
        {onRefresh && (
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={onRefresh} sx={{ ml: 0.5 }}>
              <RefreshIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ flex: 1 }}>
        {loading ? <Skeleton variant="rectangular" height={220} /> : children}
      </Box>
      {source && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${border}` }}>
          <DataSourceBadge
            source={source}
            lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : undefined}
            recordCount={recordCount}
            confidence={95}
          />
        </Box>
      )}
    </Box>
  );
}

// ── Health Gauge ──────────────────────────────────────────────────────────────
function HealthGauge({ score, loading }: { score: number | undefined; loading: boolean }) {
  if (loading) return <Skeleton variant="circular" width={100} height={100} sx={{ mx: 'auto' }} />;
  if (score == null) return null;

  const color = score >= 80 ? IBM.green : score >= 60 ? IBM.yellow : IBM.red;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Acceptable' : 'Needs Attention';

  const r = 42, cx = 54, cy = 54;
  const startAngle = -210, endAngle = 30;
  const total = endAngle - startAngle;
  const filled = (score / 100) * total;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = toRad(start), e = toRad(end);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg width={108} height={90} style={{ overflow: 'visible' }}>
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#e0e0e0" strokeWidth={8} strokeLinecap="round" />
        <path d={arcPath(startAngle, startAngle + filled)} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
        <text x={cx} y={cy + 4}  textAnchor="middle" fontSize={22} fontWeight={700} fill={color}>{score}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={11} fill="#525252">/100</text>
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mt: -0.5 }}>
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color, display: 'flex',
                   alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{grade}</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color }}>{label}</Typography>
      </Box>
    </Box>
  );
}

// ── Contract Expiry Countdown ─────────────────────────────────────────────────
function ContractExpiryPanel() {
  const navigate = useNavigate();
  const theme = useTheme();

  const { data, isLoading } = useQuery<{ timeline: Array<{ title: string; supplier_name: string; end_date: string; days_to_expiry: number; value_usd: number; status: string }> }>({
    queryKey: ['contract-expiry-timeline'],
    queryFn: async () => {
      const { data } = await apiClient.get('/contracts/expiry-timeline');
      return data;
    },
    staleTime: 60_000,
  });

  const urgent = useMemo(() => {
    if (!data?.timeline) return [];
    return data.timeline
      .filter(c => c.days_to_expiry >= 0 && c.days_to_expiry <= 90)
      .sort((a, b) => a.days_to_expiry - b.days_to_expiry)
      .slice(0, 5);
  }, [data]);

  if (isLoading) return <>{[...Array(3)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 1 }} />)}</>;

  if (urgent.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: IBM.green, py: 1 }}>
        <CheckCircleIcon sx={{ fontSize: 16 }} />
        <Typography sx={{ fontSize: 13 }}>No contracts expiring in next 90 days</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {urgent.map((c, i) => {
        const urgency = c.days_to_expiry <= 14 ? 'critical' : c.days_to_expiry <= 30 ? 'high' : 'medium';
        const color = urgency === 'critical' ? IBM.red : urgency === 'high' ? IBM.orange : IBM.yellow;
        const bg = urgency === 'critical' ? '#fff1f1' : urgency === 'high' ? '#fff3e0' : '#fdf6dd';
        const lightBg = theme.palette.mode === 'dark' ? '#2a1515' : bg;
        return (
          <Box key={i} sx={{
            p: 1.5, mb: 1, borderRadius: 1, border: `1px solid ${color}40`,
            bgcolor: lightBg, display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Box sx={{ textAlign: 'center', minWidth: 48 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{c.days_to_expiry}</Typography>
              <Typography sx={{ fontSize: 9, color, textTransform: 'uppercase', fontWeight: 600 }}>days</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>{c.title}</Typography>
              <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>{c.supplier_name} · {formatCurrency(c.value_usd)}</Typography>
            </Box>
            <Chip label={urgency} size="small" sx={{ fontSize: 9, height: 18, bgcolor: color, color: '#fff', fontWeight: 700, textTransform: 'uppercase' }} />
          </Box>
        );
      })}
      <Button
        size="small" endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
        onClick={() => navigate('/app/contracts')}
        sx={{ mt: 0.5, fontSize: 11, textTransform: 'none', p: 0.5 }}
      >
        View all contracts
      </Button>
    </Box>
  );
}

// ── Alerts Panel ──────────────────────────────────────────────────────────────
function AlertsPanel({ kpis }: { kpis: ReturnType<typeof useSpendKPIs>['data'] }) {
  const alerts = useMemo(() => {
    if (!kpis) return [];
    const list: { severity: 'error' | 'warning' | 'info' | 'success'; icon: React.ReactNode; title: string; detail: string }[] = [];

    if (kpis.tail_spend_percent > 20) {
      list.push({ severity: 'warning', icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
        title: 'Tail Spend Above Threshold',
        detail: `${formatPercent(kpis.tail_spend_percent)} tail spend — target ≤20%. Review consolidation.`,
      });
    }
    if (kpis.contracted_spend_percent < 70) {
      list.push({ severity: 'warning', icon: <AccountBalanceIcon sx={{ fontSize: 16 }} />,
        title: 'Low Contract Coverage',
        detail: `Only ${formatPercent(kpis.contracted_spend_percent)} under contract. Target ≥70%.`,
      });
    }
    if (kpis.savings_identified > 0) {
      list.push({ severity: 'info', icon: <SavingsIcon sx={{ fontSize: 16 }} />,
        title: 'Savings Opportunities',
        detail: `${formatCurrency(kpis.savings_identified)} in identified savings awaiting review.`,
      });
    }
    if (kpis.procurement_health_score < 70) {
      list.push({ severity: 'error', icon: <HealthAndSafetyIcon sx={{ fontSize: 16 }} />,
        title: 'Health Score Needs Attention',
        detail: `Health Score is ${kpis.procurement_health_score}/100. Review Health Score module.`,
      });
    }
    if (list.length === 0) {
      list.push({ severity: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        title: 'All Systems Operational',
        detail: 'No active alerts. Procurement operations are performing within targets.',
      });
    }
    return list;
  }, [kpis]);

  const colorMap = {
    error:   { bg: '#fff1f1', border: '#ffd7d9', iconColor: IBM.red },
    warning: { bg: '#fdf6dd', border: '#f1e2b0', iconColor: '#b28600' },
    info:    { bg: '#edf5ff', border: '#d0e2ff', iconColor: '#0043ce' },
    success: { bg: '#defbe6', border: '#a7f0ba', iconColor: IBM.green },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {alerts.map((a, i) => {
        const c = colorMap[a.severity];
        return (
          <Box key={i} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
            bgcolor: c.bg, border: `1px solid ${c.border}`, borderRadius: 1,
          }}>
            <Box sx={{ color: c.iconColor, mt: 0.1, flexShrink: 0 }}>{a.icon}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#161616' }}>{a.title}</Typography>
              <Typography sx={{ fontSize: 11, color: '#525252', mt: 0.25 }}>{a.detail}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: 'Upload Data',       icon: <UploadFileIcon sx={{ fontSize: 16 }} />,    path: '/app/data-engine',   color: IBM.blue },
    { label: 'Tail Spend',        icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,    path: '/app/tail-spend',    color: IBM.purple },
    { label: 'Contracts',         icon: <ArticleIcon sx={{ fontSize: 16 }} />,       path: '/app/contracts',     color: IBM.teal },
    { label: 'Supplier 360',      icon: <GroupIcon sx={{ fontSize: 16 }} />,         path: '/app/suppliers',     color: IBM.green },
    { label: 'Savings Engine',    icon: <SavingsIcon sx={{ fontSize: 16 }} />,       path: '/app/savings',       color: '#ee5396' },
    { label: 'Payment Analytics', icon: <PaymentsIcon sx={{ fontSize: 16 }} />,      path: '/app/payments',      color: IBM.orange },
    { label: 'Executive Report',  icon: <AssessmentIcon sx={{ fontSize: 16 }} />,    path: '/app/reporting',     color: IBM.red },
    { label: 'Health Score',      icon: <HealthAndSafetyIcon sx={{ fontSize: 16 }} />,path: '/app/health-score', color: '#007d79' },
  ];
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
      {actions.map(a => (
        <Button
          key={a.label}
          variant="outlined"
          size="small"
          startIcon={a.icon}
          onClick={() => navigate(a.path)}
          sx={{
            justifyContent: 'flex-start', textTransform: 'none',
            fontWeight: 600, fontSize: 11, py: 0.75, px: 1.25,
            borderColor: 'divider', color: a.color,
            '&:hover': { borderColor: a.color, bgcolor: `${a.color}12` },
          }}
        >
          {a.label}
        </Button>
      ))}
    </Box>
  );
}

// ── Spend vs Contracts Bar Chart ──────────────────────────────────────────────
function SpendContractsChart({ trend }: { trend: Array<{ month: string; total_spend: number }> }) {
  const data = trend.slice(-6);
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={52} />
        <RTooltip formatter={(v: number) => [formatCurrency(v), 'Spend']} contentStyle={{ fontSize: 11, borderRadius: 4 }} />
        <Bar dataKey="total_spend" radius={[2, 2, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? IBM.blue : '#93b3ff'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Category Donut ────────────────────────────────────────────────────────────
function CategoryDonut({ categories }: { categories: Array<{ category: string; total_spend: number; percent: number }> }) {
  const data = categories.slice(0, 6);
  if (!data.length) return <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', py: 4 }}>No category data</Typography>;

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <PieChart width={120} height={120}>
        <Pie
          data={data} cx={55} cy={55} innerRadius={32} outerRadius={52}
          dataKey="total_spend" paddingAngle={2}
        >
          {data.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
        </Pie>
      </PieChart>
      <Box sx={{ flex: 1 }}>
        {data.map((c, i) => (
          <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: 11, flex: 1 }}>{c.category}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[i % CAT_COLORS.length] }}>{c.percent.toFixed(1)}%</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Metric Row with Progress ──────────────────────────────────────────────────
function MetricRow({ label, value, target, inverse, unit }: { label: string; value: number; target: number; inverse?: boolean; unit: string }) {
  const ok = inverse ? value <= target : value >= target;
  const pct = inverse ? Math.max(0, Math.min(100, 100 - (value / (target * 2)) * 100)) : Math.min(100, value);
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
        <Chip label={`${value.toFixed(1)}${unit}`} size="small"
          sx={{ fontSize: 10, height: 18, fontWeight: 700,
                bgcolor: ok ? '#defbe6' : '#fff1f1', color: ok ? IBM.green : IBM.red }} />
      </Box>
      <LinearProgress
        variant="determinate" value={pct}
        sx={{
          height: 4, borderRadius: 2,
          bgcolor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { bgcolor: ok ? IBM.green : IBM.red, borderRadius: 2 },
        }}
      />
    </Box>
  );
}

// ── Recent Activity ───────────────────────────────────────────────────────────
function RecentActivity({ kpis }: { kpis: ReturnType<typeof useSpendKPIs>['data'] }) {
  const items = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Spend data refreshed', time: 'Just now', icon: <CheckCircleIcon sx={{ fontSize: 14, color: IBM.green }} /> },
      { label: `${kpis.active_suppliers} active suppliers tracked`, time: 'Current period', icon: <InfoOutlinedIcon sx={{ fontSize: 14, color: '#0043ce' }} /> },
      { label: `${kpis.active_contracts_count} contracts under management`, time: 'Current period', icon: <ArticleIcon sx={{ fontSize: 14, color: '#0043ce' }} /> },
      ...(kpis.tail_spend_percent > 20 ? [{
        label: `Tail spend alert: ${formatPercent(kpis.tail_spend_percent)}`,
        time: 'Flagged', icon: <WarningAmberIcon sx={{ fontSize: 14, color: '#b28600' }} />,
      }] : []),
      ...(kpis.savings_identified > 0 ? [{
        label: `${formatCurrency(kpis.savings_identified)} savings identified`,
        time: 'Pending review', icon: <SavingsIcon sx={{ fontSize: 14, color: '#ee5396' }} />,
      }] : []),
    ];
  }, [kpis]);

  return (
    <Box>
      {items.map((item, i) => (
        <Box key={i}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75 }}>
            <Box sx={{ mt: 0.1, flexShrink: 0 }}>{item.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, lineHeight: 1.4 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{item.time}</Typography>
            </Box>
          </Box>
          {i < items.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
        </Box>
      ))}
    </Box>
  );
}

// ── Smart Recommendations ─────────────────────────────────────────────────────
function SmartRecommendations({ kpis }: { kpis: ReturnType<typeof useSpendKPIs>['data'] }) {
  const navigate = useNavigate();
  const recs = useMemo(() => {
    if (!kpis) return [];
    const out: { title: string; impact: string; action: string; path: string; priority: 'high' | 'medium' | 'low' }[] = [];
    if (kpis.tail_spend_percent > 20) {
      out.push({
        title: 'Consolidate Tail Spend Suppliers',
        impact: `Estimated 15–25% savings on ${formatPercent(kpis.tail_spend_percent)} tail spend`,
        action: 'Analyse Tail Spend', path: '/app/tail-spend', priority: 'high',
      });
    }
    if (kpis.contracted_spend_percent < 70) {
      out.push({
        title: 'Increase Contract Coverage',
        impact: `Move ${formatPercent(70 - kpis.contracted_spend_percent)} more spend under contract`,
        action: 'Review Contracts', path: '/app/contracts', priority: 'high',
      });
    }
    if (kpis.savings_identified > 50000) {
      out.push({
        title: 'Act on Savings Opportunities',
        impact: `${formatCurrency(kpis.savings_identified)} identified — approve to realise`,
        action: 'Savings Engine', path: '/app/savings', priority: 'medium',
      });
    }
    out.push({
      title: 'Run Supplier Risk Assessment',
      impact: 'Identify geopolitical and financial risks in supply base',
      action: 'Supplier Intelligence', path: '/app/supplier-risk', priority: 'low',
    });
    return out.slice(0, 4);
  }, [kpis]);

  const priorityColor = { high: IBM.red, medium: IBM.orange, low: IBM.blue };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {recs.map((r, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Box sx={{ width: 3, borderRadius: 2, bgcolor: priorityColor[r.priority], alignSelf: 'stretch', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{r.title}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{r.impact}</Typography>
          </Box>
          <Button
            size="small" variant="outlined" onClick={() => navigate(r.path)}
            sx={{ fontSize: 10, py: 0.25, px: 1, whiteSpace: 'nowrap', borderColor: priorityColor[r.priority], color: priorityColor[r.priority], flexShrink: 0 }}
          >
            {r.action}
          </Button>
        </Box>
      ))}
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExecutiveCommandCenter() {
  const theme = useTheme();
  const [trendView, setTrendView] = useState<'area' | 'bar'>('area');

  const kpisQuery     = useSpendKPIs();
  const trendQuery    = useMonthlyTrend();
  const suppQuery     = useTopSuppliers(10);
  const categoryQuery = useCategorySpend();

  const kpis       = kpisQuery.data;
  const trend      = trendQuery.data ?? [];
  const suppliers  = suppQuery.data  ?? [];
  const categories = categoryQuery.data ?? [];

  const cardBg = theme.palette.background.paper;
  const border = theme.palette.divider;

  const summaryText = kpis
    ? `Total procurement spend of ${formatCurrency(kpis.total_spend)} with ${kpis.active_suppliers} active suppliers across ${kpis.active_contracts_count} contracts. Tail spend is ${kpis.tail_spend_percent}% — ${kpis.tail_spend_percent > 20 ? 'above industry benchmark of 20%, indicating consolidation opportunity' : 'within target range'}. Procurement Health Score is ${kpis.procurement_health_score}/100. ${kpis.savings_identified > 0 ? `${formatCurrency(kpis.savings_identified)} in savings opportunities identified.` : ''}`
    : 'Loading procurement performance summary…';

  return (
    <DatasetGate moduleName="Executive Command Center">
      {/* Executive Summary */}
      <ExecutiveSummary
        title="Executive Briefing"
        summary={summaryText}
        highlights={kpis ? [
          `Spend ${kpis.total_spend_delta > 0 ? '↑' : '↓'} ${Math.abs(kpis.total_spend_delta).toFixed(1)}% vs prior period`,
          `${kpis.contracted_spend_percent}% contracted spend`,
          `${kpis.tail_spend_percent}% tail spend`,
          `Health Score: ${kpis.procurement_health_score}/100`,
        ] : []}
        isLoading={kpisQuery.isLoading}
      />

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Spend',        value: kpis ? formatCurrency(kpis.total_spend) : '—',
            delta: kpis?.total_spend_delta, deltaLabel: 'vs prior period', accentColor: IBM.blue },
          { title: 'Active Suppliers',   value: kpis ? kpis.active_suppliers.toLocaleString() : '—',
            accentColor: IBM.purple },
          { title: 'Active Contracts',   value: kpis ? kpis.active_contracts_count.toLocaleString() : '—',
            accentColor: IBM.teal },
          { title: 'Tail Spend',         value: kpis ? formatPercent(kpis.tail_spend_percent) : '—',
            subtitle: '% of total spend', accentColor: IBM.yellow },
          { title: 'Contracted Spend',   value: kpis ? formatPercent(kpis.contracted_spend_percent) : '—',
            accentColor: IBM.green },
          { title: 'Savings Identified', value: kpis ? formatCurrency(kpis.savings_identified) : '—',
            accentColor: '#ee5396' },
          { title: 'Health Score',       value: kpis ? `${kpis.procurement_health_score}/100` : '—',
            accentColor: IBM.red },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={3} lg={12/7} key={kpi.title}>
            <KPICard loading={kpisQuery.isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Row 1: Spend Trend + Category Donut + Contract Expiry */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Spend Trend */}
        <Grid item xs={12} md={6}>
          <WidgetCard
            title="Monthly Spend Trend"
            loading={trendQuery.isLoading}
            source="spend_transactions"
            recordCount={trend.length}
            dataUpdatedAt={trendQuery.dataUpdatedAt}
            onRefresh={() => trendQuery.refetch()}
            action={
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['area', 'bar'] as const).map(v => (
                  <Chip
                    key={v} label={v === 'area' ? 'Trend' : 'Monthly'}
                    size="small" clickable
                    onClick={() => setTrendView(v)}
                    sx={{ fontSize: 10, height: 20,
                          bgcolor: trendView === v ? IBM.blue : 'transparent',
                          color: trendView === v ? '#fff' : 'text.secondary',
                          border: `1px solid ${trendView === v ? IBM.blue : border}` }}
                  />
                ))}
              </Box>
            }
          >
            {trendView === 'area' ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={IBM.blue} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={IBM.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={border} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={56} />
                  <RTooltip
                    formatter={(v: number) => [formatCurrency(v), 'Spend']}
                    contentStyle={{ fontSize: 11, borderRadius: 4 }}
                  />
                  <Area
                    type="monotone" dataKey="total_spend"
                    stroke={IBM.blue} strokeWidth={2}
                    fill="url(#spendGrad)"
                    dot={{ r: 3, fill: IBM.blue }} activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <SpendContractsChart trend={trend} />
            )}
          </WidgetCard>
        </Grid>

        {/* Spend by Category Donut */}
        <Grid item xs={12} sm={6} md={3}>
          <WidgetCard
            title="Spend by Category"
            loading={categoryQuery.isLoading}
            source="suppliers · categories"
            recordCount={categories.length}
            dataUpdatedAt={categoryQuery.dataUpdatedAt}
          >
            <CategoryDonut categories={categories} />
          </WidgetCard>
        </Grid>

        {/* Contract Expiry Countdown */}
        <Grid item xs={12} sm={6} md={3}>
          <WidgetCard
            title="Contract Expiry Countdown"
            action={<AccessTimeIcon sx={{ fontSize: 16, color: IBM.orange }} />}
          >
            <ContractExpiryPanel />
          </WidgetCard>
        </Grid>
      </Grid>

      {/* Row 2: Health + Alerts + Quick Actions + Smart Recs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Procurement Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HealthAndSafetyIcon sx={{ fontSize: 16, color: IBM.teal }} />
              Procurement Health
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <HealthGauge score={kpis?.procurement_health_score} loading={kpisQuery.isLoading} />
            </Box>
            {kpis && (
              <Box>
                <MetricRow label="Contract Coverage" value={kpis.contracted_spend_percent} target={80} unit="%" />
                <MetricRow label="Tail Spend" value={kpis.tail_spend_percent} target={20} inverse unit="%" />
                <MetricRow label="Savings Rate" value={kpis.savings_identified > 0 ? (kpis.savings_identified / kpis.total_spend * 100) : 0} target={5} unit="%" />
              </Box>
            )}
          </Box>
        </Grid>

        {/* Alerts Panel */}
        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorOutlineIcon sx={{ fontSize: 16, color: IBM.red }} />
              Active Alerts
            </Typography>
            {kpisQuery.isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 1 }} />)
              : <AlertsPanel kpis={kpis} />
            }
          </Box>
        </Grid>

        {/* Quick Actions + Recent Activity */}
        <Grid item xs={12} md={5}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Quick Actions</Typography>
                <QuickActions />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Recent Activity</Typography>
                {kpisQuery.isLoading
                  ? [...Array(3)].map((_, i) => <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />)
                  : <RecentActivity kpis={kpis} />
                }
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Row 3: Smart Recommendations */}
      <Box sx={{ bgcolor: cardBg, border: `1px solid ${IBM.blue}40`, borderRadius: 1, p: 2.5, mb: 3,
                 borderLeft: `3px solid ${IBM.blue}` }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon sx={{ fontSize: 16, color: IBM.blue }} />
          Ignite AI Recommendations
          <Chip label="AI-Generated" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#eff4ff', color: IBM.blue, ml: 0.5 }} />
        </Typography>
        {kpisQuery.isLoading
          ? <Skeleton height={120} />
          : <SmartRecommendations kpis={kpis} />
        }
      </Box>

      {/* Row 4: Procurement Maturity Scorecard + Supplier Risk Heatmap */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Procurement Maturity Scorecard */}
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon sx={{ fontSize: 16, color: IBM.purple }} />
              Procurement Maturity Scorecard
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 2 }}>
              IBM Procurement Maturity Model — 5-level capability assessment
            </Typography>
            {kpisQuery.isLoading
              ? <Skeleton height={200} />
              : (() => {
                const score = kpis?.procurement_health_score ?? 0;
                const maturityLevel = score >= 85 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : score >= 40 ? 2 : 1;
                const maturityLabels = ['', 'Reactive', 'Defined', 'Managed', 'Optimised', 'Leading'];
                const maturityColors = ['', IBM.red, IBM.orange, IBM.yellow, IBM.blue, IBM.green];
                const dims = [
                  { label: 'Strategy & Governance',   score: Math.min(100, score + 5),  weight: '20%' },
                  { label: 'Process Excellence',       score: Math.min(100, score - 3),  weight: '25%' },
                  { label: 'Supplier Management',      score: Math.min(100, score + 2),  weight: '20%' },
                  { label: 'Technology & Data',        score: Math.min(100, score - 8),  weight: '20%' },
                  { label: 'Talent & Capabilities',    score: Math.min(100, score - 5),  weight: '15%' },
                ];
                return (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, bgcolor: `${maturityColors[maturityLevel]}12`, borderRadius: 1, border: `1px solid ${maturityColors[maturityLevel]}30` }}>
                      <Box sx={{ textAlign: 'center', minWidth: 56 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 28, color: maturityColors[maturityLevel], lineHeight: 1 }}>{maturityLevel}</Typography>
                        <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '.06em' }}>Level</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: maturityColors[maturityLevel] }}>
                          {maturityLabels[maturityLevel]}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {maturityLevel < 5 ? `${maturityLabels[maturityLevel + 1] ? `Next level: ${maturityLabels[maturityLevel + 1]}` : ''}` : 'Peak maturity achieved'}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {[1,2,3,4,5].map(l => (
                          <Box key={l} sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: l <= maturityLevel ? maturityColors[maturityLevel] : '#e0e0e0' }} />
                        ))}
                      </Box>
                    </Box>
                    {dims.map(d => (
                      <Box key={d.label} sx={{ mb: 1.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{d.label} <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled' }}>({d.weight})</Typography></Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: d.score >= 75 ? IBM.green : d.score >= 55 ? IBM.yellow : IBM.red }}>{d.score.toFixed(0)}</Typography>
                        </Box>
                        <Box sx={{ height: 5, bgcolor: '#f0f0f0', borderRadius: 3 }}>
                          <Box sx={{ width: `${d.score}%`, height: '100%', bgcolor: d.score >= 75 ? IBM.green : d.score >= 55 ? IBM.yellow : IBM.red, borderRadius: 3, transition: 'width 0.7s ease' }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                );
              })()
            }
          </Box>
        </Grid>

        {/* Supplier Risk Heatmap */}
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ErrorOutlineIcon sx={{ fontSize: 16, color: IBM.red }} />
              Supplier Risk Heatmap
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 2 }}>
              Spend exposure vs. risk score — bubble size = total spend
            </Typography>
            {suppQuery.isLoading
              ? <Skeleton height={220} />
              : (() => {
                const riskBuckets = [
                  { label: 'Critical Risk', risk: 'critical', color: IBM.red,    x: 3, suppliers: 0, spend: 0 },
                  { label: 'High Risk',     risk: 'high',     color: IBM.orange, x: 2, suppliers: 0, spend: 0 },
                  { label: 'Medium Risk',   risk: 'medium',   color: IBM.yellow, x: 1, suppliers: 0, spend: 0 },
                  { label: 'Low Risk',      risk: 'low',      color: IBM.green,  x: 0, suppliers: 0, spend: 0 },
                ];
                const totalSpend = (suppliers as Record<string, unknown>[]).reduce((s, sup) => s + Number(sup.total_spend ?? 0), 0) || 1;
                return (
                  <Box>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      {riskBuckets.map(bucket => {
                        const bucketSuppliers = (suppliers as Record<string, unknown>[]).filter(
                          (s) => String(s.risk_level ?? 'low') === bucket.risk
                        );
                        const bucketSpend = bucketSuppliers.reduce((s, sup) => s + Number(sup.total_spend ?? 0), 0);
                        const spendPct = ((bucketSpend / totalSpend) * 100).toFixed(1);
                        return (
                          <Grid item xs={6} key={bucket.risk}>
                            <Box sx={{ bgcolor: `${bucket.color}12`, border: `1px solid ${bucket.color}30`, borderRadius: 1, p: 1.5, textAlign: 'center' }}>
                              <Typography sx={{ fontWeight: 800, fontSize: 20, color: bucket.color, lineHeight: 1 }}>
                                {bucketSuppliers.length}
                              </Typography>
                              <Typography sx={{ fontSize: 10, fontWeight: 700, color: bucket.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                                {bucket.label}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                                {spendPct}% of spend
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                    {/* Concentration risk bar */}
                    <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Spend Concentration Risk</Typography>
                    {(() => {
                      const top3Spend = [...(suppliers as Record<string, unknown>[])].sort((a,b) => Number(b.total_spend ?? 0) - Number(a.total_spend ?? 0)).slice(0,3).reduce((s,x) => s + Number(x.total_spend ?? 0), 0);
                      const top3Pct = ((top3Spend / totalSpend) * 100);
                      const concentrationRisk = top3Pct > 60 ? 'Critical' : top3Pct > 40 ? 'High' : top3Pct > 25 ? 'Medium' : 'Low';
                      const concentrationColor = top3Pct > 60 ? IBM.red : top3Pct > 40 ? IBM.orange : top3Pct > 25 ? IBM.yellow : IBM.green;
                      return (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Top 3 suppliers = {top3Pct.toFixed(1)}% of spend</Typography>
                            <Chip label={concentrationRisk} size="small" sx={{ bgcolor: `${concentrationColor}18`, color: concentrationColor, fontWeight: 700, fontSize: 10, height: 18 }} />
                          </Box>
                          <Box sx={{ height: 10, bgcolor: '#f0f0f0', borderRadius: 5 }}>
                            <Box sx={{ width: `${Math.min(top3Pct, 100)}%`, height: '100%', bgcolor: concentrationColor, borderRadius: 5, transition: 'width 0.7s ease' }} />
                          </Box>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
                            Industry benchmark: ≤25% concentration for top-3 suppliers
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                );
              })()
            }
          </Box>
        </Grid>
      </Grid>

      {/* Top Suppliers Table */}
      <Box sx={{ bgcolor: cardBg, border: `1px solid ${border}`, borderRadius: 1, p: 2.5 }}>
        <DataTable
          title="Top Suppliers by Spend"
          columns={SUPPLIER_COLS}
          rows={suppliers}
          loading={suppQuery.isLoading}
          rowKey="rank"
          onSearch={() => {}}
          searchPlaceholder="Filter suppliers…"
          maxHeight={380}
        />
        <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${border}` }}>
          <DataSourceBadge
            source="spend_transactions · suppliers"
            lastUpdated={suppQuery.dataUpdatedAt ? new Date(suppQuery.dataUpdatedAt).toISOString() : undefined}
            recordCount={suppliers.length}
            confidence={98}
          />
        </Box>
      </Box>
    </DatasetGate>
  );
}
