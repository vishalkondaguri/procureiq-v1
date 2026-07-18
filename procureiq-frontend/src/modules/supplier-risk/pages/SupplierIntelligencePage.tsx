/**
 * Supplier Intelligence & Due Diligence Module
 * Live public-source intelligence: company profile, market data, AI risk scores, news
 */
import { useState, useCallback } from 'react';
import {
  Box, Grid, Typography, TextField, Button, Chip, CircularProgress,
  Divider, Alert, Link, LinearProgress,
  Avatar, Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import SearchIcon         from '@mui/icons-material/Search';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon   from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import BusinessIcon       from '@mui/icons-material/Business';
import ArticleIcon        from '@mui/icons-material/Article';
import ShieldIcon         from '@mui/icons-material/Shield';
import AutoAwesomeIcon    from '@mui/icons-material/AutoAwesome';
import PeopleIcon         from '@mui/icons-material/People';
import PublicIcon         from '@mui/icons-material/Public';
import LanguageIcon       from '@mui/icons-material/Language';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';
import { apiClient } from '@/core/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntelligenceData {
  supplier_name: string;
  ticker_used: string | null;
  retrieved_at: string;
  data_sources: { name: string; type: string; url: string; retrieved: string }[];
  company: {
    name: string; industry: string; sector: string; website: string;
    headquarters: string; country: string; employees: number | null;
    ceo: string; exchange: string; description: string;
    logo: string | null; wiki_url: string | null; is_public: boolean;
  };
  market: {
    _available: boolean; price: number | null; currency: string;
    prev_close: number | null; change: number | null; change_pct: number | null;
    '52w_high': number | null; '52w_low': number | null;
    market_cap: number | null; pe_ratio: number | null; eps: number | null;
    dividend_yield: number | null; revenue: number | null;
    gross_margin: number | null; profit_margin: number | null;
    debt_to_equity: number | null; current_ratio: number | null;
    free_cashflow: number | null;
    price_history: { month: string; price: number }[];
  };
  country_risk: {
    _available: boolean; country: string; score: number; level: string; notes: string;
  };
  risk_assessment: {
    composite_score: number; composite_level: string;
    procurement_recommendation: string;
    dimensions: Record<string, { score: number; level: string; explanation: string; data_available: boolean }>;
    _source: string; _retrieved: string;
  };
  esg: {
    _available: boolean; total_esg_score: number | null;
    environmental_score: number | null; social_score: number | null;
    governance_score: number | null; interpretation: string; _source: string;
  };
  news: {
    headline: string; source: string; date: string;
    url: string; summary: string; ai_impact: string;
  }[];
  ai_summary: string;
}

const NA = 'Information not available from public sources.';

// ── Colour helpers ─────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  low: '#198038', medium: '#f1c21b', high: '#ff832b', critical: '#da1e28',
};
const RISK_BG: Record<string, string> = {
  low: '#defbe6', medium: '#fdf6dd', high: '#fff2e8', critical: '#fff1f1',
};
const IMPACT_COLOR: Record<string, string> = {
  'Critical': '#da1e28', 'High': '#ff832b', 'Medium': '#f1c21b',
  'Low': '#525252', 'Positive': '#198038',
};

function fmt_currency(v: number | null | undefined, compact = true): string {
  if (!v) return NA;
  if (compact) {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  }
  return `$${v.toLocaleString()}`;
}

function fmt_pct(v: number | null | undefined): string {
  if (v == null) return NA;
  return `${(v * 100).toFixed(1)}%`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const icons: Record<string, React.ReactNode> = {
    low: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    medium: <WarningAmberIcon sx={{ fontSize: 14 }} />,
    high: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
    critical: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
  };
  return (
    <Chip
      label={level.toUpperCase()}
      size="small"
      icon={icons[level] as any}
      sx={{
        bgcolor: RISK_BG[level] || '#f4f4f4',
        color: RISK_COLOR[level] || '#161616',
        fontWeight: 800, fontSize: 10, height: 20,
        '& .MuiChip-icon': { color: RISK_COLOR[level] },
      }}
    />
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score < 3 ? '#198038' : score < 5.5 ? '#f1c21b' : score < 7.5 ? '#ff832b' : '#da1e28';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#e0e0e0', borderRadius: 3 }}>
        <Box sx={{ width: `${pct}%`, height: 6, bgcolor: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>
        {score.toFixed(1)}
      </Typography>
    </Box>
  );
}

function DataSourceFooter({ sources }: { sources: IntelligenceData['data_sources'] }) {
  return (
    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mb: 0.5 }}>Sources:</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {sources.map((s, i) => (
          <Chip key={i} label={s.name} size="small"
            sx={{ fontSize: 10, height: 16, bgcolor: '#f4f4f4', color: '#525252' }} />
        ))}
      </Box>
    </Box>
  );
}

