import { useState } from 'react';
import {
  Box, Grid, Typography, Chip, Select, MenuItem,
  FormControl, InputLabel, Drawer, Divider, IconButton,
  Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import KPICard from '@/core/components/KPICard/KPICard';
import StatusBadge from '@/core/components/StatusBadge/StatusBadge';
import { useRiskScores, useRiskKPIs, useRiskHistory } from '../hooks/useRiskData';
import { formatCurrency } from '@/core/utils/format';
import DatasetGate from '@/core/components/DatasetGate/DatasetGate';

const RISK_COLOR: Record<string, string> = {
  low: '#198038', medium: '#f1c21b', high: '#ff832b', critical: '#da1e28',
};

interface RiskRow {
  supplier_id: string;
  supplier_name: string;
  country: string;
  category: string;
  composite_score: number;
  risk_level: string;
  financial_score: number;
  geo_score: number;
  esg_score: number;
  operational_score: number;
  compliance_score: number;
  total_spend_usd: number;
}

const RISK_COLS: Column<Record<string, unknown>>[] = [
  { id: 'supplier_name',   label: 'Supplier',        minWidth: 200 },
  { id: 'category',        label: 'Category',        minWidth: 160 },
  { id: 'country',         label: 'Country',         minWidth: 80, align: 'center' },
  { id: 'composite_score', label: 'Risk Score',      minWidth: 120, align: 'center',
    format: (v, row) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: RISK_COLOR[String(row.risk_level)] ?? '#161616' }}>
          {Number(v).toFixed(1)}
        </Typography>
        <StatusBadge status={String(row.risk_level)} />
      </Box>
    ),
  },
  { id: 'financial_score',    label: 'Financial',    minWidth: 90, align: 'center',
    format: v => <RiskBar value={Number(v)} /> },
  { id: 'geo_score',          label: 'Geo',          minWidth: 90, align: 'center',
    format: v => <RiskBar value={Number(v)} /> },
  { id: 'esg_score',          label: 'ESG',          minWidth: 90, align: 'center',
    format: v => <RiskBar value={Number(v)} /> },
  { id: 'operational_score',  label: 'Operational',  minWidth: 90, align: 'center',
    format: v => <RiskBar value={Number(v)} /> },
  { id: 'total_spend_usd',    label: 'Total Spend',  minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
];

function RiskBar({ value }: { value: number }) {
  const pct = (value / 10) * 100;
  const color = value < 4 ? '#198038' : value < 6.5 ? '#f1c21b' : value < 8 ? '#ff832b' : '#da1e28';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#f0f0f0', borderRadius: 3 }}>
        <Box sx={{ height: 6, width: `${pct}%`, bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color, minWidth: 24 }}>{value.toFixed(1)}</Typography>
    </Box>
  );
}

