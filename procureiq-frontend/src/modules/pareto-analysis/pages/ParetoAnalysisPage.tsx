import { Box, Grid, Typography, Alert } from '@mui/material';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
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
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
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
    </Box>
  </DatasetGate>
  );
}