// ── Suggestion chips ───────────────────────────────────────────────────────────
const SUGGESTIONS = ['IBM', 'Microsoft', 'Infosys', 'Accenture', 'Oracle', 'SAP', 'Cisco', 'Wipro'];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupplierIntelligencePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const { data: result } = await apiClient.get<IntelligenceData>('/intelligence/search', {
        params: { q: name.trim() },
        timeout: 35_000,
      });
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Intelligence fetch failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => search(query);
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <Box>
      <ExecutiveSummary
        title="Supplier Intelligence & Due Diligence"
        summary="Search any supplier by name to retrieve live public intelligence: company profile, market data, AI risk assessment, ESG scores, and recent news — all from verified public sources. Never fabricated."
        highlights={['Live Public Data', 'Yahoo Finance', 'AI Risk Scoring', 'News Intelligence', 'ESG Analysis']}
      />

      {/* ── Search Bar ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#001d6c', borderRadius: 1, p: 3, mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#fff', mb: 0.75 }}>
          Search Supplier Intelligence
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#a8c7fa', mb: 2 }}>
          Enter any supplier name to retrieve live public data from Yahoo Finance, news sources, and public registries.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. IBM, Infosys, Microsoft, Oracle…"
            size="small"
            sx={{
              flex: 1, minWidth: 280,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff', borderRadius: 1,
                '& fieldset': { borderColor: 'transparent' },
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            sx={{ bgcolor: '#0f62fe', fontWeight: 700, px: 3, '&:hover': { bgcolor: '#0353e9' } }}
          >
            {loading ? 'Fetching…' : 'Search'}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, color: '#78a9ff' }}>Quick search:</Typography>
          {SUGGESTIONS.map(s => (
            <Chip key={s} label={s} size="small"
              onClick={() => { setQuery(s); search(s); }}
              sx={{ cursor: 'pointer', bgcolor: 'rgba(255,255,255,0.12)', color: '#c6e2ff',
                   fontSize: 11, height: 22, '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
            />
          ))}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              Retrieving live intelligence from public sources…
            </Typography>
          </Box>
          <LinearProgress sx={{ borderRadius: 1, mb: 1 }} />
          <Typography sx={{ fontSize: 12, color: '#525252' }}>
            Fetching: Yahoo Finance · Wikipedia · Google News · Country Risk Data
          </Typography>
        </Box>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {data && !loading && <IntelligenceResults data={data} />}

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 48, color: '#c6c6c6', mb: 1.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#525252', mb: 0.5 }}>
            Search for a supplier above
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#8d8d8d', maxWidth: 400, mx: 'auto' }}>
            Enter any supplier name to retrieve live public intelligence. Data is sourced from Yahoo Finance,
            Wikipedia, Google News, and public risk indices — never fabricated.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Results Component ──────────────────────────────────────────────────────────

function IntelligenceResults({ data }: { data: IntelligenceData }) {
  const { company, market, risk_assessment: risk, esg, news, country_risk } = data;

  return (
    <Box>
      {/* Retrieved timestamp + sources */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <InfoOutlinedIcon sx={{ fontSize: 14, color: '#525252' }} />
        <Typography sx={{ fontSize: 12, color: '#525252' }}>
          Data retrieved: {new Date(data.retrieved_at).toLocaleString()} ·
          Sources: {data.data_sources.map(s => s.name).join(', ')}
        </Typography>
      </Box>

      {/* ── Row 1: Company Profile + Market Data ─────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Company Profile Card */}
        <Grid item xs={12} md={7}>
          <CompanyProfileCard company={company} risk={risk} />
        </Grid>
        {/* Market Data Card */}
        <Grid item xs={12} md={5}>
          {market._available
            ? <MarketDataCard market={market} currency={market.currency} />
            : (
              <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%',
                         display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <BusinessIcon sx={{ fontSize: 36, color: '#c6c6c6', mb: 1 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#525252', mb: 0.5 }}>
                  Market Data Unavailable
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#8d8d8d', textAlign: 'center' }}>
                  {company.is_public ? 'Ticker not found' : 'Privately held company — no public market data'}
                </Typography>
              </Box>
            )
          }
        </Grid>
      </Grid>

      {/* ── Row 2: AI Risk Assessment ─────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <RiskAssessmentPanel risk={risk} countryRisk={country_risk} />
      </Box>

      {/* ── Row 3: Price History + Financial Highlights ────────────────────── */}
      {market._available && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={7}>
            <PriceHistoryChart history={market.price_history} currency={market.currency} />
          </Grid>
          <Grid item xs={12} md={5}>
            <FinancialHighlights market={market} />
          </Grid>
        </Grid>
      )}

      {/* ── Row 4: ESG + Country Risk ─────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <ESGPanel esg={esg} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CountryRiskPanel countryRisk={country_risk} />
        </Grid>
      </Grid>

      {/* ── Row 5: AI Summary ─────────────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <AISummaryPanel summary={data.ai_summary} recommendation={risk.procurement_recommendation} sources={data.data_sources} />
      </Box>

      {/* ── Row 6: News Intelligence ──────────────────────────────────────── */}
      <Box sx={{ mb: 2 }}>
        <NewsPanel news={news} supplierName={company.name} />
      </Box>
    </Box>
  );
}

