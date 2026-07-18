/**
 * Tail Spend Intelligence — Enterprise Module
 * Pareto threshold analysis, category breakdown, concentration risk,
 * and Ignite AI consolidation recommendations.
 */
import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, Slider, Paper, Alert, Button,
} from '@mui/material';
import AutoAwesomeIcon        from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import TrendingDownIcon       from '@mui/icons-material/TrendingDown';
import CompareArrowsIcon      from '@mui/icons-material/CompareArrows';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap,
} from 'recharts';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import KPICard from '@/core/components/KPICard/KPICard';
import { useTailSpend } from '@/modules/executive-command-center/hooks/useSpendData';
import { formatCurrency, formatPercent } from '@/core/utils/format';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

// ── Palette ────────────────────────────────────────────────────────────────────
const IBM = {
  blue:   '#0f62fe', purple: '#6929c4', teal: '#007d79',
  green:  '#198038', yellow: '#f1c21b', red:  '#da1e28',
  orange: '#ff832b', muted:  '#525252', border: '#e0e0e0',
  bg:     '#f4f4f4',
};

const TAIL_COLORS = [IBM.red, '#ee5396', IBM.orange, IBM.yellow, IBM.purple];
const PIE_COLORS  = [IBM.blue, IBM.red];

// ── Table columns ─────────────────────────────────────────────────────────────
const TAIL_COLS: Column<Record<string, unknown>>[] = [
  { id: 'supplier_name', label: 'Supplier',    minWidth: 200 },
  { id: 'category',      label: 'Category',    minWidth: 160 },
  { id: 'total_spend',   label: 'Spend (USD)', minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'spend_percent', label: 'Share %',     minWidth: 100, align: 'right',
    format: v => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, height: 4, bgcolor: '#f0f0f0', borderRadius: 2 }}>
          <Box sx={{ height: 4, width: `${Math.min(Number(v) * 2, 100)}%`, bgcolor: IBM.red, borderRadius: 2 }} />
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: IBM.red, minWidth: 42, textAlign: 'right' }}>
          {Number(v).toFixed(2)}%
        </Typography>
      </Box>
    ),
  },
];

// ── Treemap custom content ─────────────────────────────────────────────────────
function TreemapContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, value, index } = props as {
    x: number; y: number; width: number; height: number;
    name: string; value: number; index: number;
  };
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        style={{ fill: TAIL_COLORS[index % TAIL_COLORS.length], stroke: '#fff', strokeWidth: 2, opacity: 0.85 }} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="700">
            {String(name).length > 14 ? String(name).slice(0, 12) + '…' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>
            {formatCurrency(value)}
          </text>
        </>
      )}
    </g>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────────
