import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, AppBar, Typography, IconButton, Avatar, Tooltip,
  Badge, useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningIcon from '@mui/icons-material/Warning';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SavingsIcon from '@mui/icons-material/Savings';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useAuth } from '@/core/auth/AuthContext';
import IgniteDrawer from '@/ignite/IgniteDrawer';
import NotificationCenter, { useNotifications } from '@/core/components/NotificationCenter';
import { useThemeMode } from '@/core/theme/ThemeContext';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 64;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  phase?: number;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Executive Command Center', path: '/app/dashboard',     icon: <DashboardIcon /> },
  { label: 'Data Engine (IDE)',         path: '/app/data-engine',  icon: <CloudUploadIcon /> },
  { label: 'Tail Spend Intelligence',   path: '/app/tail-spend',   icon: <AccountBalanceWalletIcon /> },
  { label: 'Supplier 360',              path: '/app/suppliers',    icon: <PeopleIcon /> },
  { label: 'Contract Intelligence',     path: '/app/contracts',    icon: <DescriptionIcon />,    phase: 2 },
  { label: 'Supplier Intelligence',     path: '/app/supplier-risk',icon: <WarningIcon />,        phase: 2 },
  { label: '80/20 Pareto Analysis',     path: '/app/pareto',       icon: <BarChartIcon />,       phase: 2 },
  { label: 'Savings Engine',            path: '/app/savings',      icon: <SavingsIcon />,        phase: 2 },
  { label: 'Health Score',              path: '/app/health-score', icon: <FavoriteIcon />,       phase: 2 },
  { label: 'Payment Analytics',         path: '/app/payments',     icon: <PaymentsIcon />,       phase: 2 },
  { label: 'What-if Analysis',          path: '/app/what-if',      icon: <CompareArrowsIcon />,  phase: 3 },
  { label: 'Spend Forecasting',         path: '/app/forecasting',  icon: <TrendingUpIcon />,     phase: 3 },
  { label: 'Executive Reporting',       path: '/app/reporting',    icon: <AssessmentIcon />,     phase: 3 },
  { label: 'Documentation',             path: '/app/documentation',icon: <MenuBookIcon /> },
  { label: 'Settings',                  path: '/app/settings',     icon: <SettingsIcon /> },
];

// ── News ticker items ─────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '📊 ProcureIQ AI — Powered by IBM watsonx',
  '🔔 Ignite AI is ready to assist with procurement insights',
  '💡 Tip: Upload your Excel data to unlock real-time intelligence',
  '📈 Track savings opportunities across all supplier categories',
  '🔒 Enterprise-grade security with role-based access control',
  '🌍 Supplier Intelligence covers 25+ countries with risk scoring',
];

function NewsTicker() {
  const [idx, setIdx] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % TICKER_ITEMS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <Box sx={{
      height: 28, bgcolor: theme.palette.mode === 'dark' ? '#0f0f0f' : '#001d6c',
      display: 'flex', alignItems: 'center', px: 2, overflow: 'hidden',
    }}>
      <Typography sx={{
        fontSize: 11, color: '#a6c8ff', fontWeight: 500,
        whiteSpace: 'nowrap', animation: 'none',
      }}>
        {TICKER_ITEMS[idx]}
      </Typography>
    </Box>
  );
}

