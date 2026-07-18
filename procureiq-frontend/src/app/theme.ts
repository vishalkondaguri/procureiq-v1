import { createTheme } from '@mui/material/styles';

/**
 * IBM-aligned Material UI theme for ProcureIQ.
 * Primary accent: IBM Blue (#0f62fe)
 * Neutral surface: #f4f4f4 (IBM Cool Gray 10)
 */
export const procureIQTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f62fe',       // IBM Blue 60
      dark: '#0043ce',       // IBM Blue 70
      light: '#4589ff',      // IBM Blue 50
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6929c4',       // IBM Purple 60
      dark: '#491d8b',
      light: '#8a3ffc',
      contrastText: '#ffffff',
    },
    error: { main: '#da1e28' },    // IBM Red 60
    warning: { main: '#f1c21b' },  // IBM Yellow 30
    success: { main: '#198038' },  // IBM Green 60
    info: { main: '#0072c3' },     // IBM Cyan 60
    background: {
      default: '#f4f4f4',    // IBM Cool Gray 10
      paper: '#ffffff',
    },
    text: {
      primary: '#161616',    // IBM Cool Gray 100
      secondary: '#525252',  // IBM Cool Gray 70
    },
    divider: '#e0e0e0',      // IBM Cool Gray 20
  },
  typography: {
    fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.5px' },
    h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.3px' },
    h3: { fontSize: '1.25rem', fontWeight: 600 },
    h4: { fontSize: '1.125rem', fontWeight: 600 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', color: '#525252' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #e0e0e0', boxShadow: 'none', borderRadius: 4 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 4 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#525252', background: '#f4f4f4' } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 4, fontWeight: 600, fontSize: '0.75rem' } },
    },
  },
});
