import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, Card, CardContent,
  Select, MenuItem, FormControl, InputLabel,
  LinearProgress,
} from '@mui/material';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import KPICard from '@/core/components/KPICard/KPICard';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import { useSavingsOpportunities } from '../hooks/useSavingsData';
import { formatCurrency } from '@/core/utils/format';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  consolidation:        { label: 'Consolidation',       icon: <CompareArrowsIcon />, color: '#0f62fe' },
  renegotiation:        { label: 'Renegotiation',       icon: <GavelIcon />,         color: '#6929c4' },
  tail_spend_reduction: { label: 'Tail Spend',          icon: <RemoveCircleOutlineIcon />, color: '#da1e28' },
  contract_compliance:  { label: 'Contract Compliance', icon: <TrendingUpIcon />,    color: '#198038' },
  substitution:         { label: 'Substitution',        icon: <EmojiObjectsIcon />,  color: '#f1c21b' },
};

const EFFORT_COLORS: Record<string, string> = { low: '#198038', medium: '#f1c21b', high: '#da1e28' };
const EFFORT_X: Record<string, number>      = { low: 1, medium: 2, high: 3 };

export default function SavingsEnginePage() {
  const [typeFilter, setType]     = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(0);

  const { data, isLoading } = useSavingsOpportunities({
    page: page + 1, page_size: 50,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const opportunities = data?.data ?? [];
  const summary       = data?.summary ?? {};

  const totalValue  = summary.total_identified_value ?? 0;
  const totalCount  = summary.opportunity_count ?? 0;

  // Scatter plot data: effort vs. impact
  const scatterData = opportunities.map((o: any) => ({
    x: EFFORT_X[o.effort] ?? 2,
    y: o.estimated_value_usd,
    name: o.title,
    type: o.type,
    confidence: o.confidence,
  }));

  const execSummary = totalCount > 0
    ? `Identified ${totalCount} savings opportunities with a combined estimated value of ${formatCurrency(totalValue)}. Top lever: ${opportunities[0]?.type?.replace('_', ' ')} offering ${formatCurrency(opportunities[0]?.estimated_value_usd ?? 0)} with ${((opportunities[0]?.confidence ?? 0) * 100).toFixed(0)}% confidence. ${summary?.by_type?.consolidation ?? 0} consolidation, ${summary?.by_type?.renegotiation ?? 0} renegotiation, and ${summary?.by_type?.tail_spend_reduction ?? 0} tail spend reduction opportunities identified.`
    : 'Loading savings analysis…';

  return (
    <Box>
      <ExecutiveSummary
        title="Savings Opportunity Engine"
        summary={execSummary}
        highlights={totalCount > 0 ? [
          `${formatCurrency(totalValue)} total potential`,
          `${totalCount} opportunities`,
          `${summary.by_type?.consolidation ?? 0} consolidation`,
          `${summary.by_type?.renegotiation ?? 0} renegotiation`,
        ] : []}
        isLoading={isLoading}
      />

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Savings Potential', value: formatCurrency(totalValue),    accentColor: '#198038' },
          { title: 'Opportunities Identified', value: totalCount.toString(),         accentColor: '#0f62fe' },
          { title: 'Consolidation',            value: (summary.by_type?.consolidation ?? 0).toString(),        accentColor: '#6929c4' },
          { title: 'Renegotiation',            value: (summary.by_type?.renegotiation ?? 0).toString(),        accentColor: '#007d79' },
          { title: 'Tail Spend Reduction',     value: (summary.by_type?.tail_spend_reduction ?? 0).toString(), accentColor: '#da1e28' },
        ].map(kpi => (
          <Grid item xs={6} sm={2.4} key={kpi.title}>
            <KPICard loading={isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Effort vs Impact Matrix */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>Effort vs. Impact Matrix</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Top-left = highest priority (low effort, high value)
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" dataKey="x" name="Effort" domain={[0, 4]}
                  tickFormatter={v => ['', 'Low', 'Medium', 'High', ''][v] ?? ''} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="Value"
                  tickFormatter={v => `$${(v/1_000_000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
                <RTooltip
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5, maxWidth: 220 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{d.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#525252' }}>{formatCurrency(d.y)} · {(d.confidence * 100).toFixed(0)}% confidence</Typography>
                      </Box>
                    );
                  }}
                />
                <ReferenceLine x={1.5} stroke="#f0f0f0" strokeDasharray="4 4" />
                <ReferenceLine x={2.5} stroke="#f0f0f0" strokeDasharray="4 4" />
                <Scatter data={scatterData} name="Opportunities">
                  {scatterData.map((entry: { type: string }, i: number) => (
                    <Cell key={i} fill={TYPE_CONFIG[entry.type]?.color ?? '#0f62fe'} fillOpacity={0.85} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>By Opportunity Type</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const count = summary.by_type?.[type] ?? 0;
                const typeOpps = opportunities.filter((o: any) => o.type === type);
                const typeValue = typeOpps.reduce((sum: number, o: any) => sum + o.estimated_value_usd, 0);
                const pct = totalValue > 0 ? (typeValue / totalValue) * 100 : 0;
                return (
                  <Box key={type}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{cfg.label}</Typography>
                        <Chip label={count} size="small" sx={{ bgcolor: '#f0f0f0', height: 18, fontSize: 10 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#198038' }}>{formatCurrency(typeValue)}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: cfg.color } }} />
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={e => { setType(e.target.value); setPage(0); }}>
            <MenuItem value="">All Types</MenuItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => { setStatus(e.target.value); setPage(0); }}>
            <MenuItem value="">All Statuses</MenuItem>
            {['identified', 'in_progress', 'realized', 'dismissed'].map(s => (
              <MenuItem key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Opportunity Cards */}
      <Grid container spacing={2}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{ border: '1px solid #e0e0e0', height: 180 }}>
                  <CardContent><LinearProgress /></CardContent>
                </Card>
              </Grid>
            ))
          : opportunities.map((opp: any) => {
              const cfg = TYPE_CONFIG[opp.type];
              return (
                <Grid item xs={12} sm={6} md={4} key={opp.id}>
                  <Card sx={{ border: '1px solid #e0e0e0', borderLeft: `4px solid ${cfg?.color ?? '#0f62fe'}`, height: '100%' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip label={cfg?.label ?? opp.type} size="small"
                          sx={{ bgcolor: `${cfg?.color}1a`, color: cfg?.color, fontWeight: 700, fontSize: 10, height: 22 }} />
                        <Chip label={`Effort: ${opp.effort}`} size="small"
                          sx={{ bgcolor: '#f0f0f0', color: EFFORT_COLORS[opp.effort], fontWeight: 600, fontSize: 10, height: 22 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5, lineHeight: 1.4 }}>{opp.title}</Typography>
                      {opp.supplier_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {opp.supplier_name}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#198038' }}>
                            {formatCurrency(opp.estimated_value_usd)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">estimated savings</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{((opp.confidence) * 100).toFixed(0)}%</Typography>
                          <Typography variant="caption" color="text.secondary">confidence</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 1.5 }}>
                        <AutoAwesomeIcon sx={{ fontSize: 14, color: '#0f62fe', mt: 0.15, flexShrink: 0 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.5 }}>
                          {opp.ignite_rationale.slice(0, 120)}{opp.ignite_rationale.length > 120 ? '…' : ''}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
        }
      </Grid>
    </Box>
  );
}
