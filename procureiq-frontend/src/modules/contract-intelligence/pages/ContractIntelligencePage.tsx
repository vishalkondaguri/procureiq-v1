/**
 * Contract Intelligence — Enterprise Module
 * Full contract lifecycle management with AI risk analysis,
 * expiry alerts, value-at-risk visualization, and Ignite AI insights.
 */
import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, Alert, Button,
  Select, MenuItem, FormControl, InputLabel,
  LinearProgress, Tooltip,
} from '@mui/material';
import AccessTimeIcon        from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutoAwesomeIcon       from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon      from '@mui/icons-material/ErrorOutline';
import ArticleIcon           from '@mui/icons-material/Article';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, ComposedChart, Line,
} from 'recharts';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary      from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import KPICard               from '@/core/components/KPICard/KPICard';
import StatusBadge           from '@/core/components/StatusBadge/StatusBadge';
import { useContracts, useContractKPIs, useContractExpiryTimeline } from '../hooks/useContractData';
import { formatCurrency, formatDate } from '@/core/utils/format';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

// ── Color palette ──────────────────────────────────────────────────────────────
const IBM = {
  blue:   '#0f62fe', purple: '#6929c4', teal: '#007d79',
  green:  '#198038', yellow: '#f1c21b', red:  '#da1e28',
  orange: '#ff832b', muted:  '#525252', border: '#e0e0e0',
  bg:     '#f4f4f4', navy:   '#001d6c',
};

const URGENCY_COLOR = (days: number | null): string => {
  if (days === null || days < 0) return IBM.red;
  if (days <= 30)  return IBM.red;
  if (days <= 90)  return IBM.yellow;
  return IBM.green;
};

// ── Contract table columns ─────────────────────────────────────────────────────
const CONTRACT_COLS: Column<Record<string, unknown>>[] = [
  { id: 'supplier_name', label: 'Supplier',       minWidth: 180 },
  { id: 'title',         label: 'Contract Title', minWidth: 260 },
  { id: 'status',        label: 'Status',         minWidth: 140,
    format: v => <StatusBadge status={String(v)} /> },
  { id: 'start_date',    label: 'Start Date',     minWidth: 110,
    format: v => formatDate(String(v ?? '')) },
  { id: 'end_date',      label: 'Expiry Date',    minWidth: 110,
    format: v => formatDate(String(v ?? '')) },
  { id: 'days_to_expiry', label: 'Days Left',     minWidth: 90, align: 'right',
    format: (v, _row) => {
      if (v === null || v === undefined) return '—';
      const d = Number(v);
      const color = URGENCY_COLOR(d);
      if (d < 0) return <Typography sx={{ color: IBM.red, fontWeight: 700, fontSize: 13 }}>Expired</Typography>;
      return <Typography sx={{ color, fontWeight: 700, fontSize: 13 }}>{d}d</Typography>;
    }
  },
  { id: 'value_usd', label: 'Value (USD)', minWidth: 130, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'has_ai_analysis', label: 'AI', minWidth: 68, align: 'center',
    format: v => v
      ? <Tooltip title="Analysed by Ignite AI"><CheckCircleOutlineIcon sx={{ color: IBM.green, fontSize: 18 }} /></Tooltip>
      : <Chip label="Analyze" size="small" sx={{ bgcolor: '#eff4ff', color: IBM.blue, fontSize: 10, height: 20, cursor: 'pointer', fontWeight: 600 }} />
  },
];

