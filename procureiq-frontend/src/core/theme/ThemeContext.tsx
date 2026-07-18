/**
 * ThemeContext — provides dark/light mode toggle across the application.
 * Persists preference to localStorage.
 */
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

type Mode = 'light' | 'dark';

interface ThemeCtx {
  mode: Mode;
  toggleTheme: () => void;
}

const Ctx = createContext<ThemeCtx>({ mode: 'light', toggleTheme: () => {} });

export function useThemeMode() {
  return useContext(Ctx);
}

function buildTheme(mode: Mode) {
  const isLight = mode === 'light';
  return createTheme({
    palette: {
      mode,
      primary:    { main: '#0f62fe', dark: '#0043ce', light: '#4589ff', contrastText: '#fff' },
      secondary:  { main: '#6929c4', dark: '#491d8b', light: '#8a3ffc', contrastText: '#fff' },
      error:      { main: '#da1e28' },
      warning:    { main: '#f1c21b' },
      success:    { main: '#198038' },
      info:       { main: '#0072c3' },
      background: {
        default: isLight ? '#f4f4f4' : '#161616',
        paper:   isLight ? '#ffffff' : '#262626',
      },
      text: {
        primary:   isLight ? '#161616' : '#f4f4f4',
        secondary: isLight ? '#525252' : '#a8a8a8',
      },
      divider: isLight ? '#e0e0e0' : '#393939',
    },
    typography: {
      fontFamily: '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
      h1: { fontSize: '2rem',    fontWeight: 600, letterSpacing: '-0.5px' },
      h2: { fontSize: '1.5rem',  fontWeight: 600, letterSpacing: '-0.3px' },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1.125rem',fontWeight: 600 },
      h5: { fontSize: '1rem',    fontWeight: 600 },
      h6: { fontSize: '0.875rem',fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem',  lineHeight: 1.5 },
      caption: { fontSize: '0.75rem' },
    },
    shape: { borderRadius: 4 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${isLight ? '#e0e0e0' : '#393939'}`,
            boxShadow: 'none',
            borderRadius: 4,
            backgroundColor: isLight ? '#ffffff' : '#262626',
          },
        },
      },
      MuiButton: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 4 } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isLight ? '#525252' : '#a8a8a8',
              background: isLight ? '#f4f4f4' : '#1c1c1c',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 4, fontWeight: 600, fontSize: '0.75rem' } },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isLight ? '#161616' : '#0f0f0f',
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const stored = (localStorage.getItem('piq-theme') as Mode) || 'light';
  const [mode, setMode] = useState<Mode>(stored);

  useEffect(() => {
    localStorage.setItem('piq-theme', mode);
  }, [mode]);

  const toggleTheme = () => setMode(m => (m === 'light' ? 'dark' : 'light'));
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <Ctx.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </Ctx.Provider>
  );
}
