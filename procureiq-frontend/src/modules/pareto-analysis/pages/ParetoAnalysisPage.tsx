import { Box, Grid, Typography, Alert, Chip } from '@mui/material';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import AutoAwesomeIcon    from '@mui/icons-material/AutoAwesome';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import GroupWorkIcon      from '@mui/icons-material/GroupWork';
import GavelIcon          from '@mui/icons-material/Gavel';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import KPICard from '@/core/components/KPICard/KPICard';
import { usePareto } from '@/modules/executive-command-center/hooks/useSpendData';
import { formatCurrency, formatPercent } from '@/core/utils/format';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

const PARETO_COLS: Column<Record<string, unknown>>[] = [
  { id: 'rank',              label: '#',          minWidth: 52,  align: 'center' },
  { id: 'supplier_name',    label: 'Supplier',   minWidth: 220 },
  { id: 'total_spend',      label: 'Spend',      minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'spend_percent',    label: 'Share %',    minWidth: 90,  align: 'right',
    format: v => formatPercent(Number(v)) },
  { id: 'cumulative_percent', label: 'Cumulative %', minWidth: 110, align: 'right',
    format: (v, _row) => {
      const pct = Number(v);
      const color = pct <= 80 ? '#0f62fe' : '#da1e28';
      return <Typography sx={{ fontWeight: 700, fontSize: 13, color }}>{pct.toFixed(1)}%</Typography>;
    }
  },
];

