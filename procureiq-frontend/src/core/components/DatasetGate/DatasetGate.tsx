/**
 * DatasetGate — wraps any module page.
 * When no dataset has been uploaded for this tenant, renders a full-width
 * upload-prompt instead of the module content.
 */
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Stack,
} from '@mui/material';
import UploadFileIcon    from '@mui/icons-material/UploadFile';
import StorageIcon       from '@mui/icons-material/Storage';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { useDatasetStatus } from '@/core/hooks/useDatasetStatus';

interface Props {
  children: ReactNode;
  /** Override module name shown in the prompt */
  moduleName?: string;
}

const SHEET_LABELS: Record<string, string> = {
  spend:     'Spend Transactions',
  suppliers: 'Supplier Master',
  contracts: 'Contracts',
  risk:      'Risk Scores',
  savings:   'Savings Pipeline',
  forecast:  'Spend Forecast',
};

export default function DatasetGate({ children, moduleName }: Props) {
  const navigate = useNavigate();
  const { data: status, isLoading } = useDatasetStatus();

  // While loading, render children (avoids flash of upload prompt)
  if (isLoading) return <>{children}</>;

  // If dataset is present, just render the module normally
  if (status?.has_dataset) return <>{children}</>;

  // ── No dataset — render upload gate ──────────────────────────────────────
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 420, py: 6,
      bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1,
    }}>
      <Box sx={{
        width: 72, height: 72, borderRadius: '50%',
        bgcolor: '#eff4ff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', mb: 3,
      }}>
        <StorageIcon sx={{ fontSize: 36, color: '#0f62fe' }} />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#161616', textAlign: 'center' }}>
        No procurement dataset uploaded
      </Typography>

      <Typography sx={{ color: '#525252', mb: 3, maxWidth: 480, textAlign: 'center', fontSize: 14, lineHeight: 1.7 }}>
        {moduleName
          ? `The ${moduleName} module requires a procurement dataset. `
          : 'This module requires a procurement dataset. '}
        Upload an Excel workbook (.xlsx) containing your spend data to enable all
        analytics, insights, and AI recommendations.
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<UploadFileIcon />}
        onClick={() => navigate('/app/data-engine')}
        sx={{ fontWeight: 700, mb: 3, px: 4 }}
      >
        Upload Procurement Dataset
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: 12, color: '#8d8d8d', mb: 1 }}>
          Supported sheet types in your workbook:
        </Typography>
        <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" useFlexGap>
          {Object.entries(SHEET_LABELS).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              size="small"
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#8d8d8d !important' }} />}
              sx={{ bgcolor: '#f4f4f4', fontSize: 11, color: '#525252', mb: 0.5 }}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
