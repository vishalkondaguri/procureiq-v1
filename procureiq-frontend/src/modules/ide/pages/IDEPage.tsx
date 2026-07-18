import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Paper, LinearProgress, Chip, Alert,
  List, ListItem, ListItemText, CircularProgress,
  Grid, Table, TableBody, TableCell, TableRow, TableHead,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '@/core/api/client';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColumnProfile {
  column: string;
  dtype: string;
  null_count: number;
  fill_pct: number;
  unique_count: number;
  min?: number; max?: number; mean?: number; median?: number; sum?: number;
  top_values?: { value: string; count: number }[];
}

interface Analysis {
  overview: { filename: string; total_rows: number; total_columns: number; columns: string[] };
  column_profiles: ColumnProfile[];
  sample_rows: Record<string, string>[];
  spend_summary: {
    column_used: string; total_spend: number; avg_per_row: number;
    min_value: number; max_value: number; rows_with_amount: number;
  } | null;
  supplier_summary: {
    column_used: string; unique_suppliers: number;
    top_suppliers: { name: string; transaction_count: number }[];
    top_suppliers_by_spend?: { name: string; total_spend: number }[];
  } | null;
  date_range: { column_used: string; earliest: string; latest: string; span_days: number } | null;
  ignite_narrative: string;
  corrections_count: number;
}

interface IngestionStatus {
  ingestion_id: string;
  status: string;
  health_score: number | null;
  rows_total: number | null;
  rows_clean: number | null;
  rows_quarantined: number | null;
  correction_report: { stage: string; description: string; affected_rows: number; action: string }[];
  error_message: string | null;
  analysis: Analysis | null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#198038' : score >= 60 ? '#f1c21b' : '#da1e28';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Acceptable' : 'Needs Attention';
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
        <CircularProgress variant="determinate" value={score} size={90}
          sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} thickness={5} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                   justifyContent: 'center', flexDirection: 'column' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1 }}>{score}</Typography>
          <Typography sx={{ fontSize: 10, color: '#525252' }}>/100</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color }}>{label}</Typography>
    </Box>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircleIcon sx={{ color: '#198038', fontSize: 20 }} />;
  if (status === 'failed')    return <ErrorIcon sx={{ color: '#da1e28', fontSize: 20 }} />;
  if (status === 'partial')   return <WarningIcon sx={{ color: '#f1c21b', fontSize: 20 }} />;
  return <CircularProgress size={18} />;
}

function FillBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? '#198038' : pct >= 70 ? '#f1c21b' : '#da1e28';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 600, minWidth: 36 }}>{pct}%</Typography>
    </Box>
  );
}

function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// ── Ignite Narrative ──────────────────────────────────────────────────────────

