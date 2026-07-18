/**
 * Payment Analytics — Enterprise Payment Intelligence Dashboard
 * Tracks invoice aging, payment terms, PO-to-payment cycles,
 * and supplier payment performance from spend transaction data.
 */
import {
  Grid, Box, Typography, Skeleton, Chip, useTheme,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie,
} from 'recharts';
import PaymentsIcon        from '@mui/icons-material/Payments';
import ReceiptLongIcon     from '@mui/icons-material/ReceiptLong';
import AccessTimeIcon      from '@mui/icons-material/AccessTime';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import { useQuery } from '@tanstack/react-query';
import KPICard             from '@/core/components/KPICard/KPICard';
import DataTable, { Column } from '@/core/components/DataTable/DataTable';
import ExecutiveSummary    from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import DataSourceBadge     from '@/core/components/DataSourceBadge';
import DatasetGate         from '@/core/components/DatasetGate/DatasetGate';
import { apiClient } from '@/core/api/client';
import { formatCurrency } from '@/core/utils/format';

// ── IBM Palette ───────────────────────────────────────────────────────────────
const IBM = {
  blue:   '#0f62fe',
  purple: '#6929c4',
  teal:   '#007d79',
  green:  '#198038',
  yellow: '#f1c21b',
  red:    '#da1e28',
  orange: '#ff832b',
};

