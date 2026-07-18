import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface KPICardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  loading?: boolean;
}

function DeltaChip({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) return (
    <Chip icon={<TrendingFlatIcon sx={{ fontSize: '14px !important' }} />}
      label="Flat" size="small"
      sx={{ bgcolor: '#f0f0f0', color: '#525252', height: 22, fontSize: 11, fontWeight: 600 }} />
  );
  const up = delta > 0;
  return (
    <Chip
      icon={up
        ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} />
        : <TrendingDownIcon sx={{ fontSize: '14px !important' }} />}
      label={`${up ? '+' : ''}${delta.toFixed(1)}%`}
      size="small"
      sx={{
        bgcolor: up ? '#defbe6' : '#fff1f1',
        color: up ? '#0e6027' : '#da1e28',
        height: 22, fontSize: 11, fontWeight: 600,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
}

export default function KPICard({ title, value, delta, deltaLabel, subtitle, icon, accentColor = '#0f62fe', loading }: KPICardProps) {
  return (
    <Card sx={{ height: '100%', border: '1px solid #e0e0e0', borderTop: `3px solid ${accentColor}` }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#525252', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
            {title}
          </Typography>
          {icon && <Box sx={{ color: accentColor, opacity: 0.8 }}>{icon}</Box>}
        </Box>
        {loading ? (
          <Box sx={{ height: 36, bgcolor: '#f0f0f0', borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 26, color: '#161616', mb: 0.5 }}>
            {value}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {delta !== undefined && <DeltaChip delta={delta} />}
          {(deltaLabel || subtitle) && (
            <Typography variant="caption" color="text.secondary">{deltaLabel ?? subtitle}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