export default function PageLayout() {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [igniteOpen, setIgniteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.unread_count ?? 0;

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const currentModule = NAV_ITEMS.find(n => location.pathname === n.path)?.label ?? 'ProcureIQ';

  const sidebarBg = '#161616';
  const mainBg = theme.palette.background.default;
  const appBarBg = theme.palette.mode === 'dark' ? '#262626' : '#ffffff';
  const appBarBorder = theme.palette.divider;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: mainBg, flexDirection: 'column' }}>
      {/* News Ticker */}
      <NewsTicker />

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Sidebar ── */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth, flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth, boxSizing: 'border-box',
              bgcolor: sidebarBg, color: '#f4f4f4',
              border: 'none', transition: theme.transitions.create('width'),
              overflowX: 'hidden',
              top: 28,              // offset for ticker
              height: 'calc(100vh - 28px)',
            },
          }}
        >
          {/* Logo row */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, height: 56,
                     borderBottom: '1px solid #393939', gap: 1.5, flexShrink: 0 }}>
            <Box sx={{ width: 28, height: 28, bgcolor: 'primary.main', borderRadius: 0.5, flexShrink: 0,
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>P</Typography>
            </Box>
            {!collapsed && (
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  ProcureIQ
                </Typography>
                <Typography sx={{ color: '#6f6f6f', fontSize: 10 }}>v1.0 · IBM watsonx</Typography>
              </Box>
            )}
            <Box sx={{ ml: 'auto' }}>
              <IconButton size="small" onClick={() => setCollapsed(c => !c)} sx={{ color: '#a8a8a8' }}>
                {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Box>

          {/* Nav items */}
          <List dense sx={{ py: 1, flex: 1, overflow: 'auto' }}>
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                  <Tooltip title={collapsed ? item.label : ''} placement="right">
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      sx={{
                        minHeight: 40, px: 2, py: 0.75,
                        bgcolor: active ? '#0f62fe' : 'transparent',
                        borderRadius: '2px',
                        mx: 0.5,
                        '&:hover': { bgcolor: active ? '#0f62fe' : '#262626' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, color: active ? '#fff' : '#c6c6c6', fontSize: 20 }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#fff' : '#c6c6c6', noWrap: true }}
                        />
                      )}
                      {!collapsed && item.phase && item.phase > 1 && (
                        <Typography sx={{ fontSize: 10, color: '#6f6f6f', ml: 1, flexShrink: 0 }}>P{item.phase}</Typography>
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>

          {/* Bottom: user + Ignite */}
          <Box sx={{ borderTop: '1px solid #393939', p: 1, flexShrink: 0 }}>
            <Tooltip title="Ask Ignite AI" placement="right">
              <ListItemButton
                onClick={() => setIgniteOpen(true)}
                sx={{ borderRadius: 1, bgcolor: '#1d3461', mb: 0.5, px: 1.5,
                     '&:hover': { bgcolor: '#264a8e' } }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, color: '#78a9ff' }}>
                  <AutoAwesomeIcon fontSize="small" />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary="Ask Ignite" primaryTypographyProps={{ fontSize: 13, fontWeight: 600, color: '#78a9ff' }} />
                )}
              </ListItemButton>
            </Tooltip>
            {!collapsed && user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#0f62fe', fontSize: 12 }}>
                  {user.fullName?.[0] ?? 'U'}
                </Avatar>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 600, color: '#f4f4f4' }}>{user.fullName}</Typography>
                  <Typography sx={{ fontSize: 10, color: '#8d8d8d', textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</Typography>
                </Box>
                <IconButton size="small" onClick={logout} sx={{ color: '#8d8d8d' }}>
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        </Drawer>

        {/* ── Main area ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <AppBar
            position="static" elevation={0}
            sx={{ bgcolor: appBarBg, borderBottom: `1px solid ${appBarBorder}`, color: 'text.primary', zIndex: 1 }}
          >
            <Toolbar variant="dense" sx={{ minHeight: 56, gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15 }}>{currentModule}</Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
                <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
                  {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton size="small" onClick={() => setNotifOpen(true)}>
                  <Badge badgeContent={unreadCount || undefined} color="error" max={99}>
                    <NotificationsNoneIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Ask Ignite AI">
                <IconButton
                  size="small"
                  onClick={() => setIgniteOpen(true)}
                  sx={{ bgcolor: '#eff4ff', color: '#0f62fe', '&:hover': { bgcolor: '#d0e2ff' } }}
                >
                  <AutoAwesomeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          {/* Page content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* ── Ignite AI Drawer ── */}
      <IgniteDrawer open={igniteOpen} onClose={() => setIgniteOpen(false)} moduleContext={currentModule} />

      {/* ── Notification Center ── */}
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
    </Box>
  );
}