// ── Company Profile ────────────────────────────────────────────────────────────

function CompanyProfileCard({ company, risk }: {
  company: IntelligenceData['company'];
  risk: IntelligenceData['risk_assessment'];
}) {
  const composite = risk.composite_score;
  const level = risk.composite_level;

  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <Avatar
          sx={{ width: 56, height: 56, bgcolor: '#eff4ff', color: '#0f62fe', fontSize: 22, fontWeight: 700, flexShrink: 0 }}
        >
          {company.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {company.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#525252', mb: 0.5 }}>
            {company.industry !== NA ? company.industry : ''}{company.sector && company.sector !== company.industry ? ` · ${company.sector}` : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <RiskBadge level={level} />
            <Chip label={`Risk: ${composite}/10`} size="small"
              sx={{ bgcolor: RISK_BG[level], color: RISK_COLOR[level], fontWeight: 700, fontSize: 10, height: 20 }} />
            {company.is_public && (
              <Chip label="Listed" size="small"
                sx={{ bgcolor: '#eff4ff', color: '#0f62fe', fontSize: 10, height: 20 }} />
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
        {[
          { icon: <PublicIcon sx={{ fontSize: 14 }} />, label: 'Country', value: company.country },
          { icon: <PeopleIcon sx={{ fontSize: 14 }} />, label: 'Employees', value: company.employees ? company.employees.toLocaleString() : NA },
          { icon: <BusinessIcon sx={{ fontSize: 14 }} />, label: 'Headquarters', value: company.headquarters },
          { icon: <BusinessIcon sx={{ fontSize: 14 }} />, label: 'CEO', value: company.ceo },
        ].map(row => (
          <Box key={row.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
            <Box sx={{ color: '#525252', mt: 0.2, flexShrink: 0 }}>{row.icon}</Box>
            <Box>
              <Typography sx={{ fontSize: 10, color: '#8d8d8d', lineHeight: 1 }}>{row.label}</Typography>
              <Typography sx={{ fontSize: 12, color: '#161616', fontWeight: 500, lineHeight: 1.4 }}
                noWrap title={row.value}>{row.value || NA}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {company.description && company.description !== NA && (
        <Typography sx={{ fontSize: 12, color: '#525252', lineHeight: 1.6, mb: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {company.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        {company.website !== NA && (
          <Chip
            icon={<LanguageIcon sx={{ fontSize: 13 }} />}
            label="Website"
            size="small"
            component={Link}
            href={company.website}
            target="_blank"
            clickable
            sx={{ fontSize: 11, height: 22 }}
          />
        )}
        {company.wiki_url && (
          <Chip
            icon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
            label="Wikipedia"
            size="small"
            component={Link}
            href={company.wiki_url}
            target="_blank"
            clickable
            sx={{ fontSize: 11, height: 22, bgcolor: '#f4f4f4' }}
          />
        )}
      </Box>
    </Box>
  );
}

// ── Market Data ────────────────────────────────────────────────────────────────

function MarketDataCard({ market, currency }: { market: IntelligenceData['market']; currency: string }) {
  const priceUp = (market.change ?? 0) >= 0;
  const mkt = market as any; // allows dynamic 52w keys
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Market Data</Typography>
        <Chip label="Live" size="small" sx={{ bgcolor: '#defbe6', color: '#198038', fontSize: 10, height: 18, fontWeight: 700 }} />
      </Box>

      {/* Price */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#161616', lineHeight: 1 }}>
          {market.price ? `${currency === 'USD' ? '$' : ''}${market.price.toFixed(2)}` : NA}
        </Typography>
        {market.change != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {priceUp
              ? <TrendingUpIcon sx={{ fontSize: 16, color: '#198038' }} />
              : <TrendingDownIcon sx={{ fontSize: 16, color: '#da1e28' }} />
            }
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: priceUp ? '#198038' : '#da1e28' }}>
              {priceUp ? '+' : ''}{market.change?.toFixed(2)} ({priceUp ? '+' : ''}{market.change_pct?.toFixed(2)}%)
            </Typography>
          </Box>
        )}
      </Box>

      {/* Key metrics grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
        {[
          ['Market Cap', fmt_currency(market.market_cap)],
          ['Exchange', mkt.exchange || NA],
          ['52W High', mkt['52w_high'] ? `$${Number(mkt['52w_high']).toFixed(2)}` : NA],
          ['52W Low',  mkt['52w_low']  ? `$${Number(mkt['52w_low']).toFixed(2)}`  : NA],
          ['P/E Ratio', market.pe_ratio ? market.pe_ratio.toFixed(1) : NA],
          ['EPS', market.eps ? `$${market.eps.toFixed(2)}` : NA],
          ['Div. Yield', market.dividend_yield ? fmt_pct(market.dividend_yield) : NA],
          ['Revenue', fmt_currency(market.revenue)],
        ].map(([label, value]) => (
          <Box key={label} sx={{ bgcolor: '#fafafa', borderRadius: 0.5, p: 0.75 }}>
            <Typography sx={{ fontSize: 10, color: '#8d8d8d' }}>{label}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616' }}
              noWrap title={value}>{value}</Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1.5 }}>
        Source: Yahoo Finance · {new Date().toLocaleDateString()}
      </Typography>
    </Box>
  );
}

// ── Risk Assessment ────────────────────────────────────────────────────────────

function RiskAssessmentPanel({
  risk,
}: {
  risk: IntelligenceData['risk_assessment'];
  countryRisk?: IntelligenceData['country_risk'];
}) {
  const dims = risk.dimensions;
  const radarData = Object.entries(dims).map(([key, val]) => ({
    dimension: key.charAt(0).toUpperCase() + key.slice(1),
    score: val.score,
  }));

  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <ShieldIcon sx={{ color: RISK_COLOR[risk.composite_level], fontSize: 20 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>AI Risk Assessment</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: RISK_COLOR[risk.composite_level] }}>
            {risk.composite_score.toFixed(1)}
          </Typography>
          <Box>
            <Typography sx={{ fontSize: 10, color: '#8d8d8d', lineHeight: 1 }}>/ 10</Typography>
            <RiskBadge level={risk.composite_level} />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Radar chart */}
        <Grid item xs={12} md={4}>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#525252' }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Risk" dataKey="score" stroke={RISK_COLOR[risk.composite_level]}
                fill={RISK_COLOR[risk.composite_level]} fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Grid>

        {/* Dimension breakdown */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Object.entries(dims).map(([dim, val]) => (
              <Box key={dim}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616', textTransform: 'capitalize' }}>
                    {dim} Risk
                  </Typography>
                  <RiskBadge level={val.level} />
                </Box>
                <ScoreBar score={val.score} />
                {val.explanation && val.explanation !== 'Information not available from public sources.' && (
                  <Typography sx={{ fontSize: 11, color: '#525252', mt: 0.25, lineHeight: 1.4 }}>
                    {val.explanation}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Procurement recommendation */}
      <Box sx={{
        bgcolor: RISK_BG[risk.composite_level],
        border: `1px solid ${RISK_COLOR[risk.composite_level]}30`,
        borderRadius: 1, p: 1.5,
      }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: RISK_COLOR[risk.composite_level], mb: 0.25 }}>
          PROCUREMENT RECOMMENDATION
        </Typography>
        <Typography sx={{ fontSize: 13, color: '#161616' }}>
          {risk.procurement_recommendation}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1.5 }}>
        {risk._source} · {new Date(risk._retrieved).toLocaleDateString()}
      </Typography>
    </Box>
  );
}

// ── Price History ──────────────────────────────────────────────────────────────

function PriceHistoryChart({ history, currency }: { history: { month: string; price: number }[]; currency: string }) {
  if (!history.length) return null;
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>12-Month Price History</Typography>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={history} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0f62fe" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0f62fe" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']}
            tickFormatter={v => `${currency === 'USD' ? '$' : ''}${v}`} />
          <RTooltip formatter={(v: number) => [`${currency === 'USD' ? '$' : ''}${v.toFixed(2)}`, 'Price']}
            contentStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="price" stroke="#0f62fe" strokeWidth={2}
            fill="url(#priceGrad)" dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1 }}>Source: Yahoo Finance</Typography>
    </Box>
  );
}

// ── Financial Highlights ───────────────────────────────────────────────────────

function FinancialHighlights({ market }: { market: IntelligenceData['market'] }) {
  const rows = [
    ['Revenue', fmt_currency(market.revenue)],
    ['Gross Margin', fmt_pct(market.gross_margin)],
    ['Profit Margin', fmt_pct(market.profit_margin)],
    ['Debt / Equity', market.debt_to_equity != null ? `${market.debt_to_equity.toFixed(1)}%` : NA],
    ['Current Ratio', market.current_ratio != null ? market.current_ratio.toFixed(2) : NA],
    ['Free Cash Flow', fmt_currency(market.free_cashflow)],
  ];
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Financial Highlights</Typography>
      <Table size="small">
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label} sx={{ '&:last-child td': { border: 0 } }}>
              <TableCell sx={{ py: 0.75, pl: 0, fontSize: 12, color: '#525252', fontWeight: 500 }}>
                {label}
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75, pr: 0, fontSize: 12, fontWeight: 700, color: '#161616' }}>
                {value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1 }}>Source: Yahoo Finance</Typography>
    </Box>
  );
}

// ── ESG Panel ──────────────────────────────────────────────────────────────────

function ESGPanel({ esg }: { esg: IntelligenceData['esg'] }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>ESG Information</Typography>
      {!esg._available ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
          <InfoOutlinedIcon sx={{ fontSize: 32, color: '#c6c6c6', mb: 1 }} />
          <Typography sx={{ fontSize: 12, color: '#8d8d8d', textAlign: 'center' }}>
            {(esg as any).note || 'ESG data not available.'}
          </Typography>
          {esg._source && (
            <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1 }}>Source: {esg._source}</Typography>
          )}
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#0f62fe' }}>
              {esg.total_esg_score?.toFixed(1) ?? NA}
            </Typography>
            <Box>
              <Typography sx={{ fontSize: 11, color: '#525252' }}>ESG Risk Score</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#161616' }}>{esg.interpretation}</Typography>
            </Box>
          </Box>
          {[
            { label: 'Environmental', value: esg.environmental_score, color: '#198038' },
            { label: 'Social', value: esg.social_score, color: '#6929c4' },
            { label: 'Governance', value: esg.governance_score, color: '#0f62fe' },
          ].map(({ label, value, color }) => (
            <Box key={label} sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: '#525252' }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>
                  {value != null ? value.toFixed(1) : NA}
                </Typography>
              </Box>
              {value != null && (
                <Box sx={{ height: 6, bgcolor: '#f0f0f0', borderRadius: 3 }}>
                  <Box sx={{ width: `${Math.min(100, (value / 50) * 100)}%`, height: 6, bgcolor: color, borderRadius: 3 }} />
                </Box>
              )}
            </Box>
          ))}
          <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1 }}>Source: {esg._source}</Typography>
        </>
      )}
    </Box>
  );
}

