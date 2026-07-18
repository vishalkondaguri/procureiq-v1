import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { apiClient } from '@/core/api/client';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      // Even on error, show the success message (security best practice)
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f4f4f4',
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
            <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>Forgot Password</Typography>
          </Box>
        </Box>

        {sent ? (
          /* ── Success state ── */
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#198038', mb: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1.5 }}>Check your inbox</Typography>
            <Typography sx={{ fontSize: 14, color: '#525252', mb: 3, lineHeight: 1.6 }}>
              If an account exists for <strong>{email}</strong>, a password-reset link
              has been sent. Please check your email (including spam/junk).
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#8d8d8d', mb: 3 }}>
              The link expires in 60 minutes.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Back to Sign In
            </Button>
          </Box>
        ) : (
          /* ── Form state ── */
          <Box component="form" onSubmit={handleSubmit}>
            <Typography sx={{ fontWeight: 700, fontSize: 20, mb: 0.75 }}>
              Reset your password
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#525252', mb: 3, lineHeight: 1.6 }}>
              Enter your ProcureIQ email address and we'll send you a link to reset
              your password.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{error}</Alert>
            )}

            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#525252',
                              textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
              EMAIL ADDRESS
            </Typography>
            <TextField
              fullWidth
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@procureiq.ai"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <EmailOutlinedIcon sx={{ mr: 1, color: '#8d8d8d', fontSize: 18 }} />
                ),
              }}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !email.trim()}
              sx={{
                py: 1.5, fontWeight: 700, fontSize: 14,
                textTransform: 'none', borderRadius: 1, mb: 2,
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
            </Button>

            <Button
              component={RouterLink}
              to="/login"
              fullWidth
              variant="text"
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
