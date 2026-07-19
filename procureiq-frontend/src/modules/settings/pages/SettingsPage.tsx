import { useState } from 'react';
import {
  Box, Tabs, Tab, Typography, Grid, Card, CardContent, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Tooltip, LinearProgress, Paper, Skeleton, Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SaveIcon from '@mui/icons-material/Save';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import StorageIcon from '@mui/icons-material/Storage';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import EmailSettingsTab from './EmailSettingsTab';
import DataSourcesTab from './DataSourcesTab';
import {
  useAllSettings, useUpdateSettings, useUsers, useCreateUser,
  useUpdateUserRole, useToggleUserActive, useAuditLogs, useAuditSummary,
  useSystemHealth, useSystemVersion,
  usePendingUsers, useApproveUser, useRejectUser,
} from '../hooks/useSettings';

// ── Helper ────────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: 14, color: '#161616' }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
        onClick={onClick}
        disabled={loading}
      >
        Save Changes
      </Button>
    </Box>
  );
}

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  admin: 'error',
  procurement_manager: 'warning',
  analyst: 'info',
  viewer: 'default',
};

// ── Tab: General ──────────────────────────────────────────────────────────────

function GeneralTab({ settings }: { settings: Record<string, string> | undefined }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const { mutate, isPending, isSuccess } = useUpdateSettings('general');

  const val = (key: string) => form[key] ?? settings?.[key] ?? '';
  const set = (key: string, v: string) => setForm(p => ({ ...p, [key]: v }));

  return (
    <Box>
      <SectionCard title="Application Identity">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Application Name" value={val('app_name')} onChange={e => set('app_name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Company Name" value={val('company_name')} onChange={e => set('company_name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Logo URL" value={val('logo_url')} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Timezone</InputLabel>
              <Select value={val('timezone')} label="Timezone" onChange={e => set('timezone', e.target.value as string)}>
                {['America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Tokyo','Asia/Singapore','Australia/Sydney'].map(tz => (
                  <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Format</InputLabel>
              <Select value={val('date_format')} label="Date Format" onChange={e => set('date_format', e.target.value as string)}>
                {['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD'].map(f => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {isSuccess && <Alert severity="success" sx={{ mt: 2 }}>General settings saved successfully.</Alert>}
        <SaveButton loading={isPending} onClick={() => mutate(form)} />
      </SectionCard>
    </Box>
  );
}

// ── Tab: Currency & Fiscal ─────────────────────────────────────────────────────

function CurrencyTab({ settings }: { settings: Record<string, Record<string, string>> | undefined }) {
  const currencySettings = settings?.currency ?? {};
  const fiscalSettings = settings?.fiscal ?? {};
  const [currForm, setCurrForm] = useState<Record<string, string>>({});
  const [fiscForm, setFiscForm] = useState<Record<string, string>>({});
  const { mutate: saveCurr, isPending: savingCurr, isSuccess: currOk } = useUpdateSettings('currency');
  const { mutate: saveFisc, isPending: savingFisc, isSuccess: fiscOk } = useUpdateSettings('fiscal');

  const cval = (k: string) => currForm[k] ?? currencySettings[k] ?? '';
  const fval = (k: string) => fiscForm[k] ?? fiscalSettings[k] ?? '';

  return (
    <Box>
      <SectionCard title="Currency Configuration">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Base Currency</InputLabel>
              <Select value={cval('base_currency')} label="Base Currency" onChange={e => setCurrForm(p => ({ ...p, base_currency: e.target.value as string }))}>
                {['USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','INR'].map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Currency Symbol" value={cval('display_symbol')} onChange={e => setCurrForm(p => ({ ...p, display_symbol: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Decimal Places</InputLabel>
              <Select value={cval('decimal_places')} label="Decimal Places" onChange={e => setCurrForm(p => ({ ...p, decimal_places: e.target.value as string }))}>
                {['0','1','2','3'].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Thousands Separator</InputLabel>
              <Select value={cval('thousands_separator')} label="Thousands Separator" onChange={e => setCurrForm(p => ({ ...p, thousands_separator: e.target.value as string }))}>
                <MenuItem value=",">, (comma)</MenuItem>
                <MenuItem value=".">. (period)</MenuItem>
                <MenuItem value=" ">  (space)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={cval('fx_rates_enabled') === 'true'} onChange={e => setCurrForm(p => ({ ...p, fx_rates_enabled: String(e.target.checked) }))} />}
              label="Live FX Rates (requires external integration)"
            />
          </Grid>
        </Grid>
        {currOk && <Alert severity="success" sx={{ mt: 2 }}>Currency settings saved.</Alert>}
        <SaveButton loading={savingCurr} onClick={() => saveCurr(currForm)} />
      </SectionCard>

      <SectionCard title="Fiscal Year Configuration">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Fiscal Year Start Month</InputLabel>
              <Select value={fval('fiscal_year_start_month')} label="Fiscal Year Start Month" onChange={e => setFiscForm(p => ({ ...p, fiscal_year_start_month: e.target.value as string }))}>
                {['1','2','3','4','5','6','7','8','9','10','11','12'].map(m => (
                  <MenuItem key={m} value={m}>{new Date(2024, parseInt(m) - 1, 1).toLocaleString('en', { month: 'long' })}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Fiscal Year Label" value={fval('fiscal_year_label')} onChange={e => setFiscForm(p => ({ ...p, fiscal_year_label: e.target.value }))} placeholder="e.g. FY" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Current Fiscal Year" value={fval('current_fiscal_year')} onChange={e => setFiscForm(p => ({ ...p, current_fiscal_year: e.target.value }))} placeholder={String(new Date().getFullYear())} />
          </Grid>
        </Grid>
        {fiscOk && <Alert severity="success" sx={{ mt: 2 }}>Fiscal year settings saved.</Alert>}
        <SaveButton loading={savingFisc} onClick={() => saveFisc(fiscForm)} />
      </SectionCard>
    </Box>
  );
}

// ── Tab: Ignite AI ─────────────────────────────────────────────────────────────

function IgniteTab({ settings }: { settings: Record<string, string> | undefined }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const { mutate, isPending, isSuccess } = useUpdateSettings('ignite');
  const val = (k: string) => form[k] ?? settings?.[k] ?? '';
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure Ignite AI inference settings. Changes take effect on the next conversation session.
      </Alert>

      <SectionCard title="Model Preference">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Primary Inference Engine</InputLabel>
              <Select value={val('model_preference')} label="Primary Inference Engine" onChange={e => set('model_preference', e.target.value as string)}>
                <MenuItem value="watsonx">IBM watsonx (Recommended)</MenuItem>
                <MenuItem value="ollama">Ollama (Local)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>watsonx Model</InputLabel>
              <Select value={val('watsonx_model_id')} label="watsonx Model" onChange={e => set('watsonx_model_id', e.target.value as string)}>
                <MenuItem value="ibm/granite-13b-chat-v2">IBM Granite 13B Chat v2 (Balanced)</MenuItem>
                <MenuItem value="ibm/granite-34b-code-instruct">IBM Granite 34B Code (Advanced)</MenuItem>
                <MenuItem value="meta-llama/llama-3-70b-instruct">Llama 3 70B Instruct</MenuItem>
                <MenuItem value="mistralai/mistral-large">Mistral Large</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Ollama Model" value={val('ollama_model')} onChange={e => set('ollama_model', e.target.value)} placeholder="llama3" />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Generation Parameters">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" type="number" label="Max Tokens"
              value={val('max_tokens')}
              onChange={e => set('max_tokens', e.target.value)}
              inputProps={{ min: 128, max: 4096, step: 64 }}
              helperText="128–4096"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" type="number" label="Temperature"
              value={val('temperature')}
              onChange={e => set('temperature', e.target.value)}
              inputProps={{ min: 0, max: 1, step: 0.05 }}
              helperText="0.0 (precise) → 1.0 (creative)"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" type="number" label="Memory Turns"
              value={val('memory_turns')}
              onChange={e => set('memory_turns', e.target.value)}
              inputProps={{ min: 1, max: 50, step: 1 }}
              helperText="Conversation history depth"
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Response Behaviour">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={val('show_citations') === 'true'} onChange={e => set('show_citations', String(e.target.checked))} />}
              label="Show data citations in responses"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={<Switch checked={val('show_confidence') === 'true'} onChange={e => set('show_confidence', String(e.target.checked))} />}
              label="Show confidence indicators"
            />
          </Grid>
        </Grid>
      </SectionCard>

      {isSuccess && <Alert severity="success" sx={{ mb: 2 }}>Ignite configuration saved.</Alert>}
      <SaveButton loading={isPending} onClick={() => mutate(form)} />
    </Box>
  );
}

// ── Tab: Pending Approvals ─────────────────────────────────────────────────────

function PendingApprovalsTab() {
  const { data: pending, isLoading, refetch } = usePendingUsers();
  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; userId: string; email: string }>({
    open: false, userId: '', email: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApprove = (userId: string, email: string) => {
    approveMutation.mutate(userId, {
      onSuccess: () => {
        setActionMsg({ type: 'success', text: `✓ Access approved for ${email}` });
        refetch();
        setTimeout(() => setActionMsg(null), 4000);
      },
      onError: () => setActionMsg({ type: 'error', text: 'Failed to approve. Please try again.' }),
    });
  };

  const handleRejectConfirm = () => {
    rejectMutation.mutate(
      { userId: rejectDialog.userId, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setActionMsg({ type: 'success', text: `✗ Access denied for ${rejectDialog.email}` });
          setRejectDialog({ open: false, userId: '', email: '' });
          setRejectReason('');
          refetch();
          setTimeout(() => setActionMsg(null), 4000);
        },
        onError: () => setActionMsg({ type: 'error', text: 'Failed to reject. Please try again.' }),
      }
    );
  };

  const count = pending?.length ?? 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
              Pending Access Requests
            </Typography>
            {count > 0 && (
              <Chip
                label={`${count} pending`}
                color="warning"
                size="small"
                icon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                sx={{ fontWeight: 700, fontSize: 11 }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Users who submitted a Request Access form. Approve to activate their account,
            or reject with an optional reason.
          </Typography>
        </Box>
      </Box>

      {/* Status message */}
      {actionMsg && (
        <Alert severity={actionMsg.type} sx={{ mb: 2, borderRadius: '6px' }} onClose={() => setActionMsg(null)}>
          {actionMsg.text}
        </Alert>
      )}

      {isLoading ? (
        <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={64} sx={{ mb: 0.5 }} />)}</Box>
      ) : count === 0 ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafafa' }}>
          <HowToRegIcon sx={{ fontSize: 40, color: '#8d8d8d', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: '#525252', mb: 0.5 }}>No Pending Requests</Typography>
          <Typography variant="caption" color="text.secondary">
            When users submit a Request Access form on the login page, they'll appear here.
          </Typography>
        </Paper>
      ) : (
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.5 } }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#525252', bgcolor: '#f4f4f4', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
              <TableCell>NAME</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>REQUESTED</TableCell>
              <TableCell>ROLE</TableCell>
              <TableCell align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(pending ?? []).map((user: import('../api/settingsApi').ApiUser) => (
              <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{user.full_name}</TableCell>
                <TableCell sx={{ fontSize: 13, color: '#525252' }}>{user.email}</TableCell>
                <TableCell sx={{ fontSize: 12, color: '#525252' }}>
                  {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell>
                  <Chip label={user.role} size="small" color="info" sx={{ fontSize: 11 }} />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="Approve — activate this account">
                      <Button
                        size="small" variant="contained" color="success"
                        startIcon={approveMutation.isPending ? <CircularProgress size={12} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => handleApprove(user.id, user.email)}
                        sx={{ fontSize: 12, fontWeight: 600, py: 0.5, minWidth: 90 }}
                      >
                        Approve
                      </Button>
                    </Tooltip>
                    <Tooltip title="Reject access request">
                      <Button
                        size="small" variant="outlined" color="error"
                        startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => { setRejectDialog({ open: true, userId: user.id, email: user.email }); setRejectReason(''); }}
                        sx={{ fontSize: 12, fontWeight: 600, py: 0.5, minWidth: 80 }}
                      >
                        Reject
                      </Button>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, userId: '', email: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloseIcon color="error" fontSize="small" />
          Reject Access Request
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, fontSize: 14, color: '#525252' }}>
            You are about to reject the access request from{' '}
            <Box component="span" sx={{ fontWeight: 700, color: '#161616' }}>{rejectDialog.email}</Box>.
            Their account will remain inactive.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Rejection reason (optional)"
            placeholder="e.g. Outside current project scope, please re-apply in Q3"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRejectDialog({ open: false, userId: '', email: '' })} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained" color="error"
            onClick={handleRejectConfirm}
            disabled={rejectMutation.isPending}
            startIcon={rejectMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CloseIcon />}
            sx={{ fontWeight: 600 }}
          >
            Confirm Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab: RBAC / Users ──────────────────────────────────────────────────────────

function RBACTab() {
  const { data: users, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const createUserMutation = useCreateUser();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'analyst', password: '' });
  const [createError, setCreateError] = useState('');

  const handleCreate = () => {
    setCreateError('');
    createUserMutation.mutate(newUser, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewUser({ email: '', full_name: '', role: 'analyst', password: '' });
      },
      onError: () => setCreateError('Failed to create user. Check if email is already taken.'),
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14 }}>User Management</Typography>
          <Typography variant="caption" color="text.secondary">
            Manage team members and their access levels. Role changes take effect on next login.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setDialogOpen(true)} size="small">
          Add User
        </Button>
      </Box>

      {/* Role legend */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f7f8fa' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Role Permissions</Typography>
        <Grid container spacing={1}>
          {[
            { role: 'admin', desc: 'Full access — manage users, settings, all modules' },
            { role: 'procurement_manager', desc: 'Read + write all procurement modules, no user management' },
            { role: 'analyst', desc: 'Read all modules, generate reports, cannot modify settings' },
            { role: 'viewer', desc: 'Read-only access to dashboards and reports' },
          ].map(r => (
            <Grid item xs={12} sm={6} key={r.role}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Chip label={r.role} color={ROLE_COLORS[r.role]} size="small" sx={{ mt: 0.25, minWidth: 90 }} />
                <Typography variant="caption" color="text.secondary">{r.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {isLoading ? (
        <Box sx={{ p: 2 }}>{[...Array(4)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}</Box>
      ) : (
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.25 } }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#525252', bgcolor: '#f4f4f4' } }}>
              <TableCell>NAME</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>ROLE</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell>JOINED</TableCell>
              <TableCell align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(users ?? []).map(user => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{user.full_name}</TableCell>
                <TableCell sx={{ color: '#525252', fontSize: 13 }}>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 12, height: 28 }}
                    onChange={e => updateRole.mutate({ userId: user.id, role: e.target.value as string })}
                  >
                    {['admin','procurement_manager','analyst','viewer'].map(r => (
                      <MenuItem key={r} value={r} sx={{ fontSize: 13 }}>{r}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Suspended'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                    sx={{ fontSize: 11 }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#525252', fontSize: 12 }}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={user.is_active ? 'Suspend user' : 'Activate user'}>
                    <IconButton
                      size="small"
                      onClick={() => toggleActive.mutate({ userId: user.id, is_active: !user.is_active })}
                      color={user.is_active ? 'warning' : 'success'}
                    >
                      {user.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Full Name" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={newUser.role} label="Role" onChange={e => setNewUser(p => ({ ...p, role: e.target.value as string }))}>
                  {['admin','procurement_manager','analyst','viewer'].map(r => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Temporary Password" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
            </Grid>
          </Grid>
          {createError && <Alert severity="error" sx={{ mt: 2 }}>{createError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createUserMutation.isPending || !newUser.email || !newUser.full_name || !newUser.password}
            startIcon={createUserMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Tab: Audit Log ─────────────────────────────────────────────────────────────

function AuditTab() {
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState('');
  const { data: summary } = useAuditSummary();
  const { data: logs, isLoading } = useAuditLogs({ page, page_size: 50, method: methodFilter || undefined });

  const METHOD_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
    GET: 'success', POST: 'info', PUT: 'warning', PATCH: 'warning', DELETE: 'error',
  };

  return (
    <Box>
      {/* Summary KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Events', value: summary?.total_events?.toLocaleString() ?? '—' },
          { label: 'Error Events', value: summary?.error_events?.toLocaleString() ?? '—' },
          { label: 'Unique Users', value: summary?.unique_users?.toLocaleString() ?? '—' },
          { label: 'Error Rate', value: summary ? `${summary.error_rate_percent}%` : '—' },
        ].map(k => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#0f62fe' }}>{k.value}</Typography>
              <Typography variant="caption" color="text.secondary">{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filter row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>HTTP Method</InputLabel>
          <Select value={methodFilter} label="HTTP Method" onChange={e => { setMethodFilter(e.target.value as string); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {['POST','PUT','PATCH','DELETE'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          {logs?.meta.total ?? 0} events found
        </Typography>
      </Box>

      {isLoading ? (
        <LinearProgress />
      ) : (
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#525252', bgcolor: '#f4f4f4', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Path</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(logs?.data ?? []).map(log => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ fontSize: 11, color: '#525252', whiteSpace: 'nowrap' }}>
                  {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{log.user_email ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={log.method}
                    color={METHOD_COLORS[log.method] ?? 'default'}
                    size="small"
                    sx={{ fontSize: 10, height: 20, minWidth: 52 }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', color: '#525252', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.path}
                </TableCell>
                <TableCell align="center">
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: log.status_code >= 400 ? '#da1e28' : '#198038' }}>
                    {log.status_code}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, color: '#525252' }}>
                  {log.duration_ms}ms
                </TableCell>
              </TableRow>
            ))}
            {(logs?.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#525252' }}>
                  No audit events found. Events are recorded when the backend receives POST/PUT/PATCH/DELETE requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {(logs?.meta.total_pages ?? 1) > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</Button>
          <Typography variant="caption" sx={{ alignSelf: 'center' }}>
            Page {logs?.meta.page} of {logs?.meta.total_pages}
          </Typography>
          <Button size="small" disabled={page >= (logs?.meta.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>Next →</Button>
        </Box>
      )}
    </Box>
  );
}

// ── Tab: System Health ─────────────────────────────────────────────────────────

function SystemTab() {
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: version } = useSystemVersion();

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Overall status */}
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>SYSTEM STATUS</Typography>
            {healthLoading ? (
              <CircularProgress size={32} />
            ) : (
              <Chip
                label={health?.status?.toUpperCase() ?? 'UNKNOWN'}
                color={health?.status === 'healthy' ? 'success' : 'warning'}
                sx={{ fontSize: 14, height: 32, fontWeight: 700 }}
              />
            )}
            {health && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Uptime: {Math.floor((health.uptime_seconds ?? 0) / 3600)}h {Math.floor(((health.uptime_seconds ?? 0) % 3600) / 60)}m
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>DATABASE</Typography>
            {healthLoading ? <CircularProgress size={24} /> : (
              <>
                <Chip
                  label={health?.checks?.database?.status?.toUpperCase() ?? '—'}
                  color={health?.checks?.database?.status === 'ok' ? 'success' : 'error'}
                  size="small"
                />
                {health?.checks?.database?.latency_ms != null && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Latency: {health.checks.database.latency_ms}ms
                  </Typography>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>IBM watsonx</Typography>
            <Chip
              label={health?.checks?.watsonx?.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              color={health?.checks?.watsonx?.configured ? 'success' : 'warning'}
              size="small"
            />
            {health?.checks?.watsonx?.model && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                {health.checks.watsonx.model}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Version info */}
      <SectionCard title="Application Version">
        <Grid container spacing={1}>
          {[
            ['App Name', version?.app ?? '—'],
            ['Version', version?.version ?? '—'],
            ['API Version', version?.api_version ?? '—'],
            ['Phase', version?.phase ?? '—'],
            ['Environment', health?.environment ?? '—'],
            ['Python', health?.platform?.python ?? '—'],
          ].map(([label, value]) => (
            <Grid item xs={6} sm={4} key={label}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* Active modules */}
      <SectionCard title="Active Modules">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {(version?.modules ?? []).map((m: string) => (
            <Chip key={m} label={m} size="small" color="success" variant="outlined" sx={{ fontSize: 11 }} />
          ))}
        </Box>
      </SectionCard>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const { data: settings, isLoading } = useAllSettings();
  const { data: pendingUsers } = usePendingUsers();
  const pendingCount = pendingUsers?.length ?? 0;

  const TABS = [
    { label: 'General',           icon: <SettingsIcon sx={{ fontSize: 16 }} /> },
    { label: 'Currency & Fiscal', icon: <AttachMoneyIcon sx={{ fontSize: 16 }} /> },
    { label: 'Ignite AI',         icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} /> },
    { label: 'Access Requests',   icon: (
        <Badge badgeContent={pendingCount || null} color="warning" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
          <HowToRegIcon sx={{ fontSize: 16 }} />
        </Badge>
      )
    },
    { label: 'Users & RBAC',      icon: <SecurityIcon sx={{ fontSize: 16 }} /> },
    { label: 'Email',             icon: <EmailOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: 'Data Sources',      icon: <StorageIcon sx={{ fontSize: 16 }} /> },
    { label: 'Audit Log',         icon: <HistoryIcon sx={{ fontSize: 16 }} /> },
    { label: 'System Health',     icon: <MonitorHeartIcon sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box>
      <ExecutiveSummary
        title="Platform Settings"
        summary="Configure your ProcureIQ platform: company identity, currency preferences, fiscal year, Ignite AI behaviour, user access control, and audit activity. Changes to AI parameters take effect on the next Ignite session."
        highlights={[
          'Tenant-scoped configuration',
          'RBAC user management',
          'Live audit trail',
          'System health monitoring',
        ]}
        isLoading={false}
      />

      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #e0e0e0',
            '& .MuiTab-root': { fontSize: 13, fontWeight: 500, minHeight: 48, textTransform: 'none', gap: 0.5 },
            '& .Mui-selected': { fontWeight: 700, color: '#0f62fe' },
            '& .MuiTabs-indicator': { backgroundColor: '#0f62fe', height: 3 },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {isLoading ? (
            <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}</Box>
          ) : (
            <>
              {tab === 0 && <GeneralTab settings={settings?.general} />}
              {tab === 1 && <CurrencyTab settings={settings} />}
              {tab === 2 && <IgniteTab settings={settings?.ignite} />}
              {tab === 3 && <PendingApprovalsTab />}
              {tab === 4 && <RBACTab />}
              {tab === 5 && <EmailSettingsTab />}
              {tab === 6 && <DataSourcesTab />}
              {tab === 7 && <AuditTab />}
              {tab === 8 && <SystemTab />}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
