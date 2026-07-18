import { useState } from 'react';
import {
  Box, Grid, Typography, Slider, Button, Chip, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import { useWhatIfPresets, simulateScenario } from '../hooks/useWhatIfData';
import { formatCurrency } from '@/core/utils/format';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

interface Levers {
  name: string;
  supplier_consolidation_pct: number;
  price_reduction_pct: number;
  tail_spend_reduction_pct: number;
  payment_terms_extension_days: number;
  contract_compliance_improvement_pct: number;
}

const DEFAULT_LEVERS: Levers = {
  name: 'Custom Scenario',
  supplier_consolidation_pct: 0,
  price_reduction_pct: 0,
  tail_spend_reduction_pct: 0,
  payment_terms_extension_days: 0,
  contract_compliance_improvement_pct: 0,
};

const LEVER_CONFIG = [
  { key: 'supplier_consolidation_pct',          label: 'Supplier Consolidation',         unit: '%', min: 0, max: 50,  step: 5,  color: '#0f62fe', desc: 'Reduce supplier count by this % (volume discounts + admin savings)' },
  { key: 'price_reduction_pct',                 label: 'Price Renegotiation',             unit: '%', min: 0, max: 20,  step: 1,  color: '#6929c4', desc: 'Unit price reduction achieved on negotiable spend (60% of total)' },
  { key: 'tail_spend_reduction_pct',            label: 'Tail Spend Reduction',            unit: '%', min: 0, max: 100, step: 10, color: '#da1e28', desc: 'Route this % of tail spend to preferred suppliers (+12% pricing)' },
  { key: 'payment_terms_extension_days',        label: 'Payment Terms Extension',         unit: 'd', min: 0, max: 60,  step: 5,  color: '#198038', desc: 'Extend average DPO by N days for working capital benefit' },
  { key: 'contract_compliance_improvement_pct', label: 'Contract Compliance Improvement', unit: '%', min: 0, max: 80,  step: 10, color: '#ee5396', desc: '% of off-contract spend brought under negotiated agreements' },
];

function DeltaBadge({ value, unit = '', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  if (value === 0) return <Typography sx={{ fontSize: 13, color: '#525252' }}>—</Typography>;
  return (
    <Typography sx={{ fontSize: 13, fontWeight: 700, color: good ? '#198038' : '#da1e28' }}>
      {value > 0 ? '+' : ''}{typeof value === 'number' ? value.toFixed(value % 1 !== 0 ? 1 : 0) : value}{unit}
    </Typography>
  );
}

export default function WhatIfAnalysisPage() {
  const [levers, setLevers]       = useState<Levers>(DEFAULT_LEVERS);
  const [result, setResult]       = useState<any>(null);
  const [running, setRunning]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const { data: presets }         = useWhatIfPresets();

  const handleSlider = (key: keyof Levers, value: number) => {
    setLevers(prev => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const applyPreset = (preset: { name: string; levers: Partial<Levers> }) => {
    setLevers({ ...DEFAULT_LEVERS, ...preset.levers, name: preset.name });
    setResult(null);
  };

  const runSimulation = async () => {
    setRunning(true); setError(null);
    try {
      const res = await simulateScenario(levers as unknown as Record<string, unknown>);
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Simulation failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const hasLevers = LEVER_CONFIG.some(l => (levers as any)[l.key] > 0);

  // Impact bar data for chart
  const impactData = result?.impacts?.map((imp: any) => ({
    name: imp.lever.replace(' ', '\n'),
    savings: imp.savings_usd ?? imp.working_capital_benefit_usd ?? 0,
  })) ?? [];

  return (
    <DatasetGate moduleName="What-if Analysis">
    <Box>
      <ExecutiveSummary
        title="What-if Analysis"
        summary="Model the financial and operational impact of procurement transformation scenarios. Adjust levers below and click 'Run Simulation' to see projected savings, risk reduction, and metric changes. Use preset scenarios for industry benchmark comparisons."
        highlights={['Supplier Consolidation', 'Price Renegotiation', 'Tail Spend Control', 'Contract Compliance', 'Payment Terms']}
      />

      {/* Preset Scenarios */}
      {presets && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Quick-Start Presets:</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {presets.map((p: any) => (
              <Chip
                key={p.id} label={p.name} clickable onClick={() => applyPreset(p)}
                sx={{
                  bgcolor: levers.name === p.name ? '#0f62fe' : '#f0f0f0',
                  color: levers.name === p.name ? '#fff' : '#161616',
                  fontWeight: 600, height: 30,
                  '&:hover': { bgcolor: '#d0e2ff' },
                }}
              />
            ))}
            <Chip label="Reset" clickable onClick={() => { setLevers(DEFAULT_LEVERS); setResult(null); }}
              sx={{ bgcolor: '#fff1f1', color: '#da1e28', fontWeight: 600, height: 30, border: '1px solid #ffd7d9' }} />
          </Box>
          {presets.find((p: any) => p.name === levers.name) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              {presets.find((p: any) => p.name === levers.name)?.description}
            </Typography>
          )}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Lever Controls */}
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2.5 }}>Scenario Levers</Typography>
            {LEVER_CONFIG.map(lever => {
              const val = (levers as any)[lever.key] as number;
              return (
                <Box key={lever.key} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{lever.label}</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: lever.color }}>
                      {val}{lever.unit}
                    </Typography>
                  </Box>
                  <Slider
                    value={val} min={lever.min} max={lever.max} step={lever.step}
                    onChange={(_, v) => handleSlider(lever.key as keyof Levers, v as number)}
                    sx={{ color: lever.color, '& .MuiSlider-thumb': { width: 16, height: 16 } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{lever.desc}</Typography>
                </Box>
              );
            })}

            <Button
              variant="contained" size="large" fullWidth
              startIcon={running ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <PlayArrowIcon />}
              onClick={runSimulation} disabled={running || !hasLevers}
              sx={{ mt: 1, height: 48, fontWeight: 700 }}
            >
              {running ? 'Simulating…' : 'Run Simulation'}
            </Button>
          </Box>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={6}>
          {!result && !running && (
            <Box sx={{ bgcolor: '#f7f8fa', border: '2px dashed #e0e0e0', borderRadius: 1, p: 4,
                       textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column',
                       alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <TrendingDownIcon sx={{ fontSize: 48, color: '#c6c6c6' }} />
              <Typography sx={{ fontWeight: 700, color: '#525252' }}>No simulation yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Adjust levers and click "Run Simulation" to see projected impact
              </Typography>
            </Box>
          )}
          {running && (
            <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 4,
                       textAlign: 'center', display: 'flex', flexDirection: 'column',
                       alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 300 }}>
              <CircularProgress size={40} sx={{ color: '#0f62fe' }} />
              <Typography sx={{ fontWeight: 600, color: '#525252' }}>Computing scenario impact…</Typography>
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {result && !running && (
            <Box>
              {/* Total Savings Banner */}
              <Box sx={{ bgcolor: '#defbe6', border: '1px solid #a7f0ba', borderRadius: 1, p: 2.5, mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0e6027', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Total Annual Savings Potential
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 36, color: '#0e6027', lineHeight: 1.2 }}>
                  {formatCurrency(result.total_savings_usd)}
                </Typography>
                {result.roi_months && (
                  <Typography variant="caption" color="text.secondary">
                    Estimated ROI breakeven: {result.roi_months} months (assuming 3% implementation cost)
                  </Typography>
                )}
              </Box>

              {/* Delta Metrics */}
              <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>Metric Impact (Baseline → Projected)</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#525252', textTransform: 'uppercase' }}>Metric</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#525252', textTransform: 'uppercase' }}>Baseline</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#525252', textTransform: 'uppercase' }}>Projected</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: '#525252', textTransform: 'uppercase' }}>Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { label: 'Total Spend',         k: 'total_spend',      fmt: (v: number) => formatCurrency(v), invert: true },
                      { label: 'Active Suppliers',    k: 'active_suppliers', fmt: (v: number) => v.toString(),      invert: true },
                      { label: 'Tail Spend %',        k: 'tail_spend_pct',   fmt: (v: number) => `${v.toFixed(1)}%`, invert: true },
                      { label: 'Contracted Spend %',  k: 'contracted_pct',   fmt: (v: number) => `${v.toFixed(1)}%`, invert: false },
                      { label: 'Avg Risk Score',      k: 'avg_risk_score',   fmt: (v: number) => `${v.toFixed(1)}/10`, invert: true },
                      { label: 'DPO Days',            k: 'dpo_days',         fmt: (v: number) => `${v} days`,        invert: false },
                    ].map(row => (
                      <TableRow key={row.k}>
                        <TableCell sx={{ fontSize: 13 }}>{row.label}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, color: '#525252' }}>{row.fmt(result.baseline[row.k])}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600 }}>{row.fmt(result.projected[row.k])}</TableCell>
                        <TableCell align="right">
                          <DeltaBadge value={result.deltas[row.k]} unit={row.k.includes('pct') || row.k.includes('risk') ? '' : ''} invert={row.invert} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Savings breakdown chart */}
              {impactData.length > 0 && (
                <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>Savings by Lever</Typography>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={impactData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                      <RTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="savings" fill="#198038" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}

              {/* Ignite Insight */}
              <Box sx={{ bgcolor: '#eff4ff', border: '1px solid #d0e2ff', borderRadius: 1, p: 2, display: 'flex', gap: 1.5 }}>
                <AutoAwesomeIcon sx={{ color: '#0f62fe', fontSize: 18, mt: 0.15, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0043ce', mb: 0.5 }}>Ignite Recommendation</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                    This scenario projects {formatCurrency(result.total_savings_usd)} in annual savings.
                    {result.impacts?.[0] && ` Highest impact lever: "${result.impacts[0].lever}" contributing ${formatCurrency(result.impacts[0].savings_usd ?? 0)}.`}
                    {result.roi_months && ` With a ${result.roi_months}-month ROI breakeven, this represents a strong business case for immediate action.`}
                    {' '}Ask Ignite for a detailed implementation roadmap.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  </DatasetGate>
  );
}