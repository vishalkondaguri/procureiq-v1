import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ProcureIQ ErrorBoundary]', error, info);
    this.setState({ info: info.componentStack ?? '' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 320, gap: 2,
          bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1,
          p: 4, textAlign: 'center',
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 48, color: '#da1e28' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#161616' }}>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {this.state.error?.message ?? 'An unexpected error occurred in this component.'}
        </Typography>
        {import.meta.env.DEV && this.state.info && (
          <Box
            component="pre"
            sx={{
              bgcolor: '#f4f4f4', borderRadius: 1, p: 1.5,
              fontSize: 10, color: '#525252', maxWidth: 600,
              overflow: 'auto', textAlign: 'left', maxHeight: 120,
            }}
          >
            {this.state.info.trim().slice(0, 800)}
          </Box>
        )}
        <Button
          variant="outlined" startIcon={<RefreshIcon />}
          onClick={this.handleReset}
          sx={{ mt: 1 }}
        >
          Try again
        </Button>
      </Box>
    );
  }
}
