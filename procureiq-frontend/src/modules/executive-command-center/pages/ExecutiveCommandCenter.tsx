import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Box, Typography, Skeleton, Alert, Button, Chip, Divider } from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
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
import KPICard             from '@/core/components/KPICard/KPICard';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary    from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import DataSourceBadge     from '@/core/components/DataSourceBadge';
import {
  useSpendKPIs, useMonthlyTrend, useTopSuppliers, useCategorySpend, useDataStatus,
} from '../hooks/useSpendData';
import { formatCurrency, formatPercent } from '@/core/utils/format';

// ─── Colour palette for categories ────────────────────────────────────────────
const CAT_COLORS = [
  '#0f62fe', '#6929c4', '#007d79', '#f1c21b',
  '#198038', '#da1e28', '#0043ce', '#9f1853',
  '#005d5d', '#570408',
];

// ─── Top-supplier table columns ───────────────────────────────────────────────
const SUPPLIER_COLS: Column<Record<string, unknown>>[] = [
  { id: 'rank',             label: '#',            minWidth: 48,  align: 'center' },
  { id: 'supplier_name',   label: 'Supplier',      minWidth: 200 },
  { id: 'total_spend',     label: 'Total Spend',   minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'spend_percent',   label: 'Share %',       minWidth: 100, align: 'right',
    format: v => `${Number(v).toFixed(1)}%` },
  { id: 'cumulative_percent', label: 'Cumulative %', minWidth: 120, align: 'right',
    format: v => `${Number(v).toFixed(1)}%` },
];

