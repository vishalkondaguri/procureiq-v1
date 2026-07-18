/**
 * Procurement Health Score — Enterprise Module
 * Composite health index with dimension breakdown, radar visualization,
 * trend history, benchmarking, and Ignite AI improvement actions.
 */
import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, LinearProgress, Tooltip, Alert, Button,
} from '@mui/material';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import AutoAwesomeIcon    from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon   from '@mui/icons-material/ErrorOutline';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import { useHealthScore } from '../hooks/useHealthData';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

// ── Palette ────────────────────────────────────────────────────────────────────
const IBM = {
  blue:   '#0f62fe', purple: '#6929c4', teal: '#007d79',
  green:  '#198038', yellow: '#f1c21b', red:  '#da1e28',
  orange: '#ff832b', muted:  '#525252', border: '#e0e0e0',
  bg:     '#f4f4f4',
};

// ── Dimension metadata ─────────────────────────────────────────────────────────
const DIM_META: Record<string, {
  label: string; description: string; color: string;
  actions: string[];
}> = {
  spend_management: {
    label: 'Spend Management',
    description: 'Tail spend %, contract coverage, maverick spend control',
    color: IBM.blue,
    actions: [
      'Reduce tail spend suppliers by 30% via preferred-supplier catalogues',
      'Mandate purchase order compliance for all spend above $1,000',
      'Implement P-card programme for sub-threshold recurring purchases',
    ],
  },
  contract_compliance: {
    label: 'Contract Compliance',
    description: 'Contracted spend ratio, active vs expired contract balance',
    color: IBM.purple,
    actions: [
      'Target 85%+ of spend under active contracts (current gap: review IDE)',
      'Set 90-day renewal alerts for all expiring contracts',
      'Eliminate all expired contracts via emergency short-term agreements',
    ],
  },
  supplier_performance: {
    label: 'Supplier Performance',
    description: 'Tier distribution, strategic supplier ratio, delivery performance',
    color: IBM.teal,
    actions: [
      'Implement quarterly business reviews with all Tier 1 suppliers',
      'Deploy supplier scorecards measuring OTD, quality, and responsiveness',
      'Increase strategic supplier ratio to 15%+ of total supply base',
    ],
  },
  risk_management: {
    label: 'Risk Management',
    description: 'High/critical risk supplier %, concentration risk, ESG exposure',
    color: IBM.red,
    actions: [
      'Dual-source any single-source supplier with risk score above 6/10',
      'Complete ESG certification verification for all Tier 1 suppliers',
      'Reduce geographic concentration — no single region above 40%',
    ],
  },
  savings_realization: {
    label: 'Savings Realization',
    description: 'Identified vs realised savings, pipeline conversion rate',
    color: IBM.green,
    actions: [
      'Target 80%+ conversion rate on identified savings opportunities',
      'Run structured renegotiations with top-5 suppliers annually',
      'Execute vendor consolidation in top 3 fragmented categories',
    ],
  },
  data_quality: {
    label: 'Data Quality',
    description: 'IDE health scores, completeness, consistency, data freshness',
    color: '#ee5396',
    actions: [
      'Run Intelligent Data Engine on all procurement data sources monthly',
      'Resolve all duplicate supplier records flagged by IDE',
      'Ensure 100% of transactions have category, supplier, and cost-centre coding',
    ],
  },
};

const GRADE_COLOR: Record<string, string> = {
  A: IBM.green, B: IBM.blue, C: IBM.yellow, D: IBM.orange, F: IBM.red,
};