export default function ParetoAnalysisPage() {
  const { data, isLoading } = usePareto();

  const paretoData  = data?.pareto_data ?? [];
  const threshold80 = data?.eighty_percent_threshold_suppliers ?? 0;
  const totalSuppliers = paretoData.length;
  const pct80Suppliers = totalSuppliers > 0 ? ((threshold80 / totalSuppliers) * 100).toFixed(0) : '—';

  const chartData = paretoData.map((row: any) => ({
    name: row.supplier_name.length > 16 ? row.supplier_name.slice(0, 14) + '…' : row.supplier_name,
    spend: row.total_spend,
    cumulative: row.cumulative_percent,
  }));

  const summary = paretoData.length > 0
    ? `Classic Pareto distribution confirmed: ${threshold80} suppliers (${pct80Suppliers}% of your ${totalSuppliers}-supplier portfolio) account for 80% of total procurement spend. The remaining ${totalSuppliers - threshold80} suppliers (${(100 - Number(pct80Suppliers)).toFixed(0)}%) represent tail spend that is a prime consolidation target.`
    : 'Loading Pareto analysis…';

  return (
    <DatasetGate moduleName="80/20 Pareto Analysis">
    <Box>
      <ExecutiveSummary
        title="80/20 Pareto Analysis"
        summary={summary}
        highlights={paretoData.length > 0 ? [
          `${threshold80} strategic suppliers`,
          `${totalSuppliers - threshold80} tail suppliers`,
          `${pct80Suppliers}% drive 80% of spend`,
          'Consolidation opportunity',
        ] : []}
        isLoading={isLoading}
      />

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Suppliers',       value: totalSuppliers.toString(), accentColor: '#0f62fe' },
          { title: 'Strategic (80% spend)', value: threshold80.toString(),    accentColor: '#6929c4' },
          { title: 'Tail Suppliers',         value: (totalSuppliers - threshold80).toString(), accentColor: '#da1e28' },
          { title: '% Driving 80% Spend',   value: `${pct80Suppliers}%`,     accentColor: '#198038' },
        ].map(kpi => (
          <Grid item xs={6} sm={3} key={kpi.title}>
            <KPICard loading={isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Pareto Principle:</strong> {threshold80} suppliers represent 80% of your spend. Focus negotiation, risk management, and strategic partnerships on this group for maximum impact.
      </Alert>

      {/* Pareto Chart */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>
          Pareto Chart — Spend Distribution by Supplier
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData.slice(0, 30)} margin={{ top: 8, right: 32, bottom: 48, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" height={70} interval={0} />
            <YAxis yAxisId="left"  tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <RTooltip
              formatter={(v: number, name: string) =>
                name === 'spend' ? [formatCurrency(v), 'Spend'] : [`${v.toFixed(1)}%`, 'Cumulative']}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="spend" fill="#0f62fe" name="Spend" radius={[3,3,0,0]} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#da1e28" strokeWidth={2.5} dot={false} name="Cumulative %" />
            <ReferenceLine yAxisId="right" y={80} stroke="#f1c21b" strokeDasharray="6 3" strokeWidth={2}
              label={{ value: '80%', fill: '#b45309', fontSize: 12, position: 'insideTopLeft' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Pareto Table */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, mb: 3 }}>
        <DataTable
          title="Supplier Spend Ranking"
          columns={PARETO_COLS}
          rows={paretoData as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="rank"
          onSearch={() => {}}
          searchPlaceholder="Filter suppliers…"
          maxHeight={480}
        />
      </Box>

      {/* Ignite AI Strategic Recommendations */}
      {paretoData.length > 0 && (
        <Box sx={{ bgcolor: '#eff4ff', border: '1px solid #d0e2ff', borderRadius: 1.5, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesomeIcon sx={{ color: '#0f62fe', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0043ce' }}>
              Ignite AI — Pareto Strategic Actions
            </Typography>
            <Chip label="AI Analysis" size="small"
              sx={{ ml: 'auto', bgcolor: '#d0e2ff', color: '#002d9c', fontSize: 10, fontWeight: 700, height: 20 }} />
          </Box>
          <Grid container spacing={2}>
            {[
              {
                icon: <GroupWorkIcon sx={{ fontSize: 18, color: '#0f62fe' }} />,
                title: 'Supplier Consolidation',
                color: '#0f62fe',
                bgColor: '#eff4ff',
                borderColor: '#d0e2ff',
                points: [
                  `${threshold80} suppliers drive 80% of spend — negotiate multi-year MSAs for maximum leverage`,
                  `Consolidate the ${totalSuppliers - threshold80} tail suppliers into preferred-vendor catalogues`,
                  'Estimated 8–12% reduction in total spend through volume commitment agreements',
                  'Target 30-day consolidation sprint for highest-fragmentation categories',
                ],
              },
              {
                icon: <GavelIcon sx={{ fontSize: 18, color: '#6929c4' }} />,
                title: 'Contract Leverage',
                color: '#6929c4',
                bgColor: '#f6f2ff',
                borderColor: '#e8daff',
                points: [
                  `Top ${Math.min(threshold80, 5)} strategic suppliers represent the strongest renegotiation targets`,
                  'Annual spend reviews with Tier 1 suppliers — benchmark pricing vs market indices',
                  'Introduce clawback clauses for non-performance and price escalation caps',
                  'Consider consortium buying for commodity categories to amplify negotiating power',
                ],
              },
              {
                icon: <TrendingDownIcon sx={{ fontSize: 18, color: '#da1e28' }} />,
                title: 'Tail Spend Control',
                color: '#da1e28',
                bgColor: '#fff1f1',
                borderColor: '#ffd7d9',
                points: [
                  `${totalSuppliers - threshold80} tail suppliers consume procurement admin at disproportionate cost`,
                  'Implement P-card or purchasing card programme for sub-$5K tail transactions',
                  'Deploy guided buying catalogue to route tail spend to pre-approved preferred suppliers',
                  '6-month target: reduce tail supplier count by 40% through mandatory catalogue compliance',
                ],
              },
            ].map(card => (
              <Grid item xs={12} md={4} key={card.title}>
                <Box sx={{ bgcolor: card.bgColor, border: `1px solid ${card.borderColor}`, borderRadius: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                    {card.icon}
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: card.color }}>{card.title}</Typography>
                  </Box>
                  {card.points.map((pt, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mb: 0.75 }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: card.color, mt: 0.65, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12, color: '#525252', lineHeight: 1.55 }}>{pt}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  </DatasetGate>
  );
}