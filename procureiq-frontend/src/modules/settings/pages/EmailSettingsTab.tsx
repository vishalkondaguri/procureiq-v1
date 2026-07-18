import { useState, useEffect } from 'react';
import {
  Box, Grid, TextField, Button, Typography, Alert, Chip,
  FormControlLabel, Switch, FormControl, InputLabel, Select,
  MenuItem, CircularProgress, Divider, InputAdornment, IconButton,
  Paper,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailConfig {
  smtp_host:     string;
  smtp_port:     string;
  smtp_user:     string;
  smtp_password: string;
  smtp_from:     string;
  smtp_enabled:  string;
  smtp_security: string;
  frontend_url:  string;
}

interface TestResult {
  ok: boolean;
  message: string;
}

// ── Preset providers ──────────────────────────────────────────────────────────

interface Preset {
  label: string;
  host: string;
  port: number;
  security: string;
  id: string;
}

const PRESETS: Preset[] = [
  { id: 'ibm',        label: 'IBM Outlook (Corporate)', host: 'smtp.office365.com',    port: 587, security: 'starttls' },
  { id: 'o365',       label: 'Microsoft 365',           host: 'smtp.office365.com',    port: 587, security: 'starttls' },
  { id: 'gmail',      label: 'Gmail',                   host: 'smtp.gmail.com',         port: 587, security: 'starttls' },
  { id: 'yahoo',      label: 'Yahoo Mail',              host: 'smtp.mail.yahoo.com',    port: 587, security: 'starttls' },
  { id: 'mailtrap',   label: 'Mailtrap (Safe Test)',    host: 'live.smtp.mailtrap.io',  port: 587, security: 'starttls' },
  { id: 'custom465',  label: 'Custom (SSL 465)',         host: '',                      port: 465, security: 'ssl' },
  { id: 'custom587',  label: 'Custom (TLS 587)',         host: '',                      port: 587, security: 'starttls' },
];

// ── Per-provider setup guides ─────────────────────────────────────────────────

interface Guide {
  title: string;
  color: string;
  bg: string;
  border: string;
  steps: React.ReactNode[];
  passwordLabel: string;
  passwordPlaceholder: string;
  usernamePlaceholder: string;
}

const GUIDES: Record<string, Guide> = {
  ibm: {
    title: 'IBM Outlook: App Password Required',
    color: '#0043ce', bg: '#eff4ff', border: '#d0e2ff',
    passwordLabel: 'IBM App Password (NOT your IBM w3 password)',
    passwordPlaceholder: 'App Password from IBM Security settings',
    usernamePlaceholder: 'yourname@ibm.com  or  yourname@us.ibm.com',
    steps: [
      <>Sign in to your IBM account at <strong>myibm.ibm.com</strong> or <strong>w3.ibm.com</strong></>,
      <>Go to <strong>IBM Security → My Account → App Passwords</strong> (or search "app password" in w3 helpdesk)</>,
      <>Create a new App Password — name it "ProcureIQ SMTP"</>,
      <>Copy the generated password and paste it in the SMTP Password field below</>,
      <>Your IBM email address (<strong>yourname@ibm.com</strong>) is the SMTP username</>,
      <><strong style={{color:'#da1e28'}}>Important:</strong> Do NOT use your normal IBM w3id / Okta password — it will be rejected by IBM IT policy.</>,
    ],
  },
  o365: {
    title: 'Microsoft 365 / Outlook: App Password or SMTP Auth',
    color: '#0043ce', bg: '#eff4ff', border: '#d0e2ff',
    passwordLabel: 'Microsoft App Password',
    passwordPlaceholder: 'App Password from Microsoft Account Security',
    usernamePlaceholder: 'yourname@yourcompany.com',
    steps: [
      <>Sign in at <strong>account.microsoft.com/security</strong></>,
      <>Under <strong>Security → Advanced security options</strong>, enable <strong>App passwords</strong></>,
      <>Create a new App Password — name it "ProcureIQ"</>,
      <>Copy and paste the generated password below</>,
      <>If App Passwords are greyed out, ask your Microsoft 365 admin to enable SMTP AUTH in the admin portal</>,
    ],
  },
  gmail: {
    title: 'Gmail: 16-Character App Password Required',
    color: '#7a4400', bg: '#fff8e1', border: '#f1c21b',
    passwordLabel: 'Gmail App Password (16 characters)',
    passwordPlaceholder: 'xxxx xxxx xxxx xxxx  (16-char App Password)',
    usernamePlaceholder: 'yourname@gmail.com',
    steps: [
      <>Go to <strong>myaccount.google.com/security</strong></>,
      <>Enable <strong>2-Step Verification</strong> (required)</>,
      <>Go to <strong>myaccount.google.com/apppasswords</strong></>,
      <>Select app: <em>Mail</em> → device: <em>Windows Computer</em> → click <strong>Generate</strong></>,
      <>Copy the 16-char code and paste it in the SMTP Password field below (spaces are fine)</>,
    ],
  },
  mailtrap: {
    title: 'Mailtrap: Safe Email Testing (No Real Emails Sent)',
    color: '#198038', bg: '#defbe6', border: '#a7f0ba',
    passwordLabel: 'Mailtrap API Token',
    passwordPlaceholder: 'Your Mailtrap API token',
    usernamePlaceholder: 'api',
    steps: [
      <>Sign up free at <strong>mailtrap.io</strong></>,
      <>Go to <strong>Email Sending → API Tokens</strong> and create a token</>,
      <>Use <strong>api</strong> as the SMTP username and the token as the password</>,
      <>All emails appear in your Mailtrap inbox — nothing is delivered to real addresses</>,
      <>Perfect for demos and testing without spamming real inboxes</>,
    ],
  },
};

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 3, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f7f8fa', borderBottom: '1px solid #e0e0e0' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#161616' }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11, color: '#6f6f6f', mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Box>
  );
}

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <Chip
      icon={enabled
        ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
        : <ErrorOutlineIcon sx={{ fontSize: '14px !important' }} />}
      label={enabled ? 'Email Enabled' : 'Console Mode (no real emails)'}
      size="small"
      sx={{
        bgcolor: enabled ? '#defbe6' : '#fff8e1',
        color:   enabled ? '#044317' : '#7a6500',
        fontWeight: 700, fontSize: 11, height: 24,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EmailSettingsTab() {
  const [form, setForm]             = useState<EmailConfig>({
    smtp_host: 'smtp.office365.com', smtp_port: '587', smtp_user: '',
    smtp_password: '', smtp_from: 'ProcureIQ <noreply@ibm.com>',
    smtp_enabled: 'false', smtp_security: 'starttls', frontend_url: 'http://localhost:3000',
  });
  const [activePreset, setActivePreset] = useState<string>('ibm');
  const [showPwd, setShowPwd]       = useState(false);
  const [testEmail, setTestEmail]   = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveOk, setSaveOk]         = useState(false);

  // Load saved config
  const { data: saved, isLoading } = useQuery<EmailConfig>({
    queryKey: ['settings-email'],
    queryFn: async () => {
      const { data } = await apiClient.get<EmailConfig>('/settings/email');
      return data;
    },
  });

  useEffect(() => {
    if (saved) setForm(prev => ({ ...prev, ...saved }));
  }, [saved]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      await apiClient.put('/settings/email', {
        smtp_host:     form.smtp_host,
        smtp_port:     parseInt(form.smtp_port, 10),
        smtp_user:     form.smtp_user,
        smtp_password: form.smtp_password,
        smtp_from:     form.smtp_from,
        smtp_enabled:  form.smtp_enabled === 'true',
        smtp_security: form.smtp_security,
        frontend_url:  form.frontend_url,
      });
    },
    onSuccess: () => { setSaveOk(true); setTimeout(() => setSaveOk(false), 4000); },
  });

  // Test send mutation
  const testMut = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<TestResult>('/settings/email/test', {
        smtp_host:     form.smtp_host,
        smtp_port:     parseInt(form.smtp_port, 10),
        smtp_user:     form.smtp_user,
        smtp_password: form.smtp_password,
        smtp_from:     form.smtp_from,
        smtp_enabled:  form.smtp_enabled === 'true',
        smtp_security: form.smtp_security,
        frontend_url:  form.frontend_url,
        test_to:       testEmail,
      });
      return data;
    },
    onSuccess: (result) => setTestResult(result),
    onError:   ()       => setTestResult({ ok: false, message: 'Request failed. Check backend logs.' }),
  });

  function set(key: keyof EmailConfig, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
    setTestResult(null);
  }

  function applyPreset(id: string) {
    const p = PRESETS.find(x => x.id === id);
    if (!p) return;
    setActivePreset(id);
    setTestResult(null);
    setForm(prev => ({
      ...prev,
      smtp_host:     p.host,
      smtp_port:     String(p.port),
      smtp_security: p.security,
    }));
  }

  const guide = GUIDES[activePreset] ?? null;

  const enabled = form.smtp_enabled === 'true';

  if (isLoading) {
    return <Box sx={{ p: 2 }}><CircularProgress size={24} /></Box>;
  }

  return (
    <Box>
      {/* Status banner */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <EmailOutlinedIcon sx={{ color: '#0f62fe', fontSize: 28 }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Email Configuration</Typography>
          <Typography sx={{ fontSize: 12, color: '#6f6f6f' }}>
            Configure SMTP to send welcome emails, password resets, and procurement digest notifications.
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <StatusPill enabled={enabled} />
        </Box>
      </Box>

      {/* Enable toggle */}
      <SectionCard
        title="Email Status"
        subtitle="When disabled, emails are printed to the backend console log instead of being sent."
      >
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={e => set('smtp_enabled', e.target.checked ? 'true' : 'false')}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                {enabled ? 'Live email sending enabled' : 'Console mode (no real emails sent)'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>
                {enabled
                  ? 'ProcureIQ will send real emails via your SMTP server.'
                  : 'Safe for development and demos. All emails appear in the backend log.'}
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', ml: 0 }}
        />
      </SectionCard>

      {/* Quick-select provider */}
      <SectionCard title="Provider Setup" subtitle="Select your email provider — setup instructions appear automatically.">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {PRESETS.map(p => (
            <Chip
              key={p.id}
              label={p.label}
              size="small"
              onClick={() => applyPreset(p.id)}
              variant={activePreset === p.id ? 'filled' : 'outlined'}
              sx={{
                cursor: 'pointer', fontSize: 12,
                ...(activePreset === p.id
                  ? { bgcolor: '#0f62fe', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#0043ce' } }
                  : { '&:hover': { bgcolor: '#eff4ff', borderColor: '#0f62fe', color: '#0f62fe' } }
                ),
              }}
            />
          ))}
        </Box>

        {/* Dynamic provider guide */}
        {guide && (
          <Paper variant="outlined" sx={{ p: 1.75, bgcolor: guide.bg, border: `1px solid ${guide.border}` }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: guide.color, mt: 0.25, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: guide.color, mb: 1 }}>
                  {guide.title}
                </Typography>
                <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                  {guide.steps.map((step, i) => (
                    <Box component="li" key={i} sx={{ fontSize: 12, color: '#161616', lineHeight: 1.7, mb: 0.25 }}>
                      {step}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </SectionCard>

      {/* SMTP Settings form */}
      <SectionCard title="SMTP Server Settings">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth size="small" label="SMTP Host"
              value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth size="small" label="Port"
              type="number" value={form.smtp_port}
              onChange={e => set('smtp_port', e.target.value)}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Security</InputLabel>
              <Select value={form.smtp_security} label="Security"
                onChange={e => set('smtp_security', e.target.value as string)}>
                <MenuItem value="starttls">STARTTLS (587)</MenuItem>
                <MenuItem value="ssl">SSL (465)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="SMTP Username / Email"
              value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)}
              placeholder={guide?.usernamePlaceholder ?? 'your-email@company.com'}
              autoComplete="off"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small"
              label={guide?.passwordLabel ?? 'SMTP Password'}
              type={showPwd ? 'text' : 'password'}
              value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)}
              placeholder={guide?.passwordPlaceholder ?? 'App Password'}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(v => !v)} edge="end">
                      {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth size="small" label="From Address"
              value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)}
              placeholder='ProcureIQ <noreply@yourcompany.com>'
              helperText='Shown as "From" in emails. Use format: Display Name <email@domain.com>'
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Frontend URL */}
      <SectionCard
        title="Application URL"
        subtitle="Used to build password-reset links in emails."
      >
        <TextField
          fullWidth size="small" label="Frontend Base URL"
          value={form.frontend_url} onChange={e => set('frontend_url', e.target.value)}
          placeholder="https://procureiq.yourcompany.com"
          helperText="Password reset links will be: {Frontend URL}/reset-password?token=..."
        />
      </SectionCard>

      {/* Save + Test row */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={saveMut.isPending ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Save Configuration
        </Button>
        {saveOk && (
          <Alert severity="success" sx={{ py: 0, fontSize: 12 }}>
            Configuration saved successfully.
          </Alert>
        )}
        {saveMut.isError && (
          <Alert severity="error" sx={{ py: 0, fontSize: 12 }}>
            Save failed. Check console.
          </Alert>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Test Send section */}
      <SectionCard
        title="Test Email"
        subtitle="Verify your SMTP settings by sending a test email. Uses the form values above — no need to save first."
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Send test email to"
            type="email"
            value={testEmail}
            onChange={e => { setTestEmail(e.target.value); setTestResult(null); }}
            placeholder="your-email@example.com"
            sx={{ flex: '1 1 280px', minWidth: 220 }}
          />
          <Button
            variant="outlined"
            startIcon={testMut.isPending ? <CircularProgress size={14} /> : <SendIcon />}
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending || !testEmail.trim() || !form.smtp_user || !form.smtp_password}
            sx={{ textTransform: 'none', fontWeight: 700, height: 40 }}
          >
            {testMut.isPending ? 'Sending…' : 'Send Test Email'}
          </Button>
        </Box>

        {(!form.smtp_user || !form.smtp_password) && (
          <Typography sx={{ fontSize: 11, color: '#8d8d8d', mt: 1 }}>
            Fill in SMTP Username and Password above before testing.
          </Typography>
        )}

        {testResult && (
          <Alert
            severity={testResult.ok ? 'success' : 'error'}
            sx={{ mt: 2, fontSize: 13 }}
            icon={testResult.ok ? <CheckCircleIcon fontSize="inherit" /> : <ErrorOutlineIcon fontSize="inherit" />}
          >
            {testResult.message}
          </Alert>
        )}
      </SectionCard>

      {/* Reference */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f4f4f4' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 1 }}>
          Which emails does ProcureIQ send?
        </Typography>
        {[
          ['Welcome Email',         'Sent when an admin approves a user access request. Contains temporary password.'],
          ['Password Reset',        'Sent when a user clicks "Forgot password?" on the login page.'],
          ['Procurement Digest',    '(Coming soon) Weekly summary of spend anomalies and contract alerts.'],
        ].map(([title, desc]) => (
          <Box key={title} sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: '#198038', mt: 0.3, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12 }}>
              <strong>{title}</strong> — {desc}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