// ── Risk Badge ─────────────────────────────────────────────────────────────────
function RiskBadge({ days, value }: { days: number | null; value: number }) {
  const isExpired = days !== null && days < 0;
  const isCritical = days !== null && days >= 0 && days <= 30;
  const isWarning  = days !== null && days > 30 && days <= 90;

  if (isExpired) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#fff1f1', border: `1px solid ${IBM.red}20`, borderRadius: 1, px: 1.5, py: 0.75 }}>
      <ErrorOutlineIcon sx={{ color: IBM.red, fontSize: 16 }} />
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: IBM.red }}>EXPIRED</Typography>
        <Typography sx={{ fontSize: 10, color: IBM.muted }}>{formatCurrency(value)} at risk</Typography>
      </Box>
    </Box>
  );

  if (isCritical) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#fff8f0', border: `1px solid ${IBM.orange}30`, borderRadius: 1, px: 1.5, py: 0.75 }}>
      <WarningAmberIcon sx={{ color: IBM.orange, fontSize: 16 }} />
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: IBM.orange }}>{days}d to expiry</Typography>
        <Typography sx={{ fontSize: 10, color: IBM.muted }}>{formatCurrency(value)} value</Typography>
      </Box>
    </Box>
  );

  if (isWarning) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#fffce0', border: `1px solid ${IBM.yellow}40`, borderRadius: 1, px: 1.5, py: 0.75 }}>
      <AccessTimeIcon sx={{ color: IBM.yellow, fontSize: 16 }} />
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#b45309' }}>{days}d to expiry</Typography>
        <Typography sx={{ fontSize: 10, color: IBM.muted }}>{formatCurrency(value)} value</Typography>
      </Box>
    </Box>
  );

  return null;
}

