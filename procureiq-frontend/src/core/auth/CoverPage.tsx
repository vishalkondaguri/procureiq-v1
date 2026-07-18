import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1800 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span ref={ref}>{prefix}{value.toLocaleString()}{suffix}</span>;
}

// ── Geometric SVG background ─────────────────────────────────────────────────
function HeroBg() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg">
        {/* Large faint grid */}
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="glow1" cx="30%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#0f62fe" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="glow2" cx="80%" cy="70%" r="45%">
            <stop offset="0%" stopColor="#6929c4" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#6929c4" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <ellipse cx="360" cy="320" rx="480" ry="380" fill="url(#glow1)"/>
        <ellipse cx="960" cy="560" rx="400" ry="320" fill="url(#glow2)"/>
        {/* Decorative lines */}
        <line x1="0" y1="200" x2="400" y2="0" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <line x1="0" y1="400" x2="600" y2="0" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <line x1="1200" y1="100" x2="700" y2="800" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        {/* Floating circles */}
        <circle cx="120" cy="120" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <circle cx="120" cy="120" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        <circle cx="1100" cy="180" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        <circle cx="200" cy="650" r="100" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        {/* Data node visualization */}
        <circle cx="900" cy="200" r="5" fill="rgba(79,140,255,0.6)"/>
        <circle cx="980" cy="280" r="4" fill="rgba(79,140,255,0.5)"/>
        <circle cx="860" cy="310" r="6" fill="rgba(79,140,255,0.4)"/>
        <circle cx="1020" cy="180" r="3" fill="rgba(138,63,252,0.6)"/>
        <circle cx="940" cy="350" r="4" fill="rgba(138,63,252,0.4)"/>
        <line x1="900" y1="200" x2="980" y2="280" stroke="rgba(79,140,255,0.25)" strokeWidth="1"/>
        <line x1="980" y1="280" x2="860" y2="310" stroke="rgba(79,140,255,0.2)" strokeWidth="1"/>
        <line x1="900" y1="200" x2="1020" y2="180" stroke="rgba(138,63,252,0.2)" strokeWidth="1"/>
        <line x1="980" y1="280" x2="940" y2="350" stroke="rgba(138,63,252,0.2)" strokeWidth="1"/>
        <line x1="860" y1="310" x2="940" y2="350" stroke="rgba(79,140,255,0.2)" strokeWidth="1"/>
      </svg>
    </Box>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ value, label, prefix, suffix }: {
  value: number; label: string; prefix?: string; suffix?: string;
}) {
  return (
    <Box sx={{
      textAlign: 'center', px: 2.5, py: 2,
      borderLeft: '1px solid rgba(255,255,255,0.12)',
      '&:first-of-type': { borderLeft: 'none' },
    }}>
      <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
        <AnimatedCounter target={value} prefix={prefix} suffix={suffix} />
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', mt: 0.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </Typography>
    </Box>
  );
}

// ── Feature pill ─────────────────────────────────────────────────────────────
function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
      border: '1px solid rgba(255,255,255,0.14)', borderRadius: '100px',
      color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500,
      backdropFilter: 'blur(8px)', bgcolor: 'rgba(255,255,255,0.04)',
      transition: 'all 0.2s',
      '&:hover': { borderColor: 'rgba(255,255,255,0.3)', color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
    }}>
      {icon}
      {label}
    </Box>
  );
}