function IgniteNarrative({ text }: { text: string }) {
  // Bold **text** rendering
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Box sx={{ p: 2, bgcolor: '#eff4ff', border: '1px solid #d0e2ff', borderRadius: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
        <AutoAwesomeIcon sx={{ fontSize: 16, color: '#0043ce' }} />
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#0043ce' }}>Ignite AI Analysis</Typography>
      </Box>
      <Typography component="p" sx={{ fontSize: 13, lineHeight: 1.7, color: '#161616' }}>
        {parts.map((p, i) =>
          p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
        )}
      </Typography>
    </Box>
  );
}

// ── Analysis Sections ─────────────────────────────────────────────────────────

function AnalysisPanel({ analysis, status }: { analysis: Analysis; status: IngestionStatus }) {
  return (
    <Box>
      {/* Ignite narrative */}
      <IgniteNarrative text={analysis.ignite_narrative} />

      {/* KPI row */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'Total Rows',       value: status.rows_total?.toLocaleString() ?? '—' },
          { label: 'Clean Rows',       value: status.rows_clean?.toLocaleString() ?? '—' },
          { label: 'Quarantined',      value: status.rows_quarantined?.toLocaleString() ?? '—' },
          { label: 'Columns',          value: analysis.overview.total_columns },
          { label: 'Corrections',      value: analysis.corrections_count },
          { label: 'Health Score',     value: `${status.health_score}/100` },
        ].map(k => (
          <Grid item xs={6} sm={4} md={2} key={k.label}>
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', p: 1.5, textAlign: 'center', borderRadius: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#0f62fe' }}>{k.value}</Typography>
              <Typography sx={{ fontSize: 11, color: '#525252' }}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Spend + Supplier + Date summaries */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {analysis.spend_summary && (
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>
                <InsightsIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                Spend Summary
              </Typography>
              <Table size="small">
                <TableBody>
                  {[
                    ['Total Spend',  fmt(analysis.spend_summary.total_spend)],
                    ['Avg per Row',  fmt(analysis.spend_summary.avg_per_row)],
                    ['Min Value',    fmt(analysis.spend_summary.min_value)],
                    ['Max Value',    fmt(analysis.spend_summary.max_value)],
                    ['Transactions', analysis.spend_summary.rows_with_amount.toLocaleString()],
                  ].map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.4, pl: 0, fontSize: 12, width: 120 }}>{k}</TableCell>
                      <TableCell sx={{ border: 'none', py: 0.4, fontSize: 12 }}>{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}

        {analysis.supplier_summary && (
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>
                Top Suppliers by Volume
              </Typography>
              <Table size="small">
                <TableBody>
                  {(analysis.supplier_summary.top_suppliers_by_spend
                    ?? analysis.supplier_summary.top_suppliers.map(s => ({ name: s.name, total_spend: null }))
                  ).slice(0, 5).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ border: 'none', py: 0.4, pl: 0, fontSize: 12, maxWidth: 160,
                                       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </TableCell>
                      <TableCell sx={{ border: 'none', py: 0.4, fontSize: 12, textAlign: 'right' }}>
                        {'total_spend' in s && s.total_spend != null ? fmt(s.total_spend) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography sx={{ fontSize: 11, color: '#525252', mt: 1 }}>
                {analysis.supplier_summary.unique_suppliers} unique suppliers
              </Typography>
            </Paper>
          </Grid>
        )}

        {analysis.date_range && (
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>Date Range</Typography>
              <Table size="small">
                <TableBody>
                  {[
                    ['Column',    analysis.date_range.column_used],
                    ['Earliest',  analysis.date_range.earliest],
                    ['Latest',    analysis.date_range.latest],
                    ['Span',      `${analysis.date_range.span_days} days`],
                  ].map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.4, pl: 0, fontSize: 12, width: 80 }}>{k}</TableCell>
                      <TableCell sx={{ border: 'none', py: 0.4, fontSize: 12 }}>{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Column Profiles */}
      <Accordion elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px !important', mb: 1.5 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            <TableChartIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            Column Profiles ({analysis.column_profiles.length} columns)
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f8fa' }}>
                  {['Column', 'Type', 'Fill %', 'Nulls', 'Unique', 'Min', 'Max', 'Sum / Top Values'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, py: 1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {analysis.column_profiles.map(col => (
                  <TableRow key={col.column} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600, maxWidth: 150,
                                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {col.column}
                    </TableCell>
                    <TableCell>
                      <Chip label={col.dtype} size="small"
                        sx={{ fontSize: 10, height: 18, bgcolor: '#e0e0e0' }} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}><FillBar pct={col.fill_pct} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{col.null_count}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{col.unique_count.toLocaleString()}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{col.min != null ? col.min.toLocaleString() : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{col.max != null ? col.max.toLocaleString() : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 200 }}>
                      {col.sum != null
                        ? fmt(col.sum)
                        : col.top_values?.slice(0, 3).map(v => `${v.value} (${v.count})`).join(', ') ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Sample Rows */}
      {analysis.sample_rows.length > 0 && (
        <Accordion elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px !important', mb: 1.5 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
              Sample Data — First {analysis.sample_rows.length} Rows
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ overflowX: 'auto', maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f7f8fa' }}>
                    {analysis.overview.columns.map(c => (
                      <TableCell key={c} sx={{ fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', bgcolor: '#f7f8fa' }}>
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysis.sample_rows.map((row, i) => (
                    <TableRow key={i} hover>
                      {analysis.overview.columns.map(c => (
                        <TableCell key={c} sx={{ fontSize: 11, maxWidth: 160,
                                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row[c] ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Correction Report */}
      {status.correction_report.length > 0 && (
        <Accordion elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px !important' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
              Correction Report ({status.correction_report.length} items)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense disablePadding>
              {status.correction_report.map((entry, i) => (
                <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%', mr: 1.5, flexShrink: 0,
                    bgcolor: entry.action === 'removed' ? '#da1e28'
                           : entry.action === 'merged'  ? '#f1c21b'
                           : entry.action === 'renamed' ? '#0043ce'
                           : '#198038',
                  }} />
                  <ListItemText
                    primary={entry.description}
                    secondary={`Stage: ${entry.stage} · ${entry.affected_rows} rows · Action: ${entry.action}`}
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IDEPage() {
  const [uploading, setUploading]     = useState(false);
  const [polling, setPolling]         = useState(false);
  const [status, setStatus]           = useState<IngestionStatus | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pollStatus = useCallback(async (id: string) => {
    setPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await apiClient.get<IngestionStatus>(`/ide/status/${id}`);
        setStatus(data);
        if (['completed', 'failed', 'partial', 'not_found'].includes(data.status) || attempts > 60) {
          clearInterval(interval);
          setPolling(false);
          // Invalidate dashboard data so KPIs, trend, suppliers, categories all reload
          if (data.status === 'completed' || data.status === 'partial') {
            void queryClient.invalidateQueries({ queryKey: ['spend-kpis'] });
            void queryClient.invalidateQueries({ queryKey: ['spend-monthly-trend'] });
            void queryClient.invalidateQueries({ queryKey: ['top-suppliers'] });
            void queryClient.invalidateQueries({ queryKey: ['spend-categories'] });
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
      }
    }, 2000);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploadError(null);
    setStatus(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', acceptedFiles[0]);
      // Use /upload-dataset — clears previous tenant data before ingesting
      const { data } = await apiClient.post('/ide/upload-dataset', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Invalidate dataset-status immediately so DatasetGates re-evaluate
      void queryClient.invalidateQueries({ queryKey: ['ide-dataset-status'] });
      pollStatus(data.ingestion_id);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [pollStatus, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploading || polling,
  });

  const isProcessing = polling || status?.status === 'processing';
  const isDone = status?.status === 'completed';
  const isFailed = status?.status === 'failed';

  return (
    <Box>
      <ExecutiveSummary
        title="Intelligent Data Engine"
        summary="Upload your procurement workbook — the single source of truth for all ProcureIQ modules. The IDE reads every sheet, maps columns to the canonical schema, cleans the data, deduplicates suppliers, normalises dates and currencies, then populates all analytics modules instantly."
        highlights={['Multi-Sheet Excel Support', 'AI Column Mapping', 'Supplier Deduplication', 'Data Health Score', 'Ignite AI Summary']}
      />

      {/* ── Primary Dataset Upload Banner ─────────────────────────────────── */}
      <Box sx={{
        bgcolor: '#001d6c', borderRadius: 1, p: 3, mb: 3,
        display: 'flex', alignItems: 'center', gap: 3,
        flexWrap: 'wrap',
      }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#fff', mb: 0.5 }}>
            Upload Procurement Dataset
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#a8c7fa', lineHeight: 1.6 }}>
            Upload a multi-sheet Excel workbook to populate all modules. Previous data is replaced on each upload — Excel is the only source of truth.
          </Typography>
        </Box>
        <Box>
          <Paper {...getRootProps()} elevation={0} sx={{
            border: `2px dashed ${isDragActive ? '#78a9ff' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 1, px: 4, py: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: isDragActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            transition: 'all 0.2s', minWidth: 280,
            '&:hover': { borderColor: '#78a9ff', bgcolor: 'rgba(255,255,255,0.10)' },
            opacity: (uploading || polling) ? 0.6 : 1,
          }}>
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 32, color: '#78a9ff', mb: 0.5 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#fff', mb: 0.5 }}>
              {isDragActive ? 'Drop here…' : 'Drag & drop or browse'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#a8c7fa', mb: 1.5 }}>
              XLSX / XLS · Max 50 MB
            </Typography>
            <Button variant="contained" size="small" startIcon={<CloudUploadIcon />}
              disabled={uploading || polling}
              sx={{ bgcolor: '#0f62fe', '&:hover': { bgcolor: '#0353e9' }, fontWeight: 700 }}>
              {uploading ? 'Uploading…' : 'Select File'}
            </Button>
          </Paper>
        </Box>
      </Box>

      {/* Supported sheet types guide */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>
          Supported Excel Sheet Types — include any or all in your workbook
        </Typography>
        <Grid container spacing={1.5}>
          {[
            { type: 'Spend_Data',  aliases: 'Transactions, Spend, Invoice_Data',  desc: 'Purchase orders, invoices, spend transactions', color: '#0f62fe' },
            { type: 'Suppliers',   aliases: 'Vendor_Master, Vendors',              desc: 'Supplier master data — name, category, country, tier', color: '#6929c4' },
            { type: 'Contracts',   aliases: 'Contract_Register, Contract_List',    desc: 'Contract records — title, dates, value, status', color: '#007d79' },
            { type: 'Risk',        aliases: 'Risk_Register, Supplier_Risk',        desc: 'Supplier risk scores — financial, ESG, geo, compliance', color: '#da1e28' },
            { type: 'Savings',     aliases: 'Savings_Pipeline, Savings_Opportunities', desc: 'Savings pipeline — type, value, confidence, effort', color: '#198038' },
            { type: 'Forecast',    aliases: 'Spend_Forecast, Forecasting',         desc: 'Monthly spend forecast data', color: '#f1c21b' },
          ].map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.type}>
              <Box sx={{ border: `1px solid ${s.color}30`, borderLeft: `3px solid ${s.color}`, borderRadius: 1, p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.type}</Typography>
                <Typography sx={{ fontSize: 11, color: '#525252', mb: 0.25 }}>{s.desc}</Typography>
                <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>Also: {s.aliases}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

      {/* Progress bar while processing */}
      {isProcessing && !isDone && (
        <Paper elevation={0} sx={{ border: '1px solid #d0e2ff', borderRadius: 1, p: 2, mb: 2, bgcolor: '#eff4ff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Processing your file through 8 pipeline stages…</Typography>
          </Box>
          <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
          <Typography sx={{ fontSize: 11, color: '#525252', mt: 1 }}>
            Parsing → Schema inference → Column mapping → Quality checks → Supplier normalisation → Date normalisation → Health score → Analysis
          </Typography>
        </Paper>
      )}

      {/* Error */}
      {isFailed && status?.error_message && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Processing failed:</strong> {status.error_message}
        </Alert>
      )}

      {/* Full analysis result */}
      {isDone && status && (
        <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <StatusIcon status={status.status} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
              Analysis Complete — {status.analysis?.overview.filename}
            </Typography>
            {status.health_score != null && (
              <Box sx={{ ml: 'auto' }}>
                <HealthGauge score={Math.round(status.health_score)} />
              </Box>
            )}
          </Box>

          {status.analysis ? (
            <AnalysisPanel analysis={status.analysis} status={status} />
          ) : (
            // Fallback if analysis is null
            <Table size="small">
              <TableBody>
                {[
                  ['Rows Processed', status.rows_total?.toLocaleString() ?? '—'],
                  ['Clean Rows',     status.rows_clean?.toLocaleString() ?? '—'],
                  ['Quarantined',    status.rows_quarantined?.toLocaleString() ?? '—'],
                  ['Health Score',   `${status.health_score}/100`],
                  ['Corrections',    status.correction_report.length],
                ].map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.5, pl: 0, width: 160 }}>{k}</TableCell>
                    <TableCell sx={{ border: 'none', py: 0.5 }}>{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* Pipeline stages legend */}
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mt: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.5 }}>IDE Pipeline — 8 Stages</Typography>
        <Grid container spacing={1.5}>
          {[
            { n: 1, name: 'Format Detection',             desc: 'Detect file type, encoding, delimiters' },
            { n: 2, name: 'Schema Inference',              desc: 'Auto-detect headers and data types' },
            { n: 3, name: 'AI Column Mapping',             desc: 'Map raw headers to canonical schema', ai: true },
            { n: 4, name: 'Data Quality Checks',           desc: 'Nulls, duplicates, invalid formats' },
            { n: 5, name: 'Supplier Normalisation',        desc: 'Fuzzy-match and merge name variants', ai: true },
            { n: 6, name: 'Date & Currency Normalization', desc: 'Standardise amounts to USD, dates to ISO' },
            { n: 7, name: 'Data Health Score',             desc: 'Score completeness, uniqueness, validity' },
            { n: 8, name: 'Rich Analysis',                 desc: 'Column profiles, spend/supplier/date summary + Ignite narrative', ai: true },
          ].map(s => (
            <Grid item xs={12} sm={6} md={3} key={s.n}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 22, height: 22, bgcolor: '#0f62fe', borderRadius: '50%', flexShrink: 0,
                             display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{s.n}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{s.name}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{s.desc}</Typography>
                {s.ai && <Chip label="AI" size="small"
                  sx={{ mt: 0.5, bgcolor: '#eff4ff', color: '#0043ce', fontSize: 10, fontWeight: 700, height: 18 }} />}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
