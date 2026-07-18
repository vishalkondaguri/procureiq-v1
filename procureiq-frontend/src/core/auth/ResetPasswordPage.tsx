import { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, LinearProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/core/api/client';

// ── Password strength meter ───────────────────────────────────────────────────
function strengthScore(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd))    score++;
  if (/[^A-Za-z\d]/.test(pwd)) score++;

  if (score <= 2) return { score: score * 16, label: 'Weak',      color: '#da1e28' };
  if (score <= 3) return { score: score * 16, label: 'Fair',      color: '#f1c21b' };
  if (score <= 4) return { score: score * 16, label: 'Good',      color: '#198038' };
  return              { score: 100,           label: 'Strong',    color: '#0f62fe' };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const strength = strengthScore(password);
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid    = password.length >= 8
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !token) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
        ?? 'This reset link is invalid or has expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                 justifyContent: 'center', bgcolor: '#f4f4f4' }}>
        <Box sx={{ maxWidth: 440, mx: 2, textAlign: 'center', p: 4,
                   bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1.5, color: '#da1e28' }}>
            Invalid Reset Link
          </Typography>
          <Typography sx={{ fontSize: 14, color: '#525252', mb: 3 }}>
            This reset link is missing or malformed. Please request a new password reset.
          </Typography>
          <Button component={RouterLink} to="/forgot-password" variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Request New Link
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', bgcolor: '#f4f4f4',
    }}>
      <Box sx={{
        width: '100%', maxWidth: 440,
        bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1,
        p: { xs: 3, sm: 4.5 }, mx: 2,
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
          <Box sx={{
            width: 36, height: 36, bgcolor: '#0f62fe', borderRadius: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>P</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#161616', lineHeight: 1.2 }}>
              ProcureIQ
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>Set New Password</Typography>
          </Box>
        </Box>

        {success ? (
          /* ── Success ── */
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#198038', mb: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1.5 }}>
              Password Updated!
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#525252', mb: 3, lineHeight: 1.6 }}>
              Your password has been changed successfully. You can now sign in with your
              new password.
            </Typography>
            <Button
              fullWidth variant="contained"
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Sign In Now
            </Button>
          </Box>
        ) : (
          /* ── Form ── */
          <Box component="form" onSubmit={handleSubmit}>
            <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 0.75 }}>
              Set a new password
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#525252', mb: 3, lineHeight: 1.6 }}>
              Choose a strong password of at least 8 characters that includes
              uppercase letters and numbers.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
                {error}{' '}
                <RouterLink to="/forgot-password"
                  style={{ color: '#0f62fe', fontWeight: 600 }}>
                  Request a new link
                </RouterLink>
              </Alert>
            )}

            {/* New password */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#525252',
                              textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
              NEW PASSWORD
            </Typography>
            <TextField
              fullWidth type={showPwd ? 'text' : 'password'}
              autoFocus autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              disabled={loading}
              InputProps={{
                startAdornment: <LockOutlinedIcon sx={{ mr: 1, color: '#8d8d8d', fontSize: 18 }} />,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPwd(v => !v)} edge="end">
                      {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            {/* Strength bar */}
            {password.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={strength.score}
                  sx={{
                    height: 4, borderRadius: 2, mb: 0.5,
                    '& .MuiLinearProgress-bar': { bgcolor: strength.color, borderRadius: 2 },
                    bgcolor: '#f0f0f0',
                  }}
                />
                <Typography sx={{ fontSize: 11, color: strength.color, fontWeight: 700 }}>
                  {strength.label}
                </Typography>
              </Box>
            )}

            {/* Confirm password */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#525252',
                              textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
              CONFIRM PASSWORD
            </Typography>
            <TextField
              fullWidth type={showConf ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              disabled={loading}
              error={mismatch}
              helperText={mismatch ? 'Passwords do not match' : ''}
              InputProps={{
                startAdornment: <LockOutlinedIcon sx={{ mr: 1, color: '#8d8d8d', fontSize: 18 }} />,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConf(v => !v)} edge="end">
                      {showConf ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Button
              type="submit" fullWidth variant="contained"
              disabled={loading || !valid}
              sx={{ py: 1.5, fontWeight: 700, fontSize: 14,
                   textTransform: 'none', borderRadius: 1, mb: 2 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Set New Password'}
            </Button>

            <Button
              component={RouterLink} to="/login" fullWidth variant="text"
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{ textTransform: 'none', color: '#525252', fontWeight: 500 }}
            >
              Back to Sign In
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
