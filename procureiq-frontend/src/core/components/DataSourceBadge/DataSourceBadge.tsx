import { Box, Typography, Tooltip } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface DataSourceBadgeProps {
  /** Source label, e.g. "PostgreSQL · spend_transactions" */
  source: string;
  /** ISO timestamp or human string of last refresh */
  lastUpdated?: string;
  /** Number of records driving this widget */
  recordCount?: number;
  /** Confidence 0-100 */
  confidence?: number;
  /** Show inline (default) vs stacked layout */
  layout?: 'inline' | 'stacked';
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function DataSourceBadge({
  source,
  lastUpdated,
  recordCount,
  confidence,
  layout = 'inline',
}: DataSourceBadgeProps) {
  const confColor = !confidence ? '#8d8d8d'
    : confidence >= 90 ? '#198038'
    : confidence >= 75 ? '#0f62fe'
    : confidence >= 60 ? '#f1c21b'
    : '#da1e28';

  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>Data Source</Typography>
      <Typography sx={{ fontSize: 11 }}>Source: {source}</Typography>
      {lastUpdated && <Typography sx={{ fontSize: 11 }}>Last updated: {relativeTime(lastUpdated)}</Typography>}
      {recordCount !== undefined && <Typography sx={{ fontSize: 11 }}>Records: {recordCount.toLocaleString()}</Typography>}
      {confidence !== undefined && <Typography sx={{ fontSize: 11 }}>Data confidence: {confidence}%</Typography>}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} placement="top" arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexDirection: layout === 'stacked' ? 'column' : 'row',
          flexWrap: 'wrap',
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        {/* Source pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <StorageIcon sx={{ fontSize: 11, color: '#8d8d8d' }} />
          <Typography sx={{ fontSize: 10, color: '#8d8d8d', fontFamily: 'monospace' }}>
            {source}
          </Typography>
        </Box>

        {lastUpdated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <RefreshIcon sx={{ fontSize: 11, color: '#8d8d8d' }} />
            <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>
              {relativeTime(lastUpdated)}
            </Typography>
          </Box>
        )}

        {recordCount !== undefined && (
          <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>
            {recordCount.toLocaleString()} rows
          </Typography>
        )}

        {confidence !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 11, color: confColor }} />
            <Typography sx={{ fontSize: 10, color: confColor, fontWeight: 600 }}>
              {confidence}% confidence
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