// ── Country Risk ───────────────────────────────────────────────────────────────

function CountryRiskPanel({ countryRisk }: { countryRisk: IntelligenceData['country_risk'] }) {
  const level = countryRisk._available ? countryRisk.level : 'medium';
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5, height: '100%' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 2 }}>Country Risk</Typography>
      {!countryRisk._available ? (
        <Typography sx={{ fontSize: 12, color: '#8d8d8d' }}>{NA}</Typography>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: RISK_COLOR[level] }}>
              {countryRisk.score.toFixed(1)}
            </Typography>
            <Box>
              <Typography sx={{ fontSize: 12, color: '#525252' }}>{countryRisk.country}</Typography>
              <RiskBadge level={level} />
            </Box>
          </Box>
          <ScoreBar score={countryRisk.score} />
          <Typography sx={{ fontSize: 13, color: '#525252', mt: 1.5, lineHeight: 1.6 }}>
            {countryRisk.notes}
          </Typography>
          <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1.5 }}>
            Source: FM Global Resilience Index + Public Data
          </Typography>
        </>
      )}
    </Box>
  );
}

// ── AI Summary ────────────────────────────────────────────────────────────────

function AISummaryPanel({ summary, sources }: {
  summary: string;
  recommendation?: string;
  sources: IntelligenceData['data_sources'];
}) {
  // Convert **bold** to JSX
  const renderMarkdown = (text: string) => {
    return text.split('\n\n').map((para, i) => (
      <Typography key={i} sx={{ fontSize: 13, lineHeight: 1.7, mb: 1, color: '#161616' }}>
        {para.split(/\*\*([^*]+)\*\*/).map((part, j) =>
          j % 2 === 1
            ? <strong key={j}>{part}</strong>
            : part
        )}
      </Typography>
    ));
  };

  return (
    <Box sx={{ bgcolor: '#001d6c', borderRadius: 1, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AutoAwesomeIcon sx={{ color: '#78a9ff', fontSize: 18 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Ignite AI Executive Summary</Typography>
        <Chip label="AI-Generated" size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#a8c7fa', fontSize: 10, height: 18, ml: 'auto' }} />
      </Box>
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1, p: 2 }}>
        {renderMarkdown(summary)}
      </Box>
      <DataSourceFooter sources={sources} />
    </Box>
  );
}

// ── News Panel ────────────────────────────────────────────────────────────────

function NewsPanel({ news, supplierName }: { news: IntelligenceData['news']; supplierName: string }) {
  if (!news.length) {
    return (
      <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>News Intelligence</Typography>
        <Typography sx={{ fontSize: 12, color: '#8d8d8d' }}>
          No recent news found for {supplierName} in public news sources.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 1, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ArticleIcon sx={{ color: '#0f62fe', fontSize: 18, mr: 1 }} />
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          News Intelligence — {news.length} Recent Items
        </Typography>
        <Chip label="Google News" size="small"
          sx={{ ml: 'auto', bgcolor: '#f4f4f4', fontSize: 10, height: 18 }} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {news.map((item, i) => {
          const impactKey = Object.keys(IMPACT_COLOR).find(k => item.ai_impact.includes(k)) || 'Low';
          const impactColor = IMPACT_COLOR[impactKey] || '#525252';
          return (
            <Box key={i} sx={{
              border: '1px solid #e0e0e0', borderLeft: `3px solid ${impactColor}`,
              borderRadius: 1, p: 1.5,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component={item.url ? Link : 'span'}
                    href={item.url || undefined}
                    target={item.url ? '_blank' : undefined}
                    sx={{
                      fontSize: 13, fontWeight: 600, color: '#0f62fe',
                      textDecoration: 'none', '&:hover': { textDecoration: 'underline' },
                      display: 'block',
                    }}
                  >
                    {item.headline}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, mt: 0.25, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>{item.source}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>·</Typography>
                    <Typography sx={{ fontSize: 11, color: '#8d8d8d' }}>{item.date}</Typography>
                  </Box>
                </Box>
                <Chip
                  label={impactKey}
                  size="small"
                  sx={{ bgcolor: `${impactColor}18`, color: impactColor, fontSize: 10, height: 18,
                        fontWeight: 700, flexShrink: 0 }}
                />
              </Box>
              {item.summary && item.summary !== NA && (
                <Typography sx={{ fontSize: 12, color: '#525252', lineHeight: 1.5 }}>
                  {item.summary}
                </Typography>
              )}
              <Typography sx={{ fontSize: 11, color: impactColor, mt: 0.5, fontWeight: 600 }}>
                {item.ai_impact}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: 10, color: '#8d8d8d', mt: 1.5 }}>
        Source: Google News RSS · Retrieved: {new Date().toLocaleDateString()}
      </Typography>
    </Box>
  );
}
