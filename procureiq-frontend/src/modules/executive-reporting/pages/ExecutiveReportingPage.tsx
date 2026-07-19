import { useState, useRef } from 'react';
import {
  Box, Grid, Typography, Button, Chip, Alert,
  FormControlLabel, Checkbox, TextField, CircularProgress,
  Divider, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/core/api/client';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';

const MODULE_OPTIONS = [
  { key: 'spend',     label: 'Spend Analytics',        icon: '📊' },
  { key: 'contracts', label: 'Contract Intelligence',  icon: '📋' },
  { key: 'risk',      label: 'Supplier Risk',           icon: '⚠️' },
  { key: 'savings',   label: 'Savings Opportunities',  icon: '💰' },
  { key: 'health',    label: 'Health Score',            icon: '❤️' },
  { key: 'forecast',  label: 'Spend Forecast',          icon: '📈' },
];

export default function ExecutiveReportingPage() {
  const CY = new Date().getFullYear();
  const [title, setTitle]               = useState(`Executive Procurement Report — FY ${CY}`);
  const [periodStart, setPeriodStart]   = useState(`${CY}-01-01`);
  const [periodEnd, setPeriodEnd]       = useState(`${CY}-12-31`);
  const [selectedModules, setModules]   = useState(MODULE_OPTIONS.map(m => m.key));
  const [customNotes, setNotes]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [reportData, setReportData]     = useState<any>(null);
  const [error, setError]               = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleModule = (key: string) => {
    setModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    setLoading(true); setError(null); setReportData(null);
    try {
      const { data } = await apiClient.post('/reports/generate', {
        title,
        period_start: periodStart,
        period_end:   periodEnd,
        include_modules: selectedModules,
        custom_notes: customNotes || null,
      });
      setReportData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Report generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData?.html) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(reportData.html);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadHTML = () => {
    if (!reportData?.html) return;
    const blob = new Blob([reportData.html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <ExecutiveSummary
        title="Executive Reporting"
        summary="Generate a complete AI-narrated executive procurement report in seconds. Select the modules to include, set the reporting period, and Ignite AI (IBM watsonx) will assemble live data from all modules and write a professional executive narrative. The report is fully printable and downloadable."
        highlights={['AI Narrative', 'All Modules', 'Print-Ready', 'IBM watsonx']}
      />

      <Grid container spacing={3}>
        {/* Report Builder */}
        <Grid item xs={12} md={5}>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Report Configuration</Typography>

            {/* Title */}
            <TextField
              label="Report Title" fullWidth size="small" value={title}
              onChange={e => setTitle(e.target.value)} sx={{ mb: 2 }}
            />

            {/* Period */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField label="Period Start" type="date" fullWidth size="small"
                  value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Period End" type="date" fullWidth size="small"
                  value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>

            {/* Module Selection */}
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Include Modules:</Typography>
            <Grid container spacing={0.5} sx={{ mb: 2 }}>
              {MODULE_OPTIONS.map(m => (
                <Grid item xs={6} key={m.key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small" checked={selectedModules.includes(m.key)}
                        onChange={() => toggleModule(m.key)}
                        sx={{ '&.Mui-checked': { color: '#0f62fe' } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: 13 }}>{m.icon} {m.label}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Custom Notes */}
            <TextField
              label="Custom Notes (optional)"
              fullWidth multiline rows={3} size="small" value={customNotes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add context, strategic priorities, or specific focus areas for the AI narrative…"
              sx={{ mb: 2.5 }}
            />

            <Button
              variant="contained" fullWidth size="large"
              startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              disabled={loading || selectedModules.length === 0}
              sx={{ height: 48, fontWeight: 700 }}
            >
              {loading ? 'Generating Report…' : 'Generate Report with Ignite AI'}
            </Button>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {/* Report ready actions */}
            {reportData?.status === 'completed' && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: '#198038' }}>
                  ✅ Report ready — {reportData.word_count?.toLocaleString()} words
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" startIcon={<PrintIcon />}
                    onClick={handlePrint} sx={{ flex: 1 }}>
                    Print / Save PDF
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<DownloadIcon />}
                    onClick={handleDownloadHTML} sx={{ flex: 1 }}>
                    Download HTML
                  </Button>
                </Box>
              </>
            )}
          </Box>

          {/* What's included */}
          <Box sx={{ mt: 2, bgcolor: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Report includes:</Typography>
            <List dense disablePadding>
              {[
                'Live KPI ribbon from all selected modules',
                'Ignite AI executive narrative (watsonx)',
                'Top 5 suppliers by spend table',
                '6-month spend forecast with confidence bands',
                'Supplier risk summary matrix',
                'Print-ready / PDF export',
              ].map((item, i) => (
                <ListItem key={i} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 24 }}>
                    <CheckCircleIcon sx={{ fontSize: 14, color: '#198038' }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontSize: 12 }}>{item}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Grid>

        {/* Report Preview */}
        <Grid item xs={12} md={7}>
          {!reportData && !loading && (
            <Box sx={{ bgcolor: '#f7f8fa', border: '2px dashed #e0e0e0', borderRadius: 1, p: 6,
                       textAlign: 'center', display: 'flex', flexDirection: 'column',
                       alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 480 }}>
              <AssessmentIcon sx={{ fontSize: 60, color: '#c6c6c6' }} />
              <Typography sx={{ fontWeight: 700, color: '#525252', fontSize: 18 }}>Report Preview</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                Configure your report on the left and click "Generate" to create an AI-narrated executive report powered by IBM watsonx.
              </Typography>
            </Box>
          )}
          {loading && (
            <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 4,
                       display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, minHeight: 480,
                       justifyContent: 'center' }}>
              <CircularProgress size={48} sx={{ color: '#0f62fe' }} />
              <Typography sx={{ fontWeight: 700, color: '#525252' }}>Ignite is writing your report…</Typography>
              <Box sx={{ width: '100%', maxWidth: 360 }}>
                {[
                  'Collecting KPIs from all modules…',
                  'Assembling spend data…',
                  'Generating AI narrative with IBM watsonx…',
                  'Rendering report…',
                ].map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <CircularProgress size={12} sx={{ color: '#0f62fe', flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">{step}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          {reportData?.status === 'completed' && reportData.html && (
            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden', bgcolor: '#fff' }}>
              <Box sx={{ px: 2, py: 1.5, bgcolor: '#f4f4f4', borderBottom: '1px solid #e0e0e0',
                         display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssessmentIcon sx={{ color: '#0f62fe', fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{reportData.title}</Typography>
                <Chip label="Preview" size="small" sx={{ bgcolor: '#eff4ff', color: '#0f62fe', fontSize: 10, height: 20, ml: 'auto' }} />
              </Box>
              <iframe
                ref={iframeRef}
                srcDoc={reportData.html}
                style={{ width: '100%', height: 600, border: 'none' }}
                title="Report Preview"
                sandbox="allow-same-origin"
              />
            </Box>
          )}
          {reportData?.status === 'failed' && (
            <Alert severity="error" sx={{ m: 2 }}>
              Report generation failed: {reportData.error}
            </Alert>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
