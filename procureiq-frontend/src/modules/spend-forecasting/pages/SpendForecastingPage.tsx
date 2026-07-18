import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, Slider, Paper,
} from '@mui/material';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import KPICard from '@/core/components/KPICard/KPICard';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import { useForecast } from '../hooks/useForecastData';
import { formatCurrency } from '@/core/utils/format';

const FORECAST_COLS: Column<Record<string, unknown>>[] = [
  { id: 'month',            label: 'Month',            minWidth: 100 },
  { id: 'predicted_spend',  label: 'Predicted Spend',  minWidth: 150, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'confidence_lower', label: 'Lower Bound',      minWidth: 130, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'confidence_upper', label: 'Upper Bound',      minWidth: 130, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'yoy_growth_pct',   label: 'YoY Growth',       minWidth: 110, align: 'right',
    format: v => v == null ? '—' : (
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: Number(v) > 0 ? '#198038' : '#da1e28' }}>
        {Number(v) > 0 ? '+' : ''}{Number(v).toFixed(1)}%
      </Typography>
    )
  },
  { id: 'driver',           label: 'Key Driver',       minWidth: 240 },
];

export default function SpendForecastingPage() {
  const [periods, setPeriods] = useState(6);
  const { data, isLoading }   = useForecast(periods);

  const forecast   = data?.forecast ?? [];
  const history    = data?.history  ?? [];
  const summary    = data?.summary  ?? {};

  // Combine history + forecast for the chart
  const chartData = [
    ...history.map((h: any) => ({ ...h, type: 'actual',   predicted_spend: h.total_spend })),
    ...forecast.map((f: any) => ({ ...f, type: 'forecast' })),
  ];

  // Today separator index
  const lastHistMonth = history[history.length - 1]?.month;

  const execSummary = summary.total_forecast_spend
    ? `Spend forecast for the next ${periods} months: **${formatCurrency(summary.total_forecast_spend)}** total (avg ${formatCurrency(summary.avg_monthly_forecast)}/month). ${summary.growth_vs_prior_6m > 0 ? `Projected ${summary.growth_vs_prior_6m.toFixed(1)}% growth vs prior ${periods} months.` : `Projected ${Math.abs(summary.growth_vs_prior_6m).toFixed(1)}% decline vs prior period.`} Peak spend month: ${summary.peak_month}. Model accuracy: ${data?.model_accuracy?.toFixed(0) ?? '—'}%.`
    : 'Loading spend forecast…';

  return (
    <Box>
      <ExecutiveSummary
        title="Spend Forecasting"
        summary={execSummary.replace(/\*\*/g, '')}
        highlights={summary.total_forecast_spend ? [
          `${formatCurrency(summary.total_forecast_spend)} ${periods}m forecast`,
          `Avg ${formatCurrency(summary.avg_monthly_forecast)}/mo`,
          `Peak: ${summary.peak_month}`,
          `${data?.model_accuracy?.toFixed(0) ?? '—'}% accuracy`,
          data?.model ?? '',
        ].filter(Boolean) : []}
        isLoading={isLoading}
      />

      {/* Controls */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          Forecast Horizon: <strong>{periods} months</strong>
        </Typography>
        <Slider
          value={periods} min={1} max={24} step={1}
          onChange={(_, v) => setPeriods(v as number)}
          marks={[{value:3,label:'3m'},{value:6,label:'6m'},{value:12,label:'12m'},{value:24,label:'24m'}]}
          valueLabelDisplay="auto"
          sx={{ maxWidth: 480, color: '#0f62fe' }}
        />
      </Paper>

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: `${periods}m Forecast Total`,  value: summary.total_forecast_spend ? formatCurrency(summary.total_forecast_spend) : '—',  accentColor: '#0f62fe' },
          { title: 'Avg Monthly Forecast',        value: summary.avg_monthly_forecast ? formatCurrency(summary.avg_monthly_forecast) : '—',   accentColor: '#6929c4' },
          { title: 'Growth vs Prior Period',       value: summary.growth_vs_prior_6m != null ? `${summary.growth_vs_prior_6m > 0 ? '+' : ''}${summary.growth_vs_prior_6m.toFixed(1)}%` : '—', accentColor: summary.growth_vs_prior_6m > 0 ? '#da1e28' : '#198038' },
          { title: 'Peak Month',                  value: summary.peak_month ?? '—',                                                            accentColor: '#ee5396' },
          { title: 'Model Accuracy',              value: data?.model_accuracy ? `${data.model_accuracy.toFixed(0)}%` : '—',                   accentColor: '#198038' },
        ].map(kpi => (
          <Grid item xs={6} sm={2.4} key={kpi.title}>
            <KPICard loading={isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Forecast Chart */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14 }}>
            Historical + Forecast Spend with Confidence Bands
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="Actual" size="small" sx={{ bgcolor: '#0f62fe', color: '#fff', fontWeight: 600, height: 22 }} />
            <Chip label="Forecast" size="small" sx={{ bgcolor: '#ee5396', color: '#fff', fontWeight: 600, height: 22 }} />
            <Chip label="95% CI" size="small" sx={{ bgcolor: '#f5f3ff', color: '#6929c4', fontWeight: 600, height: 22 }} />
          </Box>
        </Box>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 32, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6929c4" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#6929c4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <RTooltip
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lastHistMonth && (
              <ReferenceLine x={lastHistMonth} stroke="#525252" strokeDasharray="6 3"
                label={{ value: 'Today', fill: '#525252', fontSize: 11, position: 'top' }} />
            )}
            {/* Confidence band */}
            <Area type="monotone" dataKey="confidence_upper" stroke="none" fill="url(#ciGrad)"
              name="Upper CI" legendType="none" />
            <Area type="monotone" dataKey="confidence_lower" stroke="none" fill="#fff"
              name="Lower CI" legendType="none" />
            {/* Actual spend line */}
            <Line type="monotone" dataKey="total_spend" stroke="#0f62fe" strokeWidth={2.5}
              dot={{ r: 3 }} name="Actual Spend" connectNulls />
            {/* Forecast line */}
            <Line type="monotone" dataKey="predicted_spend" stroke="#ee5396" strokeWidth={2.5}
              strokeDasharray="8 4" dot={{ r: 4 }} name="Forecast" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Forecast Table */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
        <DataTable
          title={`${periods}-Month Spend Forecast`}
          columns={FORECAST_COLS}
          rows={forecast as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="month"
          maxHeight={400}
        />
      </Box>

      {/* Model Info */}
      {data?.model && (
        <Box sx={{ mt: 2, bgcolor: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Model:</strong> {data.model} · <strong>Accuracy:</strong> {data.model_accuracy?.toFixed(1)}% (MAPE-based) ·
            <strong> Generated:</strong> {data.generated_at} ·
            <strong> Note:</strong> Confidence intervals expand with forecast horizon. Replace with Prophet/ARIMA in production.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
