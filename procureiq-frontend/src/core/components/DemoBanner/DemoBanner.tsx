/**
 * DemoBanner — shown on every module page when no real dataset is uploaded.
 * A sticky top banner with a dismiss-able "Demo Preview" label and an upload CTA.
 * The module content (demo data) renders normally behind it.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Chip, IconButton } from '@mui/material';
import UploadFileIcon  from '@mui/icons-material/UploadFile';
import CloseIcon       from '@mui/icons-material/Close';
import ScienceIcon     from '@mui/icons-material/Science';

interface Props {
  filename?: string | null;
}

export default function DemoBanner({ filename }: Props) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      bgcolor: '#001d6c', px: 2.5, py: 1.25, mb: 2, borderRadius: 1,
      flexWrap: 'wrap',
    }}>
      <ScienceIcon sx={{ color: '#78a9ff', fontSize: 18, flexShrink: 0 }} />
      <Chip
        label="DEMO PREVIEW"
        size="small"
        sx={{
          bgcolor: '#f1c21b', color: '#161616',
          fontWeight: 800, fontSize: 10, height: 18, letterSpacing: 0.5,
        }}
      />
      <Typography sx={{ color: '#c6e2ff', fontSize: 13, flex: 1, minWidth: 200 }}>
        {filename
          ? <>Viewing data from <strong style={{ color: '#fff' }}>{filename}</strong></>
          : <>Illustrative procurement data for demonstration. Not your organisation's data.</>
        }
        {' '}Upload your own Excel workbook to replace these visuals.
      </Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
        onClick={() => navigate('/app/data-engine')}
        sx={{
          bgcolor: '#0f62fe', '&:hover': { bgcolor: '#0353e9' },
          fontWeight: 700, fontSize: 12, py: 0.5, px: 1.5, flexShrink: 0,
        }}
      >
        Upload Dataset
      </Button>
      <IconButton
        size="small"
        onClick={() => setDismissed(true)}
        sx={{ color: '#78a9ff', p: 0.5, flexShrink: 0 }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}
