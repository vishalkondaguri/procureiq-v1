import { useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Chip, Divider,
  List, ListItem, Tooltip, CircularProgress, Badge,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useNavigate } from 'react-router-dom';

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
    refetchInterval: 60_000,   // poll every 60s
    staleTime: 30_000,
  });
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<NotificationPriority, { color: string; bg: string; label: string }> = {
  critical: { color: '#da1e28', bg: '#fff1f1', label: 'Critical' },
  high:     { color: '#f1620a', bg: '#fff2e8', label: 'High' },
  medium:   { color: '#f1c21b', bg: '#fcf4d6', label: 'Medium' },
  low:      { color: '#198038', bg: '#defbe6', label: 'Low' },
};

const CATEGORY_ICON: Record<NotificationCategory, React.ReactNode> = {
  contract: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />,
  risk:     <WarningAmberIcon sx={{ fontSize: 18 }} />,
  savings:  <SavingsOutlinedIcon sx={{ fontSize: 18 }} />,
  spend:    <TrendingDownIcon sx={{ fontSize: 18 }} />,
  ide:      <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
  system:   <ErrorOutlineIcon sx={{ fontSize: 18 }} />,
};

const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  contract: '#0f62fe',
  risk:     '#f1620a',
  savings:  '#198038',
  spend:    '#6929c4',
  ide:      '#007d79',
  system:   '#525252',
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'contract', label: 'Contracts' },
  { key: 'risk',     label: 'Risk' },
  { key: 'savings',  label: 'Savings' },
  { key: 'spend',    label: 'Spend' },
];

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  notif,
  onAction,
  onMarkRead,
}: {
  notif: AppNotification;
  onAction: (path: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const cfg = PRIORITY_CFG[notif.priority];
  const catColor = CATEGORY_COLOR[notif.category];

  return (
    <ListItem
      disablePadding
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderLeft: `3px solid ${cfg.color}`,
        bgcolor: notif.read ? '#fff' : cfg.bg,
        mb: 0.5,
        borderRadius: '0 4px 4px 0',
        p: 1.5,
        transition: 'background 0.2s',
        cursor: 'default',
        '&:hover': { bgcolor: '#f4f4f4' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {/* Category icon */}
        <Box sx={{ color: catColor, mt: 0.25, flexShrink: 0 }}>
          {CATEGORY_ICON[notif.category]}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#161616', flex: 1 }} noWrap>
              {notif.title}
            </Typography>
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                height: 18, fontSize: 10, fontWeight: 700,
                bgcolor: cfg.bg, color: cfg.color,
                border: `1px solid ${cfg.color}`,
                flexShrink: 0,
              }}
            />
          </Box>

          {/* Message */}
          <Typography sx={{ fontSize: 12, color: '#525252', lineHeight: 1.5, mb: 0.75 }}>
            {notif.message}
          </Typography>

          {/* Action */}
          {notif.action_label && notif.action_path && (
            <Box
              component="span"
              onClick={() => onAction(notif.action_path!)}
              sx={{
                fontSize: 11, fontWeight: 600, color: '#0f62fe',
                cursor: 'pointer', textDecoration: 'underline',
                '&:hover': { color: '#0043ce' },
              }}
            >
              {notif.action_label} →
            </Box>
          )}
        </Box>

        {/* Mark read */}
        {!notif.read && (
          <Tooltip title="Mark as read">
            <Box
              sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: '#0f62fe', flexShrink: 0, mt: 0.5, cursor: 'pointer',
              }}
              onClick={() => onMarkRead(notif.id)}
            />
          </Tooltip>
        )}
      </Box>
    </ListItem>
  );
}

// ─── NotificationCenter drawer ────────────────────────────────────────────────

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useNotifications();

  const notifications = (data?.notifications ?? []).map(n => ({
    ...n,
    read: readIds.has(n.id) || n.read,
  }));

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.category === activeFilter);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2.5, py: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff',
      }}>
        <NotificationsNoneIcon sx={{ color: '#0f62fe', fontSize: 22 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#161616' }}>
            Notification Center
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6f6f6f' }}>
            {isLoading ? 'Loading…' : `${unreadCount} unread · ${filtered.length} shown`}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Tooltip title="Mark all as read">
            <IconButton size="small" onClick={handleMarkAllRead} sx={{ color: '#6f6f6f' }}>
              <DoneAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={onClose} sx={{ color: '#525252' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Filter tabs */}
      <Box sx={{
        display: 'flex', gap: 0.5, px: 2, py: 1,
        borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', flexWrap: 'wrap',
      }}>
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'all'
            ? notifications.length
            : (data?.by_category?.[tab.key] ?? 0);
          return (
            <Chip
              key={tab.key}
              label={count > 0 ? `${tab.label} (${count})` : tab.label}
              size="small"
              onClick={() => setActiveFilter(tab.key)}
              sx={{
                height: 24, fontSize: 11, cursor: 'pointer',
                bgcolor: activeFilter === tab.key ? '#0f62fe' : '#f4f4f4',
                color: activeFilter === tab.key ? '#fff' : '#525252',
                fontWeight: activeFilter === tab.key ? 700 : 400,
                '&:hover': { bgcolor: activeFilter === tab.key ? '#0043ce' : '#e0e0e0' },
              }}
            />
          );
        })}
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 6, color: '#8d8d8d' }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
            <Typography sx={{ fontSize: 14 }}>No notifications in this category</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((notif, idx) => (
              <Box key={notif.id}>
                <NotificationItem
                  notif={notif}
                  onAction={handleAction}
                  onMarkRead={handleMarkRead}
                />
                {idx < filtered.length - 1 && <Divider sx={{ my: 0.25 }} />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        borderTop: '1px solid #e0e0e0', px: 2.5, py: 1.5,
        bgcolor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>
          Auto-refreshes every 60s · Powered by live DB
        </Typography>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsNoneIcon sx={{ fontSize: 16, color: '#8d8d8d' }} />
        </Badge>
      </Box>
    </Drawer>
  );
}
