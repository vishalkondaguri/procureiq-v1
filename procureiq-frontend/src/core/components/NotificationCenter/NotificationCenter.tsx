import { useState, useMemo } from 'react';
import {
  Drawer, Box, Typography, IconButton, Chip, Divider,
  List, ListItem, Tooltip, Badge, Alert,
  LinearProgress,
} from '@mui/material';
import CloseIcon              from '@mui/icons-material/Close';
import NotificationsNoneIcon  from '@mui/icons-material/NotificationsNone';
import WarningAmberIcon       from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon       from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon       from '@mui/icons-material/InfoOutlined';
import TrendingDownIcon       from '@mui/icons-material/TrendingDown';
import SavingsOutlinedIcon    from '@mui/icons-material/SavingsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DoneAllIcon            from '@mui/icons-material/DoneAll';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import FiberManualRecordIcon  from '@mui/icons-material/FiberManualRecord';
import OpenInNewIcon          from '@mui/icons-material/OpenInNew';
import { useQuery }           from '@tanstack/react-query';
import { apiClient }          from '@/core/api/client';
import { useNavigate }        from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
export type NotificationCategory = 'contract' | 'risk' | 'savings' | 'spend' | 'ide' | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_label?: string;
  action_path?: string;
  meta?: Record<string, unknown>;
  read: boolean;
  created_at?: string;
}