// ── Value-at-Risk meter ────────────────────────────────────────────────────────
function ValueAtRiskMeter({ kpis }: { kpis: Record<string, number> }) {
  const expired  = kpis.expired_contracts ?? 0;
  const expiring = kpis.expiring_within_90_days ?? 0;
  const total    = kpis.total_contracts ?? 1;
  const riskPct  = ((expired + expiring) / total) * 100;

  const color = riskPct > 30 ? IBM.red : riskPct > 15 ? IBM.yellow : IBM.green;

  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>Contract Risk Exposure</Typography>
      <Typography sx={{ fontSize: 11, color: IBM.muted, mb: 2 }}>
        Contracts expired or expiring within 90 days as % of portfolio
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 32, color, lineHeight: 1 }}>{riskPct.toFixed(0)}%</Typography>
        <Box>
          <Typography sx={{ fontSize: 12, color: IBM.muted }}>{expired} expired</Typography>
          <Typography sx={{ fontSize: 12, color: IBM.muted }}>{expiring} expiring ≤90d</Typography>
        </Box>
      </Box>
      <Box sx={{ height: 8, bgcolor: IBM.bg, borderRadius: 4 }}>
        <Box sx={{ height: 8, width: `${Math.min(riskPct, 100)}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography sx={{ fontSize: 10, color: IBM.green }}>Low risk</Typography>
        <Typography sx={{ fontSize: 10, color: IBM.muted }}>Benchmark: &lt;10%</Typography>
        <Typography sx={{ fontSize: 10, color: IBM.red }}>High risk</Typography>
      </Box>
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ContractIntelligencePage() {
  const [page, setPage]               = useState(0);
  const [pageSize, setPageSize]       = useState(50);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [expiringFilter, setExpiring] = useState('');
  const [showIgnite, setShowIgnite]   = useState(true);

  const expiringDays = expiringFilter === '30' ? 30 : expiringFilter === '90' ? 90 : undefined;

  const { data, isLoading }                       = useContracts({ page: page + 1, page_size: pageSize, status: statusFilter || undefined, search: search || undefined, expiring_within_days: expiringDays });
  const { data: kpis, isLoading: kpiLoading }     = useContractKPIs();
  const { data: timeline }                         = useContractExpiryTimeline();

  const contracts     = data?.data ?? [];
  const total         = data?.meta?.total ?? 0;
  const expiringCount = kpis?.expiring_within_90_days ?? 0;
  const expiredCount  = kpis?.expired_contracts ?? 0;

  // Enrich timeline with cumulative value
  const chartData = (timeline ?? []).map((t: Record<string, unknown>, i: number, arr: Record<string, unknown>[]) => ({
    ...t,
    cumulative: arr.slice(0, i + 1).reduce((s: number, r: Record<string, unknown>) => s + Number(r.value_usd ?? 0), 0),
  }));

  const criticalContracts = contracts.filter((c: Record<string, unknown>) => {
    const d = Number(c.days_to_expiry);
    return d >= 0 && d <= 30;
  });

  const summary = kpis
    ? `Managing ${kpis.total_contracts} contracts with a combined active value of ${formatCurrency(kpis.total_active_value_usd)}. ` +
      `${kpis.expiring_within_90_days} contracts are expiring within 90 days — requiring immediate renewal review. ` +
      `${kpis.expired_contracts} contracts have already expired and may represent commercial value leakage. ` +
      `${kpis.contracts_with_ai_analysis} contracts have been AI-analysed by Ignite.`
    : 'Loading contract intelligence…';

  return (
    <DatasetGate moduleName="Contract Intelligence">
    <Box>
      <ExecutiveSummary
        title="Contract Intelligence"
        summary={summary}
        highlights={kpis ? [
          `${kpis.active_contracts} active`,
          `${kpis.expiring_within_90_days} expiring ≤90d`,
          `${kpis.expired_contracts} expired`,
          `${formatCurrency(kpis.total_active_value_usd)} total value`,
        ] : []}
        isLoading={kpiLoading}
      />

      {/* Critical alerts */}
      {expiredCount > 0 && !kpiLoading && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 1.5 }}>
          <strong>{expiredCount} expired contract{expiredCount !== 1 ? 's' : ''}</strong> — any spend continuing under expired contracts is a compliance and commercial risk. Issue new agreements or cease purchasing immediately.
        </Alert>
      )}
      {expiringCount > 0 && !kpiLoading && (
        <Alert severity="warning" icon={<AccessTimeIcon />} sx={{ mb: 3 }}>
          <strong>{expiringCount} contract{expiringCount !== 1 ? 's' : ''} expiring within 90 days.</strong> Begin renewal negotiations now to lock in favourable pricing and avoid auto-renewal on unfavourable legacy terms.
        </Alert>
      )}

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Contracts',     value: kpis?.total_contracts?.toString() ?? '—',          accentColor: IBM.blue },
          { title: 'Active',              value: kpis?.active_contracts?.toString() ?? '—',          accentColor: IBM.green },
          { title: 'Expiring ≤ 90 Days',  value: kpis?.expiring_within_90_days?.toString() ?? '—',  accentColor: IBM.yellow },
          { title: 'Expired',             value: kpis?.expired_contracts?.toString() ?? '—',         accentColor: IBM.red },
          { title: 'Total Active Value',  value: kpis ? formatCurrency(kpis.total_active_value_usd) : '—', accentColor: IBM.purple },
          { title: 'AI Analysed',         value: kpis?.contracts_with_ai_analysis?.toString() ?? '—', accentColor: IBM.teal },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2} key={kpi.title}>
            <KPICard loading={kpiLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Expiry timeline */}
        <Grid item xs={12} md={8}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Contract Expiry Timeline — Next 12 Months</Typography>
            {timeline && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <RTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="count" name="# Contracts" radius={[3,3,0,0]}>
                    {chartData.map((entry: Record<string, unknown>, i: number) => (
                      <Cell key={i} fill={Number(entry.count) > 0 && timeline?.[i] ? (Number((timeline as Record<string, unknown>[])[i]?.days_avg ?? 999) <= 30 ? IBM.red : Number((timeline as Record<string, unknown>[])[i]?.days_avg ?? 999) <= 90 ? IBM.yellow : IBM.blue) : IBM.blue} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="value_usd" stroke={IBM.purple} strokeWidth={2} dot={false} name="Value ($)" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>No expiry timeline data available</Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Risk exposure + critical list */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {kpis && <ValueAtRiskMeter kpis={kpis as unknown as Record<string, number>} />}
            {criticalContracts.length > 0 && (
              <Box sx={{ bgcolor: '#fff8f0', border: `1px solid ${IBM.orange}30`, borderRadius: 1, p: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12, color: IBM.orange, mb: 1 }}>
                  {criticalContracts.length} CRITICAL — Expiring in ≤30 Days
                </Typography>
                {criticalContracts.slice(0, 3).map((c: Record<string, unknown>, i: number) => (
                  <RiskBadge key={i} days={Number(c.days_to_expiry)} value={Number(c.value_usd ?? 0)} />
                ))}
                {criticalContracts.length > 3 && (
                  <Typography sx={{ fontSize: 11, color: IBM.muted, mt: 1 }}>+{criticalContracts.length - 3} more critical contracts</Typography>
                )}
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Ignite AI Panel */}
      {showIgnite && (
        <Box sx={{ bgcolor: '#eff4ff', border: `1px solid #d0e2ff`, borderRadius: 1.5, p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: IBM.blue, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0043ce' }}>Ignite AI — Contract Intelligence Brief</Typography>
              <Chip label="Live Analysis" size="small" sx={{ bgcolor: '#d0e2ff', color: '#0043ce', fontSize: 10, fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={() => setShowIgnite(false)} sx={{ color: IBM.muted, fontSize: 11, minWidth: 0 }}>Dismiss</Button>
          </Box>
          <Grid container spacing={2}>
            {[
              {
                icon: <ArticleIcon sx={{ fontSize: 16, color: IBM.blue }} />,
                title: 'Renewal Priority',
                text: kpis
                  ? `${kpis.expiring_within_90_days} contracts need renewal attention. Focus first on highest-value contracts — these represent the greatest commercial exposure if allowed to lapse or auto-renew on legacy terms.`
                  : 'Loading...',
                color: IBM.blue,
              },
              {
                icon: <ErrorOutlineIcon sx={{ fontSize: 16, color: IBM.red }} />,
                title: 'Compliance Risk',
                text: kpis && kpis.expired_contracts > 0
                  ? `${kpis.expired_contracts} expired contracts detected. Purchasing under expired contracts creates legal liability and price risk. Immediate action required — issue emergency short-term agreements or pause spend.`
                  : 'No expired contracts detected. Monitor renewal pipeline to maintain this position.',
                color: IBM.red,
              },
              {
                icon: <CheckCircleOutlineIcon sx={{ fontSize: 16, color: IBM.teal }} />,
                title: 'AI Coverage Gap',
                text: kpis
                  ? `${kpis.contracts_with_ai_analysis} of ${kpis.total_contracts} contracts have been Ignite AI-analysed. Analyse remaining contracts to surface hidden clause risks, unfavourable escalation terms, and renewal leverage points.`
                  : 'Loading...',
                color: IBM.teal,
              },
            ].map((insight, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box sx={{ bgcolor: '#fff', borderRadius: 1, p: 1.75, border: `1px solid ${insight.color}20` }}>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                    {insight.icon}
                    <Typography sx={{ fontWeight: 700, fontSize: 12, color: insight.color }}>{insight.title}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.6 }}>{insight.text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {kpiLoading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => { setStatus(e.target.value); setPage(0); }}>
            <MenuItem value="">All Statuses</MenuItem>
            {['active', 'expiring_soon', 'expired', 'draft', 'terminated'].map(s => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Expiring Within</InputLabel>
          <Select value={expiringFilter} label="Expiring Within" onChange={e => { setExpiring(e.target.value); setPage(0); }}>
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="30">30 days</MenuItem>
            <MenuItem value="90">90 days</MenuItem>
          </Select>
        </FormControl>
        {(statusFilter || expiringFilter) && (
          <Button size="small" onClick={() => { setStatus(''); setExpiring(''); setPage(0); }}
            sx={{ color: IBM.muted, fontSize: 12 }}>Clear filters</Button>
        )}
      </Box>

      {/* Contract Table */}
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1 }}>
        <DataTable
          title={`Contract Repository${total > 0 ? ` — ${total} contracts` : ''}`}
          columns={CONTRACT_COLS}
          rows={contracts as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="id"
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={q => { setSearch(q); setPage(0); }}
          searchPlaceholder="Search by supplier, contract title…"
        />
      </Box>
    </Box>
    </DatasetGate>
  );
}