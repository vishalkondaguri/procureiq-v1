import { Chip } from '@mui/material';

type StatusVariant =
  | 'active' | 'expiring_soon' | 'expired' | 'draft' | 'terminated'
  | 'low' | 'medium' | 'high' | 'critical'
  | 'completed' | 'pending' | 'processing' | 'failed' | 'partial'
  | 'tier1' | 'tier2' | 'tier3';

const CONFIG: Record<StatusVariant, { label: string; bg: string; color: string }> = {
  active:        { label: 'Active',         bg: '#defbe6', color: '#0e6027' },
  expiring_soon: { label: 'Expiring Soon',  bg: '#fff8e1', color: '#b45309' },
  expired:       { label: 'Expired',        bg: '#fff1f1', color: '#da1e28' },
  draft:         { label: 'Draft',          bg: '#f0f0f0', color: '#525252' },
  terminated:    { label: 'Terminated',     bg: '#f0f0f0', color: '#525252' },
  low:           { label: 'Low',            bg: '#defbe6', color: '#0e6027' },
  medium:        { label: 'Medium',         bg: '#fff8e1', color: '#b45309' },
  high:          { label: 'High',           bg: '#fff1f1', color: '#da1e28' },
  critical:      { label: 'Critical',       bg: '#ffd7d9', color: '#750e13' },
  completed:     { label: 'Completed',      bg: '#defbe6', color: '#0e6027' },
  pending:       { label: 'Pending',        bg: '#f0f0f0', color: '#525252' },
  processing:    { label: 'Processing',     bg: '#d0e2ff', color: '#002d9c' },
  failed:        { label: 'Failed',         bg: '#fff1f1', color: '#da1e28' },
  partial:       { label: 'Partial',        bg: '#fff8e1', color: '#b45309' },
  tier1:         { label: 'Tier 1',         bg: '#d0e2ff', color: '#002d9c' },
  tier2:         { label: 'Tier 2',         bg: '#e8daff', color: '#491d8b' },
  tier3:         { label: 'Tier 3',         bg: '#f0f0f0', color: '#525252' },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as StatusVariant] ?? { label: status, bg: '#f0f0f0', color: '#525252' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11, height: 22, borderRadius: 0.75 }}
    />
  );
}