interface NotificationResponse {
  notifications: AppNotification[];
  unread_count: number;
  total: number;
  by_category: Record<string, number>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<NotificationResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationResponse>('/notifications');
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<NotificationPriority, { color: string; bg: string; border: string; label: string; dot: string }> = {
  critical: { color: '#da1e28', bg: '#fff1f1', border: '#ffd7d9', label: 'Critical', dot: '#da1e28' },
  high:     { color: '#f1620a', bg: '#fff2e8', border: '#ffd9bb', label: 'High',     dot: '#f1620a' },
  medium:   { color: '#b28600', bg: '#fcf4d6', border: '#f1c21b', label: 'Medium',   dot: '#f1c21b' },
  low:      { color: '#198038', bg: '#defbe6', border: '#a7f0ba', label: 'Low',      dot: '#198038' },
};

const CATEGORY_ICON: Record<NotificationCategory, React.ReactNode> = {
  contract: <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />,
  risk:     <WarningAmberIcon        sx={{ fontSize: 16 }} />,
  savings:  <SavingsOutlinedIcon     sx={{ fontSize: 16 }} />,
  spend:    <TrendingDownIcon        sx={{ fontSize: 16 }} />,
  ide:      <InfoOutlinedIcon        sx={{ fontSize: 16 }} />,
  system:   <ErrorOutlineIcon        sx={{ fontSize: 16 }} />,
};

const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  contract: '#0f62fe',
  risk:     '#f1620a',
  savings:  '#198038',
  spend:    '#6929c4',
  ide:      '#007d79',
  system:   '#525252',
};

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  contract: 'Contracts',
  risk:     'Risk',
  savings:  'Savings',
  spend:    'Spend',
  ide:      'Data Engine',
  system:   'System',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ notifications, byCategory }: {
  notifications: AppNotification[];
  byCategory: Record<string, number>;
}) {
  const critical = notifications.filter(n => n.priority === 'critical' && !n.read).length;
  const high     = notifications.filter(n => n.priority === 'high'     && !n.read).length;
  const total    = notifications.length;
  const unread   = notifications.filter(n => !n.read).length;

  return (
    <Box sx={{ px: 2.5, py: 1.25, bgcolor: '#f7f8fa', borderBottom: '1px solid #e0e0e0' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 0.75 }}>
        {[
          { label: 'Total',    value: total,    color: '#525252' },
          { label: 'Unread',   value: unread,   color: '#0f62fe' },
          { label: 'Critical', value: critical, color: '#da1e28' },
          { label: 'High',     value: high,     color: '#f1620a' },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', flex: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 10, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>
      {/* Category breakdown pills */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {Object.entries(byCategory).filter(([, v]) => v > 0).map(([cat, count]) => (
          <Chip key={cat}
            label={`${CATEGORY_LABEL[cat as NotificationCategory] ?? cat} ${count}`}
            size="small"
            sx={{
              height: 18, fontSize: 10, fontWeight: 600,
              bgcolor: `${CATEGORY_COLOR[cat as NotificationCategory] ?? '#525252'}15`,
              color: CATEGORY_COLOR[cat as NotificationCategory] ?? '#525252',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotificationItem({
  notif, onAction, onMarkRead,
}: {
  notif: AppNotification;
  onAction: (path: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const cfg      = PRIORITY_CFG[notif.priority];
  const catColor = CATEGORY_COLOR[notif.category];
  const isUnread = !notif.read;

  return (
    <ListItem
      disablePadding
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        borderLeft: `3px solid ${cfg.color}`,
        bgcolor: isUnread ? cfg.bg : '#fff',
        border: isUnread ? `1px solid ${cfg.border}` : '1px solid transparent',
        mb: 0.75, borderRadius: '0 6px 6px 0', p: 1.5,
        transition: 'all 0.18s',
        '&:hover': { bgcolor: isUnread ? cfg.bg : '#f7f8fa', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        {/* Category icon in colored circle */}
        <Box sx={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0, mt: 0.1,
          bgcolor: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: catColor,
        }}>
          {CATEGORY_ICON[notif.category]}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title + priority */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.25 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#161616', flex: 1, lineHeight: 1.3 }}>
              {notif.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <Chip label={cfg.label} size="small" sx={{
                height: 16, fontSize: 9, fontWeight: 700,
                bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              }} />
              {isUnread && (
                <FiberManualRecordIcon sx={{ fontSize: 8, color: '#0f62fe' }} />
              )}
            </Box>
          </Box>

          {/* Message */}
          <Typography sx={{ fontSize: 12, color: '#525252', lineHeight: 1.5, mb: 0.75 }}>
            {notif.message}
          </Typography>

          {/* Footer row: time + action */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>
              {timeAgo(notif.created_at)}
            </Typography>
            {notif.action_label && notif.action_path && (
              <Box
                component="span"
                onClick={() => onAction(notif.action_path!)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.25,
                  fontSize: 11, fontWeight: 600, color: catColor,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {notif.action_label}
                <OpenInNewIcon sx={{ fontSize: 11 }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Mark read dot */}
        {isUnread && (
          <Tooltip title="Mark as read">
            <Box
              sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: '#0f62fe',
                flexShrink: 0, mt: 0.75, cursor: 'pointer', transition: 'opacity 0.15s',
                '&:hover': { opacity: 0.6 },
              }}
              onClick={() => onMarkRead(notif.id)}
            />
          </Tooltip>
        )}
      </Box>
    </ListItem>
  );
}

// ─── Grouped section ──────────────────────────────────────────────────────────

function NotificationGroup({
  label, color, items, onAction, onMarkRead,
}: {
  label: string; color: string;
  items: AppNotification[];
  onAction: (p: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const unread = items.filter(n => !n.read).length;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        onClick={() => setCollapsed(c => !c)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5, py: 0.5, cursor: 'pointer',
              '&:hover': { bgcolor: '#f0f0f0', borderRadius: 1 }, mb: 0.5 }}
      >
        <Box sx={{ width: 4, height: 14, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#525252', textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>
          {label}
        </Typography>
        {unread > 0 && (
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{unread}</Typography>
          </Box>
        )}
        <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>{collapsed ? '▸' : '▾'}</Typography>
      </Box>
      {!collapsed && (
        <List disablePadding>
          {items.map(n => (
            <NotificationItem key={n.id} notif={n} onAction={onAction} onMarkRead={onMarkRead} />
          ))}
        </List>
      )}
    </Box>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'critical', label: 'Critical' },
  { key: 'contract', label: 'Contracts' },
  { key: 'risk',     label: 'Risk' },
  { key: 'savings',  label: 'Savings' },
];

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [readIds, setReadIds]           = useState<Set<string>>(new Set());
  const [grouped, setGrouped]           = useState(false);

  const { data, isLoading, refetch } = useNotifications();

  const notifications = useMemo(() =>
    (data?.notifications ?? []).map(n => ({
      ...n,
      read: readIds.has(n.id) || n.read,
    })),
    [data, readIds]
  );

  const filtered = useMemo(() => {
    if (activeFilter === 'all')       return notifications;
    if (activeFilter === 'unread')    return notifications.filter(n => !n.read);
    if (activeFilter === 'critical')  return notifications.filter(n => n.priority === 'critical');
    return notifications.filter(n => n.category === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const byCategory  = data?.by_category ?? {};

  // Group by category for grouped view
  const groups = useMemo(() => {
    const cats = [...new Set(filtered.map(n => n.category))];
    return cats.map(cat => ({
      cat,
      label:  CATEGORY_LABEL[cat] ?? cat,
      color:  CATEGORY_COLOR[cat] ?? '#525252',
      items:  filtered.filter(n => n.category === cat),
    }));
  }, [filtered]);

  function handleMarkRead(id: string) {
    setReadIds(prev => new Set([...prev, id]));
  }

  function handleMarkAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)));
  }

  function handleAction(path: string) {
    navigate(path);
    onClose();
  }

  // Urgency summary for header
  const criticalUnread = notifications.filter(n => n.priority === 'critical' && !n.read).length;

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: { width: 420, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box sx={{
        px: 2.5, py: 1.75, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
          <NotificationsNoneIcon sx={{ color: '#0f62fe', fontSize: 22 }} />
        </Badge>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#161616', lineHeight: 1.2 }}>
            Notification Center
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>
            {isLoading ? 'Loading…' : `${unreadCount} unread · ${notifications.length} total`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          <Tooltip title={grouped ? 'Flat view' : 'Group by category'}>
            <IconButton size="small" onClick={() => setGrouped(g => !g)}
              sx={{ color: grouped ? '#0f62fe' : '#8d8d8d', fontSize: 14 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>≡</Typography>
            </IconButton>
          </Tooltip>
          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={handleMarkAllRead} sx={{ color: '#6f6f6f' }}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetch()} sx={{ color: '#6f6f6f' }}>
              <Typography sx={{ fontSize: 13 }}>↻</Typography>
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: '#525252' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ── Critical alert banner ────────────────────────────────────────── */}
      {criticalUnread > 0 && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon sx={{ fontSize: 16 }} />}
          sx={{ borderRadius: 0, py: 0.75, fontSize: 12 }}
          action={
            <Chip label="View" size="small" clickable
              onClick={() => setActiveFilter('critical')}
              sx={{ bgcolor: '#da1e28', color: '#fff', fontSize: 10, height: 20, fontWeight: 700 }} />
          }
        >
          <strong>{criticalUnread} critical alert{criticalUnread !== 1 ? 's' : ''}</strong> require immediate attention
        </Alert>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {!isLoading && notifications.length > 0 && (
        <StatsBar notifications={notifications} byCategory={byCategory} />
      )}

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', gap: 0.5, px: 1.5, py: 0.75,
        borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', flexWrap: 'wrap',
        overflowX: 'auto',
      }}>
        {FILTER_TABS.map(tab => {
          const cnt = tab.key === 'all'    ? notifications.length
                    : tab.key === 'unread' ? notifications.filter(n => !n.read).length
                    : tab.key === 'critical' ? notifications.filter(n => n.priority === 'critical').length
                    : (byCategory[tab.key] ?? 0);
          const isActive = activeFilter === tab.key;
          return (
            <Chip
              key={tab.key}
              label={cnt > 0 ? `${tab.label} (${cnt})` : tab.label}
              size="small"
              onClick={() => setActiveFilter(tab.key)}
              sx={{
                height: 24, fontSize: 11, cursor: 'pointer', flexShrink: 0,
                bgcolor: isActive ? '#0f62fe' : '#f4f4f4',
                color:   isActive ? '#fff'    : '#525252',
                fontWeight: isActive ? 700 : 400,
                border: isActive ? '1px solid #0f62fe' : '1px solid transparent',
                '&:hover': { bgcolor: isActive ? '#0043ce' : '#e0e0e0' },
              }}
            />
          );
        })}
      </Box>

      {isLoading && <LinearProgress sx={{ height: 2 }} />}

      {/* ── List / grouped view ───────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Box key={i} sx={{ height: 72, bgcolor: '#f0f0f0', borderRadius: 1, opacity: 1 - i * 0.15 }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 6, color: '#8d8d8d' }}>
            <CheckCircleIcon sx={{ fontSize: 40, mb: 1.5, color: '#198038', opacity: 0.5 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#525252', mb: 0.5 }}>
              {activeFilter === 'unread' ? 'All caught up!' : 'No notifications here'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#8d8d8d' }}>
              {activeFilter === 'unread' ? 'No unread notifications.' : `No ${activeFilter} notifications at this time.`}
            </Typography>
          </Box>
        ) : grouped ? (
          groups.map(g => (
            <NotificationGroup
              key={g.cat} label={g.label} color={g.color}
              items={g.items} onAction={handleAction} onMarkRead={handleMarkRead}
            />
          ))
        ) : (
          <List disablePadding>
            {filtered.map((notif, idx) => (
              <Box key={notif.id}>
                <NotificationItem notif={notif} onAction={handleAction} onMarkRead={handleMarkRead} />
                {idx < filtered.length - 1 && <Divider sx={{ my: 0.25, opacity: 0.4 }} />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Box sx={{
        borderTop: '1px solid #e0e0e0', px: 2.5, py: 1.25,
        bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>
          Live · auto-refreshes every 60s
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              sx={{ height: 18, fontSize: 10, bgcolor: '#eff4ff', color: '#0f62fe', fontWeight: 700 }}
            />
          )}
          <NotificationsNoneIcon sx={{ fontSize: 14, color: '#8d8d8d' }} />
        </Box>
      </Box>
    </Drawer>
  );
}