// ── Main Cover Page ───────────────────────────────────────────────────────────
export default function CoverPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1635 40%, #0f1f4a 70%, #0c1530 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <HeroBg />

      {/* ── Top nav ──────────────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 3, md: 6 }, py: 2.5,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #0f62fe, #4589ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(15,98,254,0.4)',
          }}>
            <InsightsOutlinedIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
              ProcureIQ
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Powered by IBM watsonx
            </Typography>
          </Box>
        </Box>

        {/* Nav actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label="IBM watsonx Challenge 2025"
            size="small"
            icon={<VerifiedOutlinedIcon sx={{ fontSize: '14px !important', color: '#4589ff !important' }} />}
            sx={{
              bgcolor: 'rgba(15,98,254,0.15)', color: '#4589ff',
              border: '1px solid rgba(15,98,254,0.3)', fontWeight: 600,
              fontSize: 11, display: { xs: 'none', sm: 'flex' },
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/login')}
            sx={{
              color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.2)',
              fontWeight: 600, fontSize: 13, px: 2.5, borderRadius: '6px',
              '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Sign In
          </Button>
        </Box>
      </Box>

      {/* ── Hero section ─────────────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        px: { xs: 3, md: 4 }, py: { xs: 6, md: 4 },
        position: 'relative', zIndex: 2,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}>
        {/* Badge */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          px: 2, py: 0.75, mb: 4,
          border: '1px solid rgba(15,98,254,0.4)',
          borderRadius: '100px',
          bgcolor: 'rgba(15,98,254,0.1)',
          backdropFilter: 'blur(8px)',
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 14, color: '#4589ff' }} />
          <Typography sx={{ fontSize: 12, color: '#4589ff', fontWeight: 600, letterSpacing: '0.06em' }}>
            AI-Powered Enterprise Procurement Intelligence
          </Typography>
        </Box>

        {/* Main headline */}
        <Typography sx={{
          fontSize: { xs: 38, sm: 52, md: 68, lg: 80 },
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.05,
          letterSpacing: '-2px',
          mb: 1.5,
          maxWidth: 900,
        }}>
          The Future of
        </Typography>
        <Typography sx={{
          fontSize: { xs: 38, sm: 52, md: 68, lg: 80 },
          fontWeight: 800,
          background: 'linear-gradient(90deg, #4589ff 0%, #6929c4 50%, #4589ff 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.05,
          letterSpacing: '-2px',
          mb: 3,
          animation: 'shimmer 4s linear infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }}>
          Procurement
        </Typography>

        {/* Tagline */}
        <Typography sx={{
          fontSize: { xs: 16, md: 20 },
          color: 'rgba(255,255,255,0.65)',
          maxWidth: 620,
          lineHeight: 1.65,
          mb: 5,
          fontWeight: 400,
        }}>
          Transform raw procurement data into intelligent decisions with{' '}
          <Box component="span" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Ignite</Box>,
          your AI procurement advisor. Built for enterprises that demand clarity,
          speed, and control.
        </Typography>

        {/* CTA buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 6 }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/login')}
            sx={{
              px: 4, py: 1.5, fontSize: 15, fontWeight: 700,
              background: 'linear-gradient(135deg, #0f62fe, #4589ff)',
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(15,98,254,0.45)',
              border: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #0043ce, #0f62fe)',
                boxShadow: '0 6px 32px rgba(15,98,254,0.6)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s',
            }}
          >
            Launch Platform
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              px: 4, py: 1.5, fontSize: 15, fontWeight: 600,
              color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.25)',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              bgcolor: 'rgba(255,255,255,0.04)',
              '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              transition: 'all 0.2s',
            }}
          >
            View Demo
          </Button>
        </Box>

        {/* Feature pills */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 8 }}>
          <FeaturePill icon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />} label="Ignite AI Advisor" />
          <FeaturePill icon={<InsightsOutlinedIcon sx={{ fontSize: 15 }} />} label="Real-time Spend Intelligence" />
          <FeaturePill icon={<ShieldOutlinedIcon sx={{ fontSize: 15 }} />} label="Supplier Risk Assessment" />
          <FeaturePill icon={<AccountTreeOutlinedIcon sx={{ fontSize: 15 }} />} label="Contract Intelligence" />
          <FeaturePill icon={<VerifiedOutlinedIcon sx={{ fontSize: 15 }} />} label="Procurement Health Score" />
        </Box>

        {/* Metrics bar */}
        <Box sx={{
          display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(16px)',
          bgcolor: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
          mb: 4,
        }}>
          <MetricCard value={15} suffix="+" label="Business Modules" />
          <MetricCard value={5000} suffix="+" label="Transactions Analysed" />
          <MetricCard value={98} suffix="%" label="Model Accuracy" />
          <MetricCard value={12} suffix="x" label="Faster Decisions" />
        </Box>
      </Box>

      {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        px: { xs: 3, md: 6 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 1,
        backdropFilter: 'blur(10px)',
      }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          © 2025 ProcureIQ · IBM watsonx Challenge · All rights reserved
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {['Executive Command Center', 'Supplier 360', 'Spend Analytics', 'Ignite AI'].map(item => (
            <Typography
              key={item}
              onClick={() => navigate('/login')}
              sx={{
                color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer',
                '&:hover': { color: 'rgba(255,255,255,0.7)' }, transition: 'color 0.2s',
              }}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
