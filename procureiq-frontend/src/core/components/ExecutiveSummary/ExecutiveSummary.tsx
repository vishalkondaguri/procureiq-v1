import { Box, Typography, Chip, useTheme } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface ExecutiveSummaryProps {
  title: string;
  summary: string;
  highlights?: string[];
  isLoading?: boolean;
}

export default function ExecutiveSummary({ title, summary, highlights, isLoading }: ExecutiveSummaryProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{
      bgcolor: isDark ? '#0d1a33' : '#eff4ff',
      border: `1px solid ${isDark ? '#264a8e' : '#d0e2ff'}`,
      borderRadius: 1.5, p: 2.5, mb: 3,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: '#4589ff', fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#78a9ff' : '#0043ce' }}>
          Ignite AI — {title}
        </Typography>
        <Chip label="AI Generated" size="small"
          sx={{ ml: 'auto', bgcolor: isDark ? '#1d3461' : '#d0e2ff', color: isDark ? '#78a9ff' : '#002d9c', fontSize: 10, fontWeight: 700, height: 20 }} />
      </Box>
      {isLoading ? (
        <Box sx={{ height: 40, bgcolor: isDark ? '#1d3461' : '#d0e2ff', borderRadius: 1, opacity: 0.5 }} />
      ) : (
        <>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{summary}</Typography>
          {highlights && highlights.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
              {highlights.map((h, i) => (
                <Chip key={i} label={h} size="small"
                  sx={{ bgcolor: isDark ? '#262626' : '#fff', border: `1px solid ${isDark ? '#264a8e' : '#d0e2ff'}`,
                        color: isDark ? '#78a9ff' : '#0043ce', fontSize: 11, height: 24 }} />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