export default function SupplierRiskPage() {
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [riskFilter, setRisk]   = useState('');
  const [catFilter] = useState('');
  const [selectedId, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');

  const { data, isLoading }     = useRiskScores({ page: page + 1, page_size: pageSize, risk_level: riskFilter || undefined, category: catFilter || undefined });
  const { data: kpis, isLoading: kpiLoading } = useRiskKPIs();
  const { data: history }       = useRiskHistory(selectedId);

  const rows: RiskRow[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const summary = kpis
    ? `Portfolio risk overview: average composite score ${kpis.avg_risk}/10. ${kpis.critical_count} suppliers are critical risk, ${kpis.high_count} are high risk — together representing significant supply chain exposure. ${kpis.low_count} suppliers maintain a low-risk profile.`
    : 'Loading risk assessment…';

  return (
    <DatasetGate moduleName="Supplier Risk Assessment">
    <Box>
      <ExecutiveSummary
        title="Supplier Risk Assessment"
        summary={summary}
        highlights={kpis ? [
          `Avg Risk: ${kpis.avg_risk}/10`,
          `${kpis.critical_count} Critical`,
          `${kpis.high_count} High`,
          `${kpis.medium_count} Medium`,
          `${kpis.low_count} Low`,
        ] : []}
        isLoading={kpiLoading}
      />

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Avg Risk Score',   value: kpis ? `${kpis.avg_risk}/10` : '—',             accentColor: '#f1c21b' },
          { title: 'Critical Risk',    value: kpis ? kpis.critical_count.toString() : '—',    accentColor: '#da1e28' },
          { title: 'High Risk',        value: kpis ? kpis.high_count.toString() : '—',        accentColor: '#ff832b' },
          { title: 'Medium Risk',      value: kpis ? kpis.medium_count.toString() : '—',      accentColor: '#f1c21b' },
          { title: 'Low Risk',         value: kpis ? kpis.low_count.toString() : '—',         accentColor: '#198038' },
        ].map(kpi => (
          <Grid item xs={6} sm={2.4} key={kpi.title}>
            <KPICard loading={kpiLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Risk Level</InputLabel>
          <Select value={riskFilter} label="Risk Level" onChange={e => { setRisk(e.target.value); setPage(0); }}>
            <MenuItem value="">All Levels</MenuItem>
            {['low', 'medium', 'high', 'critical'].map(r => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Risk Score Table */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, mb: 3 }}>
        <DataTable
          title="Supplier Risk Scores"
          columns={RISK_COLS}
          rows={rows.map(r => ({
            ...r,
            _onClick: () => { setSelected(r.supplier_id); setSelectedName(r.supplier_name); }
          })) as Record<string, unknown>[]}
          loading={isLoading}
          rowKey="supplier_id"
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={() => {}}
        />
      </Box>

      {/* Risk Dimension Legend */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Risk Dimension Definitions</Typography>
        <Grid container spacing={1.5}>
          {[
            { dim: 'Financial', desc: 'Credit rating, payment history, financial stability indicators' },
            { dim: 'Geographic', desc: 'Country-level political, regulatory, and supply chain risk' },
            { dim: 'ESG', desc: 'Environmental, social, and governance compliance and ratings' },
            { dim: 'Operational', desc: 'Delivery performance, capacity risk, single-source dependency' },
            { dim: 'Compliance', desc: 'Regulatory compliance, audit findings, certification status' },
          ].map(d => (
            <Grid item xs={12} sm={6} md={2.4} key={d.dim}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 0.5, color: '#0f62fe' }}>{d.dim}</Typography>
                <Typography sx={{ fontSize: 11, color: '#525252' }}>{d.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Supplier Risk Detail Drawer */}
      <Drawer anchor="right" open={!!selectedId} onClose={() => setSelected(null)}
        sx={{ '& .MuiDrawer-paper': { width: 460 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: '#161616', color: '#fff' }}>
          <IconButton size="small" onClick={() => setSelected(null)} sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{selectedName} — Risk Profile</Typography>
        </Box>
        {selectedId && rows.find(r => r.supplier_id === selectedId) && (() => {
          const sup = rows.find(r => r.supplier_id === selectedId)!;
          const radarData = [
            { subject: 'Financial',   score: sup.financial_score },
            { subject: 'Geographic',  score: sup.geo_score },
            { subject: 'ESG',         score: sup.esg_score },
            { subject: 'Operational', score: sup.operational_score },
            { subject: 'Compliance',  score: sup.compliance_score },
          ];
          return (
            <Box sx={{ p: 3, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <StatusBadge status={sup.risk_level} />
                <Chip label={sup.category} size="small" sx={{ bgcolor: '#eff4ff', color: '#0f62fe', fontWeight: 600 }} />
                <Chip label={sup.country} size="small" sx={{ bgcolor: '#f4f4f4', fontWeight: 600 }} />
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: 32, color: RISK_COLOR[sup.risk_level], mb: 1 }}>
                {sup.composite_score.toFixed(1)}<Typography component="span" sx={{ fontSize: 16, color: '#525252' }}>/10</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">Composite Risk Score</Typography>

              <Divider sx={{ my: 2.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Dimension Radar</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#0f62fe" fill="#0f62fe" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>

              {history && history.length > 0 && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>12-Month Risk Trend</Typography>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                      <RTooltip contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="composite_score" stroke="#da1e28" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}

              <Divider sx={{ my: 2.5 }} />
              <Table size="small">
                <TableBody>
                  {radarData.map(d => (
                    <TableRow key={d.subject}>
                      <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.75, pl: 0 }}>{d.subject}</TableCell>
                      <TableCell sx={{ border: 'none', py: 0.75 }}>
                        <RiskBar value={d.score} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        })()}
      </Drawer>
    </Box>
  </DatasetGate>
  );
}