// ── Dimension bar with actions ─────────────────────────────────────────────────
function DimensionBar({
  dim, score, benchmark, weight, expanded, onToggle,
}: {
  dim: string; score: number; benchmark: number; weight: number;
  expanded: boolean; onToggle: () => void;
}) {
  const meta  = DIM_META[dim];
  const color = meta?.color ?? IBM.blue;
  const gap   = score - benchmark;
  const aboveBenchmark = score >= benchmark;

  return (
    <Box sx={{ mb: 2, bgcolor: expanded ? '#f8f9ff' : 'transparent', borderRadius: 1, p: expanded ? 1.5 : 0, border: expanded ? `1px solid ${color}20` : 'none', transition: 'all 0.2s' }}>
      {/* Header row */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, cursor: 'pointer' }}
        onClick={onToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{meta?.label ?? dim}</Typography>
          <Tooltip title={meta?.description} placement="top" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: IBM.muted, cursor: 'help' }} />
          </Tooltip>
          <Chip label={`${(weight * 100).toFixed(0)}% weight`} size="small"
            sx={{ bgcolor: '#f0f0f0', color: IBM.muted, fontSize: 10, height: 18 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: IBM.muted, fontSize: 11 }}>Benchmark: {benchmark}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color, lineHeight: 1 }}>{score.toFixed(1)}</Typography>
          {aboveBenchmark
            ? <Chip label={`+${gap.toFixed(1)}`} size="small" icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
                sx={{ bgcolor: '#defbe6', color: IBM.green, fontSize: 10, height: 20, fontWeight: 700 }} />
            : <Chip label={gap.toFixed(1)} size="small" icon={<WarningAmberIcon sx={{ fontSize: '12px !important' }} />}
                sx={{ bgcolor: '#fff1f1', color: IBM.red, fontSize: 10, height: 20, fontWeight: 700 }} />
          }
        </Box>
      </Box>

      {/* Progress bar */}
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ height: 8, bgcolor: '#f0f0f0', borderRadius: 4 }}>
          <Box sx={{ height: 8, width: `${Math.min(score, 100)}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
        </Box>
        <Box sx={{ position: 'absolute', top: -3, left: `${benchmark}%`, width: 2, height: 14, bgcolor: '#525252', borderRadius: 1 }} />
      </Box>

      {/* Expanded improvement actions */}
      {expanded && meta?.actions && (
        <Box sx={{ mt: 1.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color, mb: 0.75, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Ignite Improvement Actions
          </Typography>
          {meta.actions.map((action, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mb: 0.5 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, mt: 0.6, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.5 }}>{action}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HealthScorePage() {
  const { data, isLoading } = useHealthScore();
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const composite  = data?.composite_score ?? 0;
  const grade      = data?.grade ?? '—';
  const dims       = data?.dimensions ?? {};
  const benchmarks = data?.benchmarks ?? {};
  const weights    = data?.dimension_weights ?? {};
  const trend      = data?.trend ?? [];
  const delta      = data?.vs_prior_period ?? 0;

  const radarData = Object.entries(dims).map(([key, score]) => ({
    subject: DIM_META[key]?.label ?? key,
    score:     Number(score),
    benchmark: benchmarks[key] ?? 70,
  }));

  // Find weakest + strongest dims
  const sortedDims = Object.entries(dims).sort(([,a],[,b]) => Number(a) - Number(b));
  const weakest    = sortedDims[0];
  const strongest  = sortedDims[sortedDims.length - 1];

  // Dims below benchmark
  const belowBenchmark = Object.entries(dims).filter(([key, score]) => Number(score) < (benchmarks[key] ?? 70));

  const summary = data
    ? `Procurement Health Score: ${composite}/100 (Grade ${grade}). ` +
      `${composite >= 75 ? 'Performing above industry average.' : composite >= 65 ? 'Moderate performance with clear improvement areas.' : 'Below-average performance requiring an immediate action plan.'} ` +
      `Strongest: ${DIM_META[strongest?.[0] ?? '']?.label ?? strongest?.[0]}. ` +
      `Focus area: ${DIM_META[weakest?.[0] ?? '']?.label ?? weakest?.[0]}. ` +
      `Score ${delta > 0 ? `improved +${delta.toFixed(1)}` : `declined ${delta.toFixed(1)}`} vs prior period.`
    : 'Loading procurement health score…';

  const gradeColor = GRADE_COLOR[grade] ?? '#161616';

  return (
    <DatasetGate moduleName="Procurement Health Score">
    <Box>
      <ExecutiveSummary
        title="Procurement Health Score"
        summary={summary}
        highlights={data ? [
          `Score: ${composite}/100`,
          `Grade: ${grade}`,
          `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs prior period`,
          `${Object.values(dims).filter(s => Number(s) >= (benchmarks['spend_management'] ?? 70)).length}/${Object.keys(dims).length} on target`,
        ] : []}
        isLoading={isLoading}
      />

      {belowBenchmark.length > 0 && !isLoading && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          <strong>{belowBenchmark.length} dimension{belowBenchmark.length !== 1 ? 's' : ''} below benchmark:</strong>{' '}
          {belowBenchmark.map(([key]) => DIM_META[key]?.label ?? key).join(', ')}.{' '}
          Click each dimension below to see Ignite AI improvement actions.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Score Gauge */}
        <Grid item xs={12} md={4}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, textAlign: 'center', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Overall Health Score</Typography>
            {isLoading ? <LinearProgress sx={{ my: 4 }} /> : (
              <>
                <Box sx={{ position: 'relative', height: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <RadialBarChart cx="50%" cy="80%" innerRadius="70%" outerRadius="100%"
                      startAngle={180} endAngle={0} data={[{ value: composite, fill: gradeColor }]}>
                      <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f0f0f0' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 44, lineHeight: 1, color: gradeColor }}>{composite}</Typography>
                    <Typography sx={{ fontSize: 11, color: IBM.muted }}>out of 100</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 32, color: gradeColor, lineHeight: 1 }}>{grade}</Typography>
                    <Typography sx={{ fontSize: 11, color: IBM.muted }}>Grade</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {delta >= 0
                        ? <TrendingUpIcon sx={{ color: IBM.green, fontSize: 22 }} />
                        : <TrendingDownIcon sx={{ color: IBM.red, fontSize: 22 }} />
                      }
                      <Typography sx={{ fontWeight: 700, fontSize: 22, color: delta >= 0 ? IBM.green : IBM.red, lineHeight: 1 }}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: IBM.muted }}>vs prior period</Typography>
                  </Box>
                </Box>

                {/* Grade legend */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {Object.entries(GRADE_COLOR).map(([g, c]) => (
                    <Box key={g} sx={{ textAlign: 'center' }}>
                      <Box sx={{ width: 28, height: 6, bgcolor: grade === g ? c : '#e0e0e0', borderRadius: 3, mb: 0.25 }} />
                      <Typography sx={{ fontSize: 9, color: grade === g ? c : IBM.muted, fontWeight: grade === g ? 700 : 400 }}>{g}</Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Grid>

        {/* Radar Chart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Dimension Radar</Typography>
            <Typography sx={{ fontSize: 11, color: IBM.muted, mb: 1 }}>Blue = your score · Dashed = benchmark</Typography>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar name="Your Score" dataKey="score"    stroke={IBM.blue}   fill={IBM.blue}   fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Benchmark"  dataKey="benchmark" stroke={IBM.yellow} fill="none"       strokeDasharray="4 4" strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Trend Chart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Score Trend — 2024</Typography>
            <Typography sx={{ fontSize: 11, color: IBM.muted, mb: 2 }}>Monthly composite score history</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [`${v}/100`, 'Health Score']} />
                <Line type="monotone" dataKey="score" stroke={IBM.blue} strokeWidth={2.5} dot={{ r: 3, fill: IBM.blue }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>

      {/* Dimension Breakdown */}
      <Box sx={{ bgcolor: '#fff', border: `1px solid ${IBM.border}`, borderRadius: 1, p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Dimension Breakdown</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 11, color: IBM.muted }}>Click a dimension to expand Ignite AI actions</Typography>
            {expandedDim && (
              <Button size="small" onClick={() => setExpandedDim(null)} sx={{ fontSize: 11, color: IBM.muted, minWidth: 0 }}>
                Collapse all
              </Button>
            )}
          </Box>
        </Box>
        {isLoading ? (
          <LinearProgress />
        ) : (
          Object.entries(dims).map(([key, score]) => (
            <DimensionBar
              key={key}
              dim={key}
              score={Number(score)}
              benchmark={benchmarks[key] ?? 70}
              weight={weights[key] ?? 0}
              expanded={expandedDim === key}
              onToggle={() => setExpandedDim(expandedDim === key ? null : key)}
            />
          ))
        )}
        <Typography sx={{ fontSize: 11, color: IBM.muted, mt: 1 }}>
          Vertical marker on each bar = industry benchmark. Score is weighted by dimension importance.
        </Typography>
      </Box>

      {/* Ignite AI Summary Panel */}
      {!isLoading && data && (
        <Box sx={{ bgcolor: '#eff4ff', border: `1px solid #d0e2ff`, borderRadius: 1.5, p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
            <AutoAwesomeIcon sx={{ color: IBM.blue, fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0043ce' }}>Ignite AI — Health Score Action Plan</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 1, p: 1.75, border: `1px solid ${IBM.green}20` }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                  <CheckCircleIcon sx={{ fontSize: 15, color: IBM.green }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 12, color: IBM.green }}>Strengths to Leverage</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.6 }}>
                  {strongest
                    ? `${DIM_META[strongest[0]]?.label ?? strongest[0]} is your strongest dimension at ${Number(strongest[1]).toFixed(1)}/100. Use this as a foundation — apply the same governance and controls to weaker dimensions.`
                    : 'Analysing strengths...'
                  }
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 1, p: 1.75, border: `1px solid ${IBM.orange}20` }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                  <ErrorOutlineIcon sx={{ fontSize: 15, color: IBM.orange }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 12, color: IBM.orange }}>Priority Focus Area</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.6 }}>
                  {weakest
                    ? `${DIM_META[weakest[0]]?.label ?? weakest[0]} at ${Number(weakest[1]).toFixed(1)}/100 — ${Number(weakest[1]).toFixed(1) < (benchmarks[weakest[0]] ?? 70) ? `${((benchmarks[weakest[0]] ?? 70) - Number(weakest[1])).toFixed(1)} points below benchmark.` : 'at or above benchmark.'} Expand this dimension for targeted improvement actions.`
                    : 'Analysing focus areas...'
                  }
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 1, p: 1.75, border: `1px solid ${IBM.blue}20` }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75 }}>
                  <TrendingUpIcon sx={{ fontSize: 15, color: IBM.blue }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 12, color: IBM.blue }}>Score Improvement Potential</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: IBM.muted, lineHeight: 1.6 }}>
                  Addressing all below-benchmark dimensions could improve your score by an estimated{' '}
                  <strong>{belowBenchmark.reduce((s, [key]) => s + Math.max(0, (benchmarks[key] ?? 70) - Number(dims[key])), 0).toFixed(0)} points</strong>.{' '}
                  A 10-point improvement typically correlates with 2–4% reduction in total procurement cost.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  </DatasetGate>
  );
}