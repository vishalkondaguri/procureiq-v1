import { useState, useMemo } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, TextField, InputAdornment, Toolbar,
  Typography, Tooltip, IconButton, Chip, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
// import FilterListIcon from '@mui/icons-material/FilterList';

export interface Column<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends Record<string, unknown>> {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  rowKey: keyof T;
  actions?: React.ReactNode;
  onExport?: () => void;
  stickyHeader?: boolean;
  maxHeight?: number | string;
}

type Order = 'asc' | 'desc';

export default function DataTable<T extends Record<string, unknown>>({
  title, columns, rows, total, page = 0, pageSize = 50,
  onPageChange, onPageSizeChange, loading, onSearch, searchPlaceholder = 'Search…',
  rowKey, actions, onExport, stickyHeader = true, maxHeight = 520,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder]     = useState<Order>('asc');
  const [localSearch, setLocalSearch] = useState('');

  const handleSort = (col: string) => {
    setOrder(prev => (orderBy === col && prev === 'asc') ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const sorted = useMemo(() => {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
      const av = a[orderBy] ?? '';
      const bv = b[orderBy] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return order === 'asc' ? cmp : -cmp;
    });
  }, [rows, orderBy, order]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearch?.(e.target.value);
  };

  const exportCSV = () => {
    const headers = columns.map(c => c.label).join(',');
    const csvRows = sorted.map(r => columns.map(c => JSON.stringify(r[c.id as keyof T] ?? '')).join(','));
    const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title ?? 'export'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Toolbar disableGutters sx={{ mb: 1, gap: 1, flexWrap: 'wrap' }}>
        {title && <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14, mr: 1 }}>{title}</Typography>}
        {total !== undefined && (
          <Chip label={`${total.toLocaleString()} records`} size="small"
            sx={{ bgcolor: '#f0f0f0', color: '#525252', fontWeight: 600, fontSize: 11 }} />
        )}
        <Box sx={{ flex: 1 }} />
        {onSearch !== undefined && (
          <TextField
            size="small" placeholder={searchPlaceholder} value={localSearch}
            onChange={handleSearchChange}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { height: 34 } }}
          />
        )}
        {actions}
        <Tooltip title="Export CSV">
          <IconButton size="small" onClick={onExport ?? exportCSV} sx={{ border: '1px solid #e0e0e0' }}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>

      <TableContainer sx={{ maxHeight, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Table stickyHeader={stickyHeader} size="small">
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell
                  key={String(col.id)}
                  align={col.align ?? 'left'}
                  style={{ minWidth: col.minWidth }}
                  sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: '#525252', bgcolor: '#f4f4f4',
                        whiteSpace: 'nowrap' }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(String(col.id))}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map(c => (
                      <TableCell key={String(c.id)}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map(row => (
                  <TableRow
                    key={String(row[rowKey])}
                    hover
                    sx={{ '&:hover': { bgcolor: '#f0f4ff' }, cursor: 'default' }}
                  >
                    {columns.map(col => (
                      <TableCell
                        key={String(col.id)}
                        align={col.align ?? 'left'}
                        sx={{ fontSize: 13, py: 1 }}
                      >
                        {col.format
                          ? col.format(row[col.id as keyof T], row)
                          : String(row[col.id as keyof T] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
            }
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <TablePagination
          component="div"
          count={total ?? rows.length}
          page={page}
          rowsPerPage={pageSize}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={e => onPageSizeChange?.(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ borderTop: '1px solid #e0e0e0', '& .MuiToolbar-root': { minHeight: 44 } }}
        />
      )}
    </Box>
  );
}
