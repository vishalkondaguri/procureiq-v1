import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f4f4', gap: 2,
      }}
    >
      <CircularProgress size={36} sx={{ color: '#0f62fe' }} />
      <Typography variant="body2" color="text.secondary">Loading ProcureIQ…</Typography>
    </Box>
  );
}