function RecommendationCard({ title, savings, action, color, icon }: {
  title: string; savings: string; action: string; color: string;
  icon: React.ReactNode;
}) {
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${color}20`, borderRadius: 1, p: 1.75, height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
        {icon}
        <Typography sx={{ fontWeight: 700, fontSize: 12, color }}>{title}</Typography>
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color, mb: 0.5 }}>{savings}</Typography>
      <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.5 }}>{action}</Typography>
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TailSpendPage() {
  const [threshold, setThreshold] = useState(80);
  const [showIgnite, setShowIgnite] = useState(true);
  const { data, isLoading } = useTailSpend(threshold);

  const totalTailSpend  = data?.tail_spend_total ?? 0;
  const tailPct         = data?.tail_spend_percent ?? 0;
  const tailCount       = data?.tail_supplier_count ?? 0;
  const strategicCount  = data?.strategic_suppliers?.length ?? 0;
  const tailSuppliers   = data?.tail_suppliers ?? [];

  // Category breakdown from tail suppliers
  const categoryMap: Record<string, number> = {};
  (tailSuppliers as Record<string, unknown>[]).forEach((s) => {
    const cat = String(s.category ?? 'Uncategorized');
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(s.total_spend ?? 0);
  });
  const categoryData = Object.entries(categoryMap)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const pieData = [
    { name: 'Strategic Spend', value: Math.round(100 - tailPct) },
    { name: 'Tail Spend',      value: Math.round(tailPct) },
  ];

  // Savings estimates
  const consolidationSavings = totalTailSpend * 0.08;
  const catalogueSavings     = totalTailSpend * 0.05;
  const totalPotential       = consolidationSavings + catalogueSavings;

  const summary = data
    ? `Tail spend analysis shows ${formatPercent(tailPct)} (${formatCurrency(totalTailSpend)}) of total spend spread across ${tailCount} suppliers. ` +
      `${tailPct > 20 ? `Above the 20% industry benchmark. Consolidating to ${Math.round(tailCount * 0.3)} preferred suppliers could yield estimated savings of ${formatCurrency(consolidationSavings)}.` : 'Within the acceptable range — continue monitoring for new tail spend additions.'}`
    : 'Loading tail spend analysis…';

  return (
    <DatasetGate moduleName="Tail Spend Intelligence">
    <Box>
      <ExecutiveSummary
        title="Tail Spend Intelligence"
        summary={summary}
        highlights={data ? [
          `${tailCount} tail suppliers`,
          `${formatCurrency(totalTailSpend)} tail spend`,
          `${formatPercent(tailPct)} of total spend`,
          tailPct > 20 ? '⚠ Above 20% benchmark' : '✓ Within target',
        ] : []}
        isLoading={isLoading}
      />

      {tailPct > 20 && !isLoading && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          <strong>Consolidation Opportunity:</strong> Tail spend of {formatPercent(tailPct)} exceeds the 20% industry benchmark.
          Consolidating {tailCount} tail suppliers to preferred vendors could unlock an estimated{' '}
          <strong>{formatCurrency(totalPotential)}</strong> in annual savings.
        </Alert>
      )}

      {/* Threshold control */}
      <Paper elevation={0} sx={{ border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            Pareto Threshold: top <Box component="span" sx={{ color: IBM.blue }}>{threshold}%</Box> of spend = "Strategic"
          </Typography>
          <Chip label={`${tailCount} tail suppliers`} size="small"
            sx={{ bgcolor: tailPct > 20 ? '#fff1f1' : '#defbe6', color: tailPct > 20 ? IBM.red : IBM.green, fontWeight: 700, fontSize: 11 }} />
        </Box>
        <Slider
          value={threshold} min={50} max={95} step={5}
          onChange={(_, v) => setThreshold(v as number)}
          marks valueLabelDisplay="auto"
          sx={{ maxWidth: 520, color: IBM.blue }}
        />
        <Typography sx={{ fontSize: 11, color: IBM.muted }}>
          Suppliers accounting for the top {threshold}% of spend are "Strategic". All others are classified as "Tail Spend" and are candidates for consolidation.
        </Typography>
      </Paper>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KPICard title="Tail Spend Total"    value={formatCurrency(totalTailSpend)} accentColor={IBM.red}    loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="Tail Spend %"        value={formatPercent(tailPct)}         accentColor={IBM.yellow} loading={isLoading}
            delta={tailPct > 20 ? tailPct - 20 : undefined} deltaLabel="vs 20% benchmark" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="Tail Suppliers"      value={tailCount.toLocaleString()}     accentColor="#ee5396"    loading={isLoading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard title="Strategic Suppliers" value={strategicCount.toLocaleString()} accentColor={IBM.green} loading={isLoading} />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Pie */}
        <Grid item xs={12} md={3}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Spend Split</Typography>
            <ResponsiveContainer width="100%" height={185}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={75}
                  dataKey="value" nameKey="name"
                  label={({ value }: { value: number }) => `${value}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              {PIE_COLORS.map((c, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
                  <Typography sx={{ fontSize: 11, color: IBM.muted }}>{pieData[i]?.name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Top tail suppliers bar */}
        <Grid item xs={12} md={5}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 2 }}>Top Tail Spend Suppliers</Typography>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={(tailSuppliers as Record<string, unknown>[]).slice(0, 10)} layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="supplier_name" tick={{ fontSize: 10 }} width={80}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 12) + '…' : v} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_spend" fill={IBM.red} radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Category treemap */}
        <Grid item xs={12} md={4}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 2 }}>Tail Spend by Category</Typography>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={185}>
                <Treemap
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  content={<TreemapContent />}
                />
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 185, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 12, color: IBM.muted }}>No category data available</Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Ignite AI Recommendations */}
      {showIgnite && !isLoading && (
        <Box sx={{ bgcolor: '#eff4ff', border: `1px solid #d0e2ff`, borderRadius: 1.5, p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: IBM.blue, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0043ce' }}>Ignite AI — Tail Spend Reduction Roadmap</Typography>
              <Chip label={`${formatCurrency(totalPotential)} potential savings`} size="small"
                sx={{ bgcolor: '#defbe6', color: IBM.green, fontSize: 10, fontWeight: 700, height: 20 }} />
            </Box>
            <Button size="small" onClick={() => setShowIgnite(false)} sx={{ color: IBM.muted, fontSize: 11, minWidth: 0 }}>
              Dismiss
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <RecommendationCard
                icon={<CompareArrowsIcon sx={{ fontSize: 15, color: IBM.blue }} />}
                title="Supplier Consolidation"
                savings={formatCurrency(consolidationSavings)}
                action={`Consolidate ${tailCount} tail suppliers to ${Math.round(tailCount * 0.3)} preferred vendors. Volume leverage on consolidated spend typically yields 8–12% cost reduction.`}
                color={IBM.blue}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <RecommendationCard
                icon={<TrendingDownIcon sx={{ fontSize: 15, color: IBM.purple }} />}
                title="Procurement Catalogue"
                savings={formatCurrency(catalogueSavings)}
                action={`Deploy a pre-approved catalogue for the top ${categoryData.slice(0, 3).map(c => c.name).join(', ')} categories. Catalogue compliance typically reduces tail spend by 5–8% through channel control.`}
                color={IBM.purple}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <RecommendationCard
                icon={<WarningAmberIcon sx={{ fontSize: 15, color: IBM.orange }} />}
                title="Spend Policy Enforcement"
                savings={formatCurrency(totalTailSpend * 0.03)}
                action={`Mandate purchase order requirements for all spend above $500. P-card programmes for sub-threshold items reduce transaction cost by 60% and enforce preferred-supplier compliance.`}
                color={IBM.orange}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid #d0e2ff` }}>
            <Typography sx={{ fontSize: 11, color: '#0043ce', fontWeight: 600, mb: 0.5 }}>Implementation Priority</Typography>
            <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.6 }}>
              <strong>Month 1–2:</strong> Launch preferred-supplier catalogue for top-3 tail categories.{' '}
              <strong>Month 3–4:</strong> Execute consolidation RFQ for fragmented categories.{' '}
              <strong>Month 5–6:</strong> Deploy P-card programme with approved-supplier lists and spend limits.{' '}
              Target: reduce tail spend from {formatPercent(tailPct)} to below 15% within 6 months.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Tail Spend Table */}
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1 }}>
        <DataTable
          title={`Tail Spend Suppliers — ${tailCount} identified`}
          columns={TAIL_COLS}
          rows={(tailSuppliers as Record<string, unknown>[])}
          loading={isLoading}
          rowKey="supplier_name"
          total={tailCount}
          onSearch={() => {}}
          searchPlaceholder="Search tail suppliers…"
        />
      </Box>
    </Box>
  </DatasetGate>
  );
}