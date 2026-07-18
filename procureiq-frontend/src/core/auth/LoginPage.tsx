import { useState } from 'react';
import { Navigate, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton,
  Divider, Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { useAuth } from './AuthContext';
import { registerAccessRequest } from '@/modules/settings/api/settingsApi';

// ── Left hero panel ────────────────────────────────────────────────────────────
function HeroPanel() {
  return (
    <Box sx={{
      flex: '0 0 52%',
      display: { xs: 'none', md: 'flex' },
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1635 45%, #0f1f4a 100%)',
      p: { md: 5, lg: 7 },
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background geometry */}
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="lg1" cx="30%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#0f62fe" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="lg2" cx="75%" cy="75%" r="45%">
              <stop offset="0%" stopColor="#6929c4" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#6929c4" stopOpacity="0"/>
            </radialGradient>
            <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="rgba(255,255,255,0.06)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
          <ellipse cx="216" cy="315" rx="400" ry="340" fill="url(#lg1)"/>
          <ellipse cx="540" cy="675" rx="340" ry="270" fill="url(#lg2)"/>
          {/* Subtle geometric accent lines */}
          <line x1="0" y1="180" x2="360" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <line x1="0" y1="360" x2="540" y2="0" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          <line x1="720" y1="200" x2="300" y2="900" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          {/* Data network nodes */}
          <circle cx="540" cy="200" r="4" fill="rgba(69,137,255,0.7)"/>
          <circle cx="620" cy="280" r="3" fill="rgba(69,137,255,0.5)"/>
          <circle cx="500" cy="310" r="5" fill="rgba(69,137,255,0.4)"/>
          <circle cx="660" cy="160" r="3" fill="rgba(138,63,252,0.6)"/>
          <circle cx="580" cy="350" r="3" fill="rgba(138,63,252,0.4)"/>
          <line x1="540" y1="200" x2="620" y2="280" stroke="rgba(69,137,255,0.3)" strokeWidth="1.5"/>
          <line x1="620" y1="280" x2="500" y2="310" stroke="rgba(69,137,255,0.25)" strokeWidth="1"/>
          <line x1="540" y1="200" x2="660" y2="160" stroke="rgba(138,63,252,0.25)" strokeWidth="1"/>
          <line x1="620" y1="280" x2="580" y2="350" stroke="rgba(138,63,252,0.2)" strokeWidth="1"/>
          <circle cx="540" cy="200" r="12" fill="none" stroke="rgba(69,137,255,0.2)" strokeWidth="1"/>
        </svg>
      </Box>

      {/* Top: Logo */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f62fe, #4589ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(15,98,254,0.45)',
          }}>
            <InsightsOutlinedIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              ProcureIQ
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Powered by IBM watsonx
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Middle: Hero content */}
      <Box sx={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
        {/* Badge */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          px: 1.75, py: 0.6, mb: 3, width: 'fit-content',
          border: '1px solid rgba(15,98,254,0.5)',
          borderRadius: '100px', bgcolor: 'rgba(15,98,254,0.12)',
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 13, color: '#4589ff' }} />
          <Typography sx={{ fontSize: 11.5, color: '#4589ff', fontWeight: 600, letterSpacing: '0.05em' }}>
            Enterprise Procurement Intelligence
          </Typography>
        </Box>

        <Typography sx={{
          fontSize: { md: 36, lg: 44 }, fontWeight: 800, color: '#fff',
          lineHeight: 1.1, letterSpacing: '-1.5px', mb: 1,
        }}>
          The Future of
        </Typography>
        <Typography sx={{
          fontSize: { md: 36, lg: 44 }, fontWeight: 800,
          background: 'linear-gradient(90deg, #4589ff, #6929c4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1, letterSpacing: '-1.5px', mb: 3,
        }}>
          Procurement
        </Typography>
        <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, mb: 5, maxWidth: 360 }}>
          Transform procurement data into strategic decisions.
          AI-powered insights across spend, risk, contracts, and suppliers.
        </Typography>

        {/* Feature list */}
        {[
          { icon: <SpeedOutlinedIcon sx={{ fontSize: 16 }} />, text: 'Real-time spend & savings intelligence' },
          { icon: <ShieldOutlinedIcon sx={{ fontSize: 16 }} />, text: 'Supplier risk assessment & monitoring' },
          { icon: <AccountTreeOutlinedIcon sx={{ fontSize: 16 }} />, text: 'Contract lifecycle management' },
          { icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, text: 'Ignite AI — your procurement advisor' },
        ].map((f, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.75 }}>
            <Box sx={{
              width: 30, height: 30, borderRadius: '8px',
              bgcolor: 'rgba(15,98,254,0.18)', border: '1px solid rgba(15,98,254,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4589ff', flexShrink: 0,
            }}>
              {f.icon}
            </Box>
            <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              {f.text}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Bottom: Trust signals */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2.5 }} />
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[
            { value: '15+', label: 'AI Modules' },
            { value: '98%', label: 'Accuracy' },
            { value: '12x', label: 'Faster Insights' },
          ].map(m => (
            <Box key={m.label}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>{m.value}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}>{m.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ── Main Login Page ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/app/dashboard';

  const [tab, setTab]           = useState<'signin' | 'register'>('signin');
  const [email, setEmail]       = useState('admin@procureiq.ai');
  const [password, setPassword] = useState('Admin@123!');
  const [fullName, setFullName] = useState('');
  const [company, setCompany]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const validateIBMEmail = (e: string) =>
    e.endsWith('@ibm.com') || e.endsWith('@procureiq.ai') || e.endsWith('@watsonx.ibm.com');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail ?? 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateIBMEmail(email)) {
      setError('Registration is restricted to IBM corporate email addresses (@ibm.com, @watsonx.ibm.com, @procureiq.ai).');
      return;
    }
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!company.trim()) { setError('Please enter your company / business unit.'); return; }
    setLoading(true);
    try {
      await registerAccessRequest({ email, full_name: fullName, company });
      setRegSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail ?? 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex',
      fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
      bgcolor: '#f4f4f4',
    }}>
      {/* ── Left hero ──────────────────────────────────────────────────────── */}
      <HeroPanel />

      {/* ── Right auth panel ───────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: '#ffffff', px: { xs: 3, sm: 6, lg: 8 }, py: 5,
        position: 'relative', minHeight: '100vh',
        overflowY: 'auto',
      }}>
        {/* Back to cover */}
        <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            size="small"
            onClick={() => navigate('/')}
            sx={{ color: '#525252', fontWeight: 500, fontSize: 12,
                  '&:hover': { color: '#161616', bgcolor: '#f4f4f4' } }}
          >
            Back
          </Button>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo — hidden on desktop */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 4 }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '8px',
              background: 'linear-gradient(135deg, #0f62fe, #4589ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <InsightsOutlinedIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#161616' }}>ProcureIQ</Typography>
          </Box>

          {/* Tab toggle */}
          <Box sx={{
            display: 'flex', mb: 5,
            border: '1px solid #e0e0e0', borderRadius: '8px', p: '3px',
            bgcolor: '#f4f4f4',
          }}>
            {(['signin', 'register'] as const).map(t => (
              <Box
                key={t}
                onClick={() => { setTab(t); setError(null); setRegSuccess(false); }}
                sx={{
                  flex: 1, py: 1, textAlign: 'center', cursor: 'pointer',
                  borderRadius: '6px', fontSize: 13.5, fontWeight: 600,
                  transition: 'all 0.18s',
                  ...(tab === t
                    ? { bgcolor: '#fff', color: '#161616', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                    : { color: '#525252', '&:hover': { color: '#161616' } }),
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Request Access'}
              </Box>
            ))}
          </Box>

          {/* ── SIGN IN ─────────────────────────────────────────────────────── */}
          {tab === 'signin' && (
            <>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#161616', mb: 0.5 }}>
                Welcome back
              </Typography>
              <Typography sx={{ fontSize: 14, color: '#525252', mb: 3.5 }}>
                Sign in to your ProcureIQ workspace
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '6px', fontSize: 13 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSignIn} noValidate>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Email Address
                </Typography>
                <TextField
                  type="email" fullWidth size="small"
                  placeholder="you@company.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px', fontSize: 14,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe', borderWidth: 2 },
                    },
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Password
                  </Typography>
                  <Typography
                    component={RouterLink}
                    to="/forgot-password"
                    sx={{ fontSize: 12, color: '#0f62fe', fontWeight: 500, textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' } }}
                  >
                    Forgot password?
                  </Typography>
                </Box>
                <TextField
                  type={showPass ? 'text' : 'password'} fullWidth size="small"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                          {showPass
                            ? <VisibilityOffIcon sx={{ fontSize: 18, color: '#525252' }} />
                            : <VisibilityIcon sx={{ fontSize: 18, color: '#525252' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    mb: 3.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px', fontSize: 14,
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe', borderWidth: 2 },
                    },
                  }}
                />

                <Button
                  type="submit" variant="contained" fullWidth
                  disabled={loading}
                  startIcon={loading ? undefined : <LockOutlinedIcon sx={{ fontSize: '18px !important' }} />}
                  sx={{
                    py: 1.4, fontSize: 14, fontWeight: 700, borderRadius: '6px',
                    background: loading ? '#c6c6c6' : 'linear-gradient(135deg, #0f62fe, #0043ce)',
                    boxShadow: loading ? 'none' : '0 2px 12px rgba(15,98,254,0.35)',
                    letterSpacing: '0.02em',
                    '&:hover:not(:disabled)': {
                      background: 'linear-gradient(135deg, #0353e9, #0031a9)',
                      boxShadow: '0 4px 20px rgba(15,98,254,0.5)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In to ProcureIQ'}
                </Button>
              </form>

              {/* SSO section */}
              <Box sx={{ mt: 3, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ flex: 1, height: 1, bgcolor: '#e0e0e0' }} />
                  <Typography sx={{ fontSize: 11, color: '#8d8d8d', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    or continue with
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: '#e0e0e0' }} />
                </Box>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
                    p: 1.25, border: '1px solid #e0e0e0', borderRadius: '6px',
                    cursor: 'not-allowed', opacity: 0.55, bgcolor: '#fafafa',
                  }}
                >
                  <Box sx={{
                    width: 20, height: 20, borderRadius: '4px',
                    background: 'linear-gradient(135deg, #0f62fe, #6929c4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Typography sx={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>IBM</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#525252' }}>
                    IBM w3id Single Sign-On
                  </Typography>
                  <Box sx={{ ml: 'auto', px: 0.75, py: 0.25, bgcolor: '#f0f0f0', borderRadius: '4px' }}>
                    <Typography sx={{ fontSize: 10, color: '#8d8d8d', fontWeight: 600 }}>Coming Soon</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 11, color: '#8d8d8d', mt: 0.75, textAlign: 'center', lineHeight: 1.5 }}>
                  IBM w3id SSO integration planned for enterprise deployments.
                  Contact your administrator to enable SAML / OIDC.
                </Typography>
              </Box>

              {/* Demo credentials */}
              <Box sx={{
                mt: 3.5, p: 2.5,
                border: '1px solid #e0e0e0', borderRadius: '8px',
                bgcolor: '#fafafa',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#198038' }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#161616', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Demo Credentials
                  </Typography>
                </Box>
                {[
                  { email: 'admin@procureiq.ai', role: 'Admin', pass: 'Admin@123!' },
                  { email: 'analyst@procureiq.ai', role: 'Analyst', pass: 'Admin@123!' },
                ].map(c => (
                  <Box
                    key={c.email}
                    onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                    sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      p: 1.25, mb: 0.75, borderRadius: '6px', cursor: 'pointer',
                      border: '1px solid transparent',
                      '&:hover': { bgcolor: '#f0f4ff', border: '1px solid #d0deff' },
                      '&:last-of-type': { mb: 0 },
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616', lineHeight: 1.3 }}>{c.email}</Typography>
                      <Typography sx={{ fontSize: 11, color: '#525252' }}>Password: {c.pass}</Typography>
                    </Box>
                    <Chip label={c.role} size="small"
                      sx={{ fontSize: 10, height: 20, fontWeight: 700,
                        bgcolor: c.role === 'Admin' ? '#eff4ff' : '#f4f0ff',
                        color: c.role === 'Admin' ? '#0043ce' : '#491d8b' }} />
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/* ── REQUEST ACCESS ───────────────────────────────────────────────── */}
          {tab === 'register' && (
            <>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#161616', mb: 0.5 }}>
                Request Access
              </Typography>
              <Typography sx={{ fontSize: 14, color: '#525252', mb: 3.5 }}>
                Available for IBM corporate email addresses only
              </Typography>

              {regSuccess ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '50%',
                    bgcolor: '#defbe6', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', mx: 'auto', mb: 2,
                  }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 28, color: '#198038' }} />
                  </Box>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#161616', mb: 1 }}>
                    Request Submitted
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: '#525252', mb: 3, lineHeight: 1.6 }}>
                    Your access request has been sent to your IBM workspace administrator.
                    You'll receive an email confirmation shortly.
                  </Typography>
                  <Button
                    variant="outlined" size="small"
                    onClick={() => { setTab('signin'); setRegSuccess(false); }}
                    sx={{ borderRadius: '6px', fontWeight: 600, borderColor: '#e0e0e0', color: '#161616' }}
                  >
                    Back to Sign In
                  </Button>
                </Box>
              ) : (
                <>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: '6px', fontSize: 13 }}>
                      {error}
                    </Alert>
                  )}
                  <Box sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, mb: 3,
                    bgcolor: '#eff4ff', border: '1px solid #d0deff', borderRadius: '6px',
                  }}>
                    <ShieldOutlinedIcon sx={{ fontSize: 15, color: '#0043ce', mt: 0.25, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: '#0043ce', lineHeight: 1.5 }}>
                      Registration is restricted to <strong>@ibm.com</strong> and <strong>@watsonx.ibm.com</strong> email addresses.
                    </Typography>
                  </Box>

                  <form onSubmit={handleRegister} noValidate>
                    {[
                      { label: 'Full Name', val: fullName, set: setFullName, type: 'text', ph: 'Jane Smith', required: true },
                      { label: 'IBM Email Address', val: email, set: setEmail, type: 'email', ph: 'jane.smith@ibm.com', required: true },
                      { label: 'Company / Business Unit', val: company, set: setCompany, type: 'text', ph: 'IBM Consulting — APAC', required: true },
                    ].map(f => (
                      <Box key={f.label} sx={{ mb: 2.5 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {f.label}
                        </Typography>
                        <TextField
                          type={f.type} fullWidth size="small"
                          placeholder={f.ph}
                          value={f.val}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => f.set(e.target.value)}
                          required={f.required}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '6px', fontSize: 14,
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0f62fe', borderWidth: 2 },
                            },
                          }}
                        />
                      </Box>
                    ))}

                    <Button
                      type="submit" variant="contained" fullWidth
                      disabled={loading}
                      sx={{
                        py: 1.4, fontSize: 14, fontWeight: 700, borderRadius: '6px', mt: 1,
                        background: loading ? '#c6c6c6' : 'linear-gradient(135deg, #0f62fe, #0043ce)',
                        boxShadow: loading ? 'none' : '0 2px 12px rgba(15,98,254,0.35)',
                        '&:hover:not(:disabled)': { background: 'linear-gradient(135deg, #0353e9, #0031a9)' },
                      }}
                    >
                      {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Submit Access Request'}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}

          {/* Footer */}
          <Divider sx={{ my: 3.5, borderColor: '#e0e0e0' }} />
          <Typography sx={{ fontSize: 11.5, color: '#8d8d8d', textAlign: 'center', lineHeight: 1.6 }}>
            By continuing, you agree to ProcureIQ's Terms of Service and Privacy Policy.
            Protected by enterprise-grade security.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
