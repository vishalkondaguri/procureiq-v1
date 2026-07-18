/**
 * DataSourcesTab — Settings > Data Sources
 * Shows active data source, last refresh, files processed, records imported,
 * validation issues, and per-file ingestion history.
 */
import {
  Box, Typography, Grid, Chip, Skeleton, Alert,
  Table, TableHead, TableBody, TableRow, TableCell,
  LinearProgress, Tooltip,
} from '@mui/material';
import StorageIcon         from '@mui/icons-material/Storage';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useQuery }        from '@tanstack/react-query';
import { apiClient }       from '@/core/api/client';

// ── API hook ─────────────────────────────────────────────────────────────────

interface DataSourceSummary {
  total_transactions: number;
  total_suppliers:    number;
  total_contracts:    number;
  real_records:       number;
  demo_records:       number;
  files_processed:    number;
  total_clean_rows:   number;
  total_quarantined:  number;
  avg_health_score:   number | null;
  failed_runs:        number;
  last_refresh:       string | null;
  active_source:      string;
  is_demo_only:       boolean;
}

interface IngestionRun {
  id:               string;
  filename:         string | null;
  file_type:        string | null;
  status:           string;
  health_score:     number | null;
  rows_total:       number | null;
  rows_clean:       number | null;
  rows_quarantined: number | null;
  created_at:       string | null;
  is_demo:          boolean;
}

interface DataSourcesResponse {
  summary: DataSourceSummary;
  runs:    IngestionRun[];
}

function useDataSources() {
  return useQuery<DataSourcesResponse>({
    queryKey: ['settings-data-sources'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/data-sources');
      return data;
    },
    staleTime: 30_000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <Box sx={{
      border: '1px solid #e0e0e0', borderRadius: 1, p: 2,
      bgcolor: '#fff', borderLeft: `4px solid ${accent ?? '#0f62fe'}`,
    }}>
      <Typography sx={{ fontWeight: 700, fontSize: 22, color: accent ?? '#0f62fe', lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: 13, mt: 0.25 }}>{label}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: '#6f6f6f', mt: 0.25 }}>{sub}</Typography>}
    </Box>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
    completed: { label: 'Completed', color: 'success' },
    partial:   { label: 'Partial',   color: 'warning' },
    failed:    { label: 'Failed',    color: 'error'   },
    processing:{ label: 'Processing',color: 'default' },
    pending:   { label: 'Pending',   color: 'default' },
  };
  const cfg = map[status] ?? { label: status, color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, fontSize: 11 }} />;
}

function HealthBar({ score }: { score: number | null }) {
  if (score == null) return <Typography sx={{ fontSize: 12, color: '#8d8d8d' }}>—</Typography>;
  const color = score >= 80 ? '#198038' : score >= 60 ? '#f1c21b' : '#da1e28';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#e0e0e0', borderRadius: 3, minWidth: 60 }}>
        <Box sx={{ width: `${score}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color, minWidth: 30 }}>{score}</Typography>
    </Box>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  });
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataSourcesTab() {
  const { data, isLoading, isError } = useDataSources();
  const s = data?.summary;
  const runs = data?.runs ?? [];

  if (isLoading) {
    return (
      <Box>
        {[...Array(3)].map((_, i) => <Skeleton key={i} height={64} sx={{ mb: 1.5 }} />)}
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        Failed to load data source information. Check your permissions (Admin or Procurement Manager required).
      </Alert>
    );
  }

  return (
    <Box>
      {/* Demo Mode Banner */}
      {s?.is_demo_only && (
        <Alert severity="warning" icon={<StorageIcon />} sx={{ mb: 3 }}>
          <strong>Demo Dataset Active</strong> — All metrics are based on the built-in seed dataset.
          Upload real procurement files via the{' '}
          <strong>Intelligent Data Engine</strong> (IDE) to replace demo data with your organisation's data.
        </Alert>
      )}

      {/* Active Source */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3,
                 p: 2, bgcolor: '#f4f4f4', borderRadius: 1, border: '1px solid #e0e0e0' }}>
        <InsertDriveFileIcon sx={{ color: '#0f62fe', fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Active Data Source</Typography>
          <Typography sx={{ fontSize: 13, color: '#161616' }}>{s?.active_source ?? '—'}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>Last Refresh</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(s?.last_refresh ?? null)}</Typography>
        </Box>
      </Box>

      {/* KPI Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Transactions"   value={fmtNum(s?.total_transactions)} accent="#0f62fe" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Suppliers"      value={fmtNum(s?.total_suppliers)}    accent="#6929c4" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Contracts"      value={fmtNum(s?.total_contracts)}    accent="#007d79" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Files Uploaded" value={fmtNum(s?.files_processed)}    accent="#198038" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Validation Issues"
            value={fmtNum(s?.total_quarantined)}
            sub={s?.total_quarantined ? 'quarantined rows' : 'none detected'}
            accent={s?.total_quarantined ? '#f1c21b' : '#198038'}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            label="Avg Health Score"
            value={s?.avg_health_score != null ? `${s.avg_health_score}/100` : '—'}
            accent={s?.avg_health_score != null
              ? (s.avg_health_score >= 80 ? '#198038' : s.avg_health_score >= 60 ? '#f1c21b' : '#da1e28')
              : '#8d8d8d'}
          />
        </Grid>
      </Grid>

      {/* Data Composition */}
      {s && (s.real_records + s.demo_records > 0) && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Data Composition</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12 }}>
                  Real data: {fmtNum(s.real_records)} records ({Math.round(s.real_records / (s.real_records + s.demo_records) * 100)}%)
                </Typography>
                <Typography sx={{ fontSize: 12 }}>
                  Demo: {fmtNum(s.demo_records)} records
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={s.real_records / (s.real_records + s.demo_records) * 100}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e7ff',
                      '& .MuiLinearProgress-bar': { bgcolor: '#0f62fe' } }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Ingestion History Table */}
      <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#f7f8fa', borderBottom: '1px solid #e0e0e0',
                   display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Ingestion History</Typography>
          <Typography sx={{ fontSize: 12, color: '#6f6f6f' }}>{runs.length} run{runs.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f7f8fa' }}>
                {['Filename', 'Type', 'Status', 'Rows Total', 'Clean', 'Quarantined', 'Health', 'Uploaded At'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, py: 1.25, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#8d8d8d', fontSize: 13 }}>
                    No files uploaded yet. Use the Intelligent Data Engine to upload procurement files.
                  </TableCell>
                </TableRow>
              ) : runs.map(r => (
                <TableRow key={r.id} hover sx={{ opacity: r.is_demo ? 0.7 : 1 }}>
                  <TableCell sx={{ fontSize: 12, maxWidth: 200, overflow: 'hidden',
                                   textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.filename ?? 'Unknown'}>
                      <span>{r.is_demo ? '⚙ Demo Dataset' : (r.filename ?? 'Unknown')}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {r.file_type ? <Chip label={r.file_type.toUpperCase()} size="small"
                      sx={{ fontSize: 10, height: 18, bgcolor: '#e0e0e0', fontWeight: 700 }} /> : '—'}
                  </TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtNum(r.rows_total)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#198038', fontWeight: 600 }}>{fmtNum(r.rows_clean)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: r.rows_quarantined ? '#da1e28' : '#6f6f6f', fontWeight: r.rows_quarantined ? 600 : 400 }}>
                    {fmtNum(r.rows_quarantined)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}><HealthBar score={r.health_score} /></TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