// ─── Y-axis smart formatter ────────────────────────────────────────────────────
function formatYAxis(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ─── Widget card wrapper ───────────────────────────────────────────────────────
function WidgetCard({
  title, children, loading, source, recordCount, dataUpdatedAt,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  source?: string;
  recordCount?: number;
  dataUpdatedAt?: number;
}) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1 }}>
        {loading ? <Skeleton variant="rectangular" height={220} /> : children}
      </Box>
      {source && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #f0f0f0' }}>
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

// ─── Procurement Health Score Gauge ───────────────────────────────────────────
function HealthGauge({ score, loading }: { score: number | undefined; loading: boolean }) {
  if (loading) return <Skeleton variant="circular" width={100} height={100} sx={{ mx: 'auto' }} />;
  if (score == null) return null;

  const color = score >= 80 ? '#198038' : score >= 60 ? '#f1c21b' : '#da1e28';
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Acceptable' : 'Needs Attention';

  // SVG arc gauge
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

// ─── Today's Priorities ────────────────────────────────────────────────────────
function TodaysPriorities({ kpis }: { kpis: ReturnType<typeof useSpendKPIs>['data'] }) {
  const items = useMemo(() => {
    if (!kpis) return [];
    const list: { icon: React.ReactNode; label: string; detail: string; severity: 'error' | 'warning' | 'info' | 'success' }[] = [];

    if (kpis.tail_spend_percent > 20) {
      list.push({
        icon: <WarningAmberIcon sx={{ fontSize: 16 }} />,
        label: 'Tail Spend Above Threshold',
        detail: `${formatPercent(kpis.tail_spend_percent)} tail spend — target is ≤20%. Review supplier consolidation opportunities.`,
        severity: 'warning',
      });
    }
    if (kpis.contracted_spend_percent < 70) {
      list.push({
        icon: <AccountBalanceIcon sx={{ fontSize: 16 }} />,
        label: 'Low Contract Coverage',
        detail: `Only ${formatPercent(kpis.contracted_spend_percent)} of spend is under contract. Prioritise contract negotiations.`,
        severity: 'warning',
      });
    }
    if (kpis.savings_identified > 0) {
      list.push({
        icon: <SavingsIcon sx={{ fontSize: 16 }} />,
        label: 'Savings Opportunities Available',
        detail: `${formatCurrency(kpis.savings_identified)} in identified savings — review the Savings Engine for action items.`,
        severity: 'info',
      });
    }
    if (kpis.procurement_health_score < 70) {
      list.push({
        icon: <AssessmentIcon sx={{ fontSize: 16 }} />,
        label: 'Procurement Health Needs Attention',
        detail: `Health Score is ${kpis.procurement_health_score}/100. Review dimensions in the Health Score module.`,
        severity: 'error',
      });
    }
    if (list.length === 0) {
      list.push({
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        label: 'All Priorities On Track',
        detail: 'No immediate action required. Continue monitoring spend trends and supplier performance.',
        severity: 'success',
      });
    }
    return list;
  }, [kpis]);

  const colorMap = {
    error:   { bg: '#fff1f1', border: '#ffd7d9', icon: '#da1e28' },
    warning: { bg: '#fdf6dd', border: '#f1e2b0', icon: '#b28600' },
    info:    { bg: '#edf5ff', border: '#d0e2ff', icon: '#0043ce' },
    success: { bg: '#defbe6', border: '#a7f0ba', icon: '#198038' },
  };

  return (
    <Box>
      {items.map((item, i) => {
        const c = colorMap[item.severity];
        return (
          <Box key={i} sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
            bgcolor: c.bg, border: `1px solid ${c.border}`, borderRadius: 1,
            mb: i < items.length - 1 ? 1 : 0,
          }}>
            <Box sx={{ color: c.icon, mt: 0.1, flexShrink: 0 }}>{item.icon}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#161616' }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 12, color: '#525252', mt: 0.25 }}>{item.detail}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: 'Upload Procurement Data', icon: <UploadFileIcon sx={{ fontSize: 18 }} />, path: '/app/data-engine', color: '#0f62fe' },
    { label: 'Analyse Tail Spend',      icon: <TrendingUpIcon sx={{ fontSize: 18 }} />, path: '/app/tail-spend',  color: '#6929c4' },
    { label: 'Review Contracts',        icon: <ArticleIcon sx={{ fontSize: 18 }} />,    path: '/app/contracts',   color: '#007d79' },
    { label: 'Supplier 360',            icon: <GroupIcon sx={{ fontSize: 18 }} />,      path: '/app/suppliers',   color: '#198038' },
    { label: 'Savings Engine',          icon: <SavingsIcon sx={{ fontSize: 18 }} />,    path: '/app/savings',     color: '#ee5396' },
    { label: 'Executive Report',        icon: <AssessmentIcon sx={{ fontSize: 18 }} />, path: '/app/reporting',   color: '#da1e28' },
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
            fontWeight: 600, fontSize: 12, py: 0.75, px: 1.25,
            borderColor: '#e0e0e0', color: a.color,
            '&:hover': { borderColor: a.color, bgcolor: `${a.color}10` },
          }}
        >
          {a.label}
        </Button>
      ))}
    </Box>
  );
}

// ─── Recent Activity ───────────────────────────────────────────────────────────
function RecentActivity({ kpis }: { kpis: ReturnType<typeof useSpendKPIs>['data'] }) {
  const items = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Spend data refreshed',
        time: 'Just now',
        icon: <CheckCircleIcon sx={{ fontSize: 14, color: '#198038' }} />,
      },
      {
        label: `${kpis.active_suppliers} active suppliers tracked`,
        time: 'Current period',
        icon: <InfoOutlinedIcon sx={{ fontSize: 14, color: '#0043ce' }} />,
      },
      {
        label: `${kpis.active_contracts_count} contracts under management`,
        time: 'Current period',
        icon: <InfoOutlinedIcon sx={{ fontSize: 14, color: '#0043ce' }} />,
      },
      ...(kpis.tail_spend_percent > 20 ? [{
        label: `Tail spend alert: ${formatPercent(kpis.tail_spend_percent)}`,
        time: 'Flagged',
        icon: <WarningAmberIcon sx={{ fontSize: 14, color: '#b28600' }} />,
      }] : []),
      ...(kpis.savings_identified > 0 ? [{
        label: `${formatCurrency(kpis.savings_identified)} savings identified`,
        time: 'Pending review',
        icon: <SavingsIcon sx={{ fontSize: 14, color: '#ee5396' }} />,
      }] : []),
    ];
  }, [kpis]);

  return (
    <Box>
      {items.map((item, i) => (
        <Box key={i}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1 }}>
            <Box sx={{ mt: 0.1, flexShrink: 0 }}>{item.icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: '#161616', lineHeight: 1.4 }}>{item.label}</Typography>
              <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>{item.time}</Typography>
            </Box>
          </Box>
          {i < items.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
        </Box>
      ))}
      {items.length === 0 && (
        <Typography sx={{ fontSize: 12, color: '#8d8d8d', py: 2, textAlign: 'center' }}>
          No recent activity
        </Typography>
      )}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExecutiveCommandCenter() {
  const kpisQuery       = useSpendKPIs();
  const trendQuery      = useMonthlyTrend();
  const suppQuery       = useTopSuppliers(10);
  const categoryQuery   = useCategorySpend();
  const dataStatusQuery = useDataStatus();

  const kpis       = kpisQuery.data;
  const trend      = trendQuery.data ?? [];
  const suppliers  = suppQuery.data  ?? [];
  const categories = categoryQuery.data ?? [];
  const dataStatus = dataStatusQuery.data;

  // Fallback categories when DB has no category data
  const displayCategories = categories.length > 0
    ? categories.slice(0, 8)
    : [
        { category: 'Software & Cloud',     percent: 38, total_spend: 0 },
        { category: 'Consulting',            percent: 22, total_spend: 0 },
        { category: 'IT Services',           percent: 18, total_spend: 0 },
        { category: 'Hardware & Networking', percent: 11, total_spend: 0 },
        { category: 'Data & Analytics',      percent:  7, total_spend: 0 },
        { category: 'Other',                 percent:  4, total_spend: 0 },
      ];

  const summaryText = kpis
    ? `Total procurement spend of ${formatCurrency(kpis.total_spend)} with ${kpis.active_suppliers} active suppliers across ${kpis.active_contracts_count} contracts. Tail spend is ${kpis.tail_spend_percent}% — ${kpis.tail_spend_percent > 20 ? 'above industry benchmark of 20%, indicating consolidation opportunity' : 'within target range'}. Procurement Health Score is ${kpis.procurement_health_score}/100. ${kpis.savings_identified > 0 ? `${formatCurrency(kpis.savings_identified)} in savings opportunities identified.` : ''}`
    : 'Loading procurement performance summary…';

  return (
    <Box>
      {/* Demo Mode Banner */}
      {dataStatus?.is_demo_only && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          action={
            <Button color="inherit" size="small" href="/app/ide" sx={{ fontWeight: 700, fontSize: 12 }}>
              Upload Data
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <strong>Demo Dataset</strong> — You are viewing the built-in seed dataset.
          Upload real procurement files via the Intelligent Data Engine to see your organisation's data.
        </Alert>
      )}

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
            delta: kpis?.total_spend_delta, deltaLabel: 'vs prior period', accentColor: '#0f62fe' },
          { title: 'Active Suppliers',   value: kpis ? kpis.active_suppliers.toLocaleString() : '—',
            accentColor: '#6929c4' },
          { title: 'Active Contracts',   value: kpis ? kpis.active_contracts_count.toLocaleString() : '—',
            accentColor: '#007d79' },
          { title: 'Tail Spend',         value: kpis ? formatPercent(kpis.tail_spend_percent) : '—',
            subtitle: '% of total spend', accentColor: '#f1c21b' },
          { title: 'Contracted Spend',   value: kpis ? formatPercent(kpis.contracted_spend_percent) : '—',
            accentColor: '#198038' },
          { title: 'Savings Identified', value: kpis ? formatCurrency(kpis.savings_identified) : '—',
            accentColor: '#ee5396' },
          { title: 'Health Score',       value: kpis ? `${kpis.procurement_health_score}/100` : '—',
            accentColor: '#da1e28' },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={3} lg={12/7} key={kpi.title}>
            <KPICard loading={kpisQuery.isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Monthly Spend Trend */}
        <Grid item xs={12} md={8}>
          <WidgetCard
            title="Monthly Spend Trend"
            loading={trendQuery.isLoading}
            source="spend_transactions"
            recordCount={trend.length}
            dataUpdatedAt={trendQuery.dataUpdatedAt}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0f62fe" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f62fe" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={60} />
                <RTooltip
                  formatter={(v: number) => [formatCurrency(v), 'Spend']}
                  contentStyle={{ fontSize: 12, borderRadius: 4 }}
                />
                <Area
                  type="monotone" dataKey="total_spend"
                  stroke="#0f62fe" strokeWidth={2}
                  fill="url(#spendGrad)"
                  dot={{ r: 3, fill: '#0f62fe' }} activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>
        </Grid>

        {/* Spend by Category */}
        <Grid item xs={12} md={4}>
          <WidgetCard
            title="Spend by Category"
            loading={categoryQuery.isLoading}
            source="suppliers · categories"
            recordCount={categories.length}
            dataUpdatedAt={categoryQuery.dataUpdatedAt}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
              {displayCategories.map((c, i) => {
                const pct = c.percent;
                const color = CAT_COLORS[i % CAT_COLORS.length];
                const label = categories.length > 0 && c.total_spend > 0
                  ? formatCurrency(c.total_spend)
                  : '';
                return (
                  <Box key={c.category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" sx={{ fontSize: 11, maxWidth: '70%' }} noWrap>
                        {c.category}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        {label && (
                          <Typography variant="caption" sx={{ fontSize: 10, color: '#8d8d8d' }}>
                            {label}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 12, color }}>
                          {pct.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ height: 6, bgcolor: '#f0f0f0', borderRadius: 3 }}>
                      <Box sx={{ height: 6, width: `${Math.min(100, pct)}%`, bgcolor: color, borderRadius: 3 }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </WidgetCard>
        </Grid>
      </Grid>

      {/* Operational Panels row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Health Score Gauge */}
        <Grid item xs={12} sm={6} md={3}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Procurement Health</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <HealthGauge score={kpis?.procurement_health_score} loading={kpisQuery.isLoading} />
            </Box>
            {kpis && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {[
                  { label: 'Contract Coverage', val: kpis.contracted_spend_percent, target: 80, unit: '%' },
                  { label: 'Tail Spend',         val: kpis.tail_spend_percent,       target: 20, inverse: true, unit: '%' },
                ].map(d => {
                  const ok = d.inverse ? d.val <= d.target : d.val >= d.target;
                  return (
                    <Box key={d.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 11, color: '#525252' }}>{d.label}</Typography>
                      <Chip
                        label={`${d.val.toFixed(1)}${d.unit}`}
                        size="small"
                        sx={{ fontSize: 10, height: 18, fontWeight: 700,
                              bgcolor: ok ? '#defbe6' : '#fff1f1',
                              color:   ok ? '#198038' : '#da1e28' }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Today's Priorities */}
        <Grid item xs={12} sm={6} md={5}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Today's Priorities</Typography>
            {kpisQuery.isLoading
              ? [...Array(3)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 1 }} />)
              : <TodaysPriorities kpis={kpis} />
            }
          </Box>
        </Grid>

        {/* Quick Actions + Recent Activity */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Quick Actions</Typography>
                <QuickActions />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>Recent Activity</Typography>
                {kpisQuery.isLoading
                  ? [...Array(3)].map((_, i) => <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />)
                  : <RecentActivity kpis={kpis} />
                }
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Top Suppliers Table */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
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
        <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #f0f0f0' }}>
          <DataSourceBadge
            source="spend_transactions · suppliers"
            lastUpdated={suppQuery.dataUpdatedAt ? new Date(suppQuery.dataUpdatedAt).toISOString() : undefined}
            recordCount={suppliers.length}
            confidence={98}
          />
        </Box>
      </Box>
    </Box>
  );
}