const AGING_COLORS: Record<string, string> = {
  '0-30':   IBM.green,
  '31-60':  IBM.yellow,
  '61-90':  IBM.orange,
  '91-180': IBM.red,
  '180+':   '#9f1853',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface PaymentSummary {
  kpis: {
    total_invoices: number;
    total_invoiced_amount: number;
    avg_invoice_value: number;
    avg_po_to_invoice_days: number;
    unique_payment_terms: number;
  };
  payment_terms_breakdown: Array<{
    terms: string; count: number; amount: number; percent: number;
  }>;
  monthly_trend: Array<{
    month: string; invoice_count: number; amount: number;
  }>;
  top_suppliers: Array<{
    supplier_name: string; invoice_count: number; total_paid: number;
    avg_invoice: number; payment_terms: string;
  }>;
}

interface AgingData {
  aging_buckets: Array<{ bucket: string; amount: number; count: number }>;
  aged_invoices: Array<{
    invoice_number: string; supplier_name: string; invoice_date: string;
    age_days: number; amount: number; payment_terms: string; bucket: string;
  }>;
  total_aged_amount: number;
  overdue_count: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function usePaymentSummary() {
  return useQuery<PaymentSummary>({
    queryKey: ['payment-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentSummary>('/payments/summary');
      return data;
    },
    staleTime: 60_000,
  });
}

function useInvoiceAging() {
  return useQuery<AgingData>({
    queryKey: ['invoice-aging'],
    queryFn: async () => {
      const { data } = await apiClient.get<AgingData>('/payments/aging');
      return data;
    },
    staleTime: 60_000,
  });
}

// ── Aged Invoice Table Columns ─────────────────────────────────────────────────
const AGED_COLS: Column<Record<string, unknown>>[] = [
  { id: 'invoice_number',  label: 'Invoice #',    minWidth: 130 },
  { id: 'supplier_name',   label: 'Supplier',      minWidth: 180 },
  { id: 'invoice_date',    label: 'Invoice Date',  minWidth: 120 },
  { id: 'age_days',        label: 'Age (Days)',    minWidth: 100, align: 'center',
    format: v => {
      const d = Number(v);
      const color = d > 180 ? IBM.red : d > 90 ? IBM.orange : IBM.yellow;
      return <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{d}d</Typography>;
    },
  },
  { id: 'amount',          label: 'Amount',        minWidth: 140, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'payment_terms',   label: 'Terms',         minWidth: 120 },
  { id: 'bucket',          label: 'Bucket',        minWidth: 90, align: 'center',
    format: v => <Chip label={String(v)} size="small" sx={{ fontSize: 10, height: 18, bgcolor: AGING_COLORS[String(v)] || IBM.blue, color: '#fff', fontWeight: 700 }} />,
  },
];

const SUPPLIER_COLS: Column<Record<string, unknown>>[] = [
  { id: 'supplier_name',  label: 'Supplier',         minWidth: 200 },
  { id: 'invoice_count',  label: 'Invoices',         minWidth: 90,  align: 'center' },
  { id: 'total_paid',     label: 'Total Paid',       minWidth: 150, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'avg_invoice',    label: 'Avg Invoice',      minWidth: 130, align: 'right',
    format: v => formatCurrency(Number(v)) },
  { id: 'payment_terms',  label: 'Payment Terms',    minWidth: 130 },
];

// ── Widget Card ───────────────────────────────────────────────────────────────
function WidgetCard({ title, children, loading, icon }: {
  title: string; children: React.ReactNode; loading?: boolean; icon?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1, p: 2.5, height: '100%',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon && <Box sx={{ color: IBM.blue }}>{icon}</Box>}
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
      </Box>
      {loading ? <Skeleton variant="rectangular" height={200} /> : children}
    </Box>
  );
}

// ── Y-Axis formatter ──────────────────────────────────────────────────────────
function formatYAxis(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Payment Terms Donut ───────────────────────────────────────────────────────
function TermsDonut({ data }: { data: PaymentSummary['payment_terms_breakdown'] }) {
  const COLORS = [IBM.blue, IBM.purple, IBM.teal, IBM.green, IBM.orange, IBM.red];
  const top = data.slice(0, 6);
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <PieChart width={130} height={130}>
        <Pie data={top} cx={60} cy={60} innerRadius={35} outerRadius={55}
          dataKey="count" paddingAngle={2}>
          {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
      </PieChart>
      <Box sx={{ flex: 1 }}>
        {top.map((t, i) => (
          <Box key={t.terms} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length], flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: 11, flex: 1 }}>{t.terms}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{t.percent.toFixed(1)}%</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Aging Bar Chart ───────────────────────────────────────────────────────────
function AgingBarChart({ buckets }: { buckets: AgingData['aging_buckets'] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={buckets} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={56} />
        <RTooltip formatter={(v: number, name: string) => [
          name === 'amount' ? formatCurrency(v) : v.toString(),
          name === 'amount' ? 'Amount' : 'Count'
        ]} contentStyle={{ fontSize: 11, borderRadius: 4 }} />
        <Bar dataKey="amount" name="amount" radius={[3, 3, 0, 0]}>
          {buckets.map((b) => <Cell key={b.bucket} fill={AGING_COLORS[b.bucket] || IBM.blue} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Monthly Invoice Trend ─────────────────────────────────────────────────────
function MonthlyTrendChart({ data }: { data: PaymentSummary['monthly_trend'] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={52} />
        <RTooltip
          formatter={(v: number, name: string) => [
            name === 'amount' ? formatCurrency(v) : v.toString(),
            name === 'amount' ? 'Invoice Amount' : 'Invoice Count'
          ]}
          contentStyle={{ fontSize: 11, borderRadius: 4 }}
        />
        <Line type="monotone" dataKey="amount" stroke={IBM.blue} strokeWidth={2}
          dot={{ r: 3, fill: IBM.blue }} activeDot={{ r: 5 }} name="amount" />
        <Line type="monotone" dataKey="invoice_count" stroke={IBM.purple} strokeWidth={2}
          dot={{ r: 3, fill: IBM.purple }} activeDot={{ r: 5 }} yAxisId={1} name="count" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentAnalyticsPage() {
  const summaryQ = usePaymentSummary();
  const agingQ   = useInvoiceAging();

  const summary = summaryQ.data;
  const aging   = agingQ.data;
  const theme   = useTheme();

  const summaryText = summary
    ? `${summary.kpis.total_invoices.toLocaleString()} invoices totalling ${formatCurrency(summary.kpis.total_invoiced_amount)}. Average invoice value is ${formatCurrency(summary.kpis.avg_invoice_value)}. Average PO-to-invoice cycle is ${summary.kpis.avg_po_to_invoice_days} days. ${aging?.overdue_count ? `${aging.overdue_count} invoices aged beyond 60 days require attention.` : 'All invoices are within normal aging parameters.'}`
    : 'Loading payment analytics…';

  return (
    <DatasetGate moduleName="Payment Analytics">
      <ExecutiveSummary
        title="Payment Intelligence Briefing"
        summary={summaryText}
        highlights={summary ? [
          `${summary.kpis.total_invoices.toLocaleString()} total invoices`,
          `Avg invoice: ${formatCurrency(summary.kpis.avg_invoice_value)}`,
          `${summary.kpis.avg_po_to_invoice_days}d avg PO-to-invoice cycle`,
          `${summary.kpis.unique_payment_terms} payment terms in use`,
        ] : []}
        isLoading={summaryQ.isLoading}
      />

      {/* KPI Ribbon */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Invoices',       value: summary ? summary.kpis.total_invoices.toLocaleString() : '—',      accentColor: IBM.blue, icon: <ReceiptLongIcon /> },
          { title: 'Total Invoiced',        value: summary ? formatCurrency(summary.kpis.total_invoiced_amount) : '—', accentColor: IBM.purple },
          { title: 'Avg Invoice Value',    value: summary ? formatCurrency(summary.kpis.avg_invoice_value) : '—',     accentColor: IBM.teal },
          { title: 'Avg PO→Invoice Days',  value: summary ? `${summary.kpis.avg_po_to_invoice_days}d` : '—',          accentColor: IBM.orange },
          { title: 'Payment Terms Used',   value: summary ? summary.kpis.unique_payment_terms.toString() : '—',       accentColor: IBM.green },
          { title: 'Aged >60d (Count)',    value: aging ? aging.overdue_count.toLocaleString() : '—',                 accentColor: aging && aging.overdue_count > 0 ? IBM.red : IBM.green },
          { title: 'Aged >60d (Amount)',   value: aging ? formatCurrency(aging.total_aged_amount) : '—',              accentColor: IBM.red },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={3} lg={12/7} key={kpi.title}>
            <KPICard loading={summaryQ.isLoading} {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1: Monthly Trend + Payment Terms + Aging */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <WidgetCard title="Monthly Invoice Trend" loading={summaryQ.isLoading} icon={<PaymentsIcon sx={{ fontSize: 16 }} />}>
            {summary && <MonthlyTrendChart data={summary.monthly_trend} />}
            <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
              <DataSourceBadge source="spend_transactions" recordCount={summary?.kpis.total_invoices} confidence={98} />
            </Box>
          </WidgetCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <WidgetCard title="Payment Terms Distribution" loading={summaryQ.isLoading} icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}>
            {summary && <TermsDonut data={summary.payment_terms_breakdown} />}
          </WidgetCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <WidgetCard title="Invoice Aging Buckets" loading={agingQ.isLoading} icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}>
            {aging && <AgingBarChart buckets={aging.aging_buckets} />}
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {aging?.aging_buckets.map(b => (
                <Box key={b.bucket} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: AGING_COLORS[b.bucket] || IBM.blue }} />
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{b.bucket}: {b.count}</Typography>
                </Box>
              ))}
            </Box>
          </WidgetCard>
        </Grid>
      </Grid>

      {/* Aged Invoices Table */}
      {aging && aging.aged_invoices.length > 0 && (
        <Box sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningAmberIcon sx={{ fontSize: 16, color: IBM.orange }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              Aged Invoices Requiring Attention
            </Typography>
            <Chip
              label={`${aging.overdue_count} overdue`}
              size="small"
              sx={{ bgcolor: IBM.red, color: '#fff', fontSize: 10, height: 20, fontWeight: 700 }}
            />
          </Box>
          <DataTable
            columns={AGED_COLS}
            rows={aging.aged_invoices as unknown as Record<string, unknown>[]}
            rowKey="invoice_number"
            onSearch={() => {}}
            searchPlaceholder="Search aged invoices…"
            maxHeight={380}
            loading={agingQ.isLoading}
          />
        </Box>
      )}

      {/* Top Suppliers by Payment Volume */}
      <Box sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 2.5 }}>
        <DataTable
          title="Suppliers by Payment Volume"
          columns={SUPPLIER_COLS}
          rows={(summary?.top_suppliers ?? []) as unknown as Record<string, unknown>[]}
          rowKey="supplier_name"
          onSearch={() => {}}
          searchPlaceholder="Search suppliers…"
          maxHeight={380}
          loading={summaryQ.isLoading}
        />
        <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
          <DataSourceBadge source="spend_transactions · suppliers" recordCount={summary?.top_suppliers.length} confidence={95} />
        </Box>
      </Box>
    </DatasetGate>
  );
}
