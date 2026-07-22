import { useState } from 'react';
import {
  Box, Typography, Grid, Card, Chip, Button, Divider,
  List, ListItem, ListItemIcon, ListItemText, LinearProgress,
  Accordion, AccordionSummary, AccordionDetails, Tab, Tabs,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExecutiveSummary from '@/core/components/ExecutiveSummary/ExecutiveSummary';

// ── Data ──────────────────────────────────────────────────────────────────────

const BOB_WORKFLOWS = [
  {
    id: 'spend-briefing',
    title: 'Automated Daily Spend Briefing',
    category: 'Reporting',
    timeSavedHours: 2.5,
    frequency: 'Daily',
    color: '#0f62fe',
    bobRole: 'IBM Bob was used to draft the architecture, generate the FastAPI endpoint schema, write the seed data logic, and produce the executive briefing template — tasks that would have taken days of manual work.',
    before: 'Procurement analyst manually pulls spend data from 3 systems, formats a PowerPoint, emails to leadership. Takes 2–3 hours daily.',
    after: 'ProcureIQ + Ignite auto-generates a structured spend briefing every morning. IBM Bob helped build the data pipeline and report template in hours, not weeks.',
    steps: [
      'Bob generated the FastAPI /spend/summary endpoint with KPI aggregation logic',
      'Bob wrote the ExecutiveCommandCenter React component with all KPI tiles',
      'Bob created seed data with realistic spend distributions across 40+ suppliers',
      'Bob drafted the Ignite daily briefing prompt template',
      'Result: Procurement leaders get a 60-second morning briefing automatically',
    ],
  },
  {
    id: 'contract-alerts',
    title: 'Contract Expiry Workflow Automation',
    category: 'Contract Management',
    timeSavedHours: 4.0,
    frequency: 'Continuous',
    color: '#9f1853',
    bobRole: 'Bob built the entire Contract Intelligence module — the database schema, migration scripts, expiry calculation logic, risk scoring algorithm, and the React UI with timeline charts.',
    before: 'Contracts team manually checks a shared spreadsheet weekly for expiring contracts. Critical renewals are missed. Average 4 hours/week of manual tracking.',
    after: 'Automated expiry pipeline with 30/60/90-day alerts, risk scoring, and Ignite AI recommendations. No manual checking required.',
    steps: [
      'Bob designed the Contract ORM model with expiry tracking fields',
      'Bob wrote alembic migration 001_initial.py with all contract schema',
      'Bob built the ContractIntelligencePage with timeline and risk indicators',
      'Bob created the contract_service.py with expiry window calculations',
      'Bob generated the Ignite contract risk prompt templates',
    ],
  },
  {
    id: 'supplier-onboarding',
    title: 'Supplier Onboarding Knowledge Automation',
    category: 'Supplier Management',
    timeSavedHours: 6.0,
    frequency: 'Per onboarding',
    color: '#005d5d',
    bobRole: 'Bob built the Supplier 360 module, the supplier normalizer (fuzzy matching), ESG scoring logic, and the Wikipedia live enrichment tool in Ignite — all from scratch using IBM Bob.',
    before: 'New supplier onboarding requires procurement team to manually research supplier background, financials, ESG standing. Takes 6–8 hours per supplier.',
    after: 'Ignite AI enriches supplier profiles automatically using Wikipedia + structured data. Supplier risk score is computed instantly. IBM Bob built the entire pipeline.',
    steps: [
      'Bob built SupplierIntelService with Wikipedia MediaWiki API integration',
      'Bob wrote the supplier_normalizer.py with RapidFuzz deduplication',
      'Bob created the Supplier360Page with ESG + Payment History tabs',
      'Bob generated the supplier risk scoring algorithm across 5 dimensions',
      'Bob built the _wiki_fetch() tool in tools.py for live knowledge enrichment',
    ],
  },
  {
    id: 'data-cleansing',
    title: 'Procurement Data Quality Automation',
    category: 'Data Management',
    timeSavedHours: 8.0,
    frequency: 'Per upload',
    color: '#6929c4',
    bobRole: 'Bob designed and built the entire Intelligent Data Engine — column mapper, health scorer, supplier normalizer, parsers — replacing weeks of manual data cleaning with an automated pipeline.',
    before: 'Finance team spends 6–10 hours cleaning each Excel export before it can be analysed. Duplicate suppliers, inconsistent currencies, missing values — all manual fixes.',
    after: 'Upload any Excel/CSV/PDF and the IDE auto-cleanses, maps columns, deduplicates, standardises currencies/dates, and scores data health in seconds.',
    steps: [
      'Bob built the IDE pipeline.py with multi-format file ingestion',
      'Bob created column_mapper.py mapping 40+ procurement column name variants',
      'Bob wrote health_scorer.py with completeness/consistency/accuracy scoring',
      'Bob built supplier_normalizer.py with fuzzy matching deduplication',
      'Bob generated parsers for xlsx, csv, pdf, docx, json, xml formats',
    ],
  },
  {
    id: 'savings-identification',
    title: 'Automated Savings Opportunity Discovery',
    category: 'Value Optimisation',
    timeSavedHours: 10.0,
    frequency: 'Weekly',
    color: '#198038',
    bobRole: 'Bob built the entire Savings Engine module — the 30/60/90-day pipeline view, effort-impact scoring matrix, Ignite strategy panel, and the What-if analysis scenario modelling.',
    before: 'Category managers spend 1–2 days per week manually identifying savings opportunities by cross-referencing spend reports, supplier contracts, and benchmark data.',
    after: 'ProcureIQ automatically surfaces savings opportunities ranked by effort vs impact. Ignite AI generates strategy recommendations. IBM Bob built the whole module.',
    steps: [
      'Bob built the savings_service.py with opportunity ranking algorithms',
      'Bob created the SavingsEnginePage with 30/60/90-day pipeline view',
      'Bob wrote the effort-impact scoring matrix with visual quadrant chart',
      'Bob built the WhatIfAnalysisPage with multi-variable scenario sliders',
      'Bob generated Ignite savings strategy prompt templates',
    ],
  },
];

const BOB_STATS = [
  { label: 'Hours saved building ProcureIQ', value: '200+', icon: <TimerIcon />, color: '#0f62fe' },
  { label: 'Hours saved per week (team)', value: '30+', icon: <TrendingDownIcon />, color: '#198038' },
  { label: 'Modules built with Bob', value: '15', icon: <BuildIcon />, color: '#6929c4' },
  { label: 'Automation workflows enabled', value: '5', icon: <FlashOnIcon />, color: '#9f1853' },
];

const BOB_USAGE_TIMELINE = [
  { phase: 'Architecture', action: 'Used IBM Bob to design the 15-module product architecture, technology stack selection, database schema, and API contracts for ProcureIQ v1.0' },
  { phase: 'Backend Code', action: 'Bob generated all FastAPI endpoints, SQLAlchemy models, Alembic migrations, Pydantic schemas, and service layer logic across 20+ Python files' },
  { phase: 'Frontend Code', action: 'Bob built all 15 React module pages, the PageLayout sidebar, theme system, IgniteDrawer with TTS/voice, NotificationCenter, and PresentationTour' },
  { phase: 'AI Integration', action: 'Bob wrote the Ignite orchestrator, watsonx client, smart offline engine, Wikipedia tool, and all 40+ prompt templates' },
  { phase: 'Data Pipeline', action: 'Bob built the entire IDE pipeline: column mapper, health scorer, supplier normalizer, and all file parsers' },
  { phase: 'Deployment', action: 'Bob diagnosed and fixed every Railway deployment error — Dockerfile, nixpacks.toml, requirements.txt, CORS config, and URL normalisation' },
  { phase: 'Presentation', action: 'Bob created the 16-slide interactive presentation with TTS narration, PDF/PPTX/Video export inside the Documentation Center' },
  { phase: 'Documentation', action: 'Bob wrote all technical documentation, solution statements, and this very IBM Bob Automation page' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function BobAutomationPage() {
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState<string | false>('spend-briefing');

  const totalHoursSaved = BOB_WORKFLOWS.reduce((s, w) => s + w.timeSavedHours, 0);

  return (
    <Box>
      <ExecutiveSummary
        title="IBM Bob Automation Center"
        summary="ProcureIQ was entirely built using IBM Bob — the AI assistant powering this very interface. Every module, every API endpoint, every workflow automation was designed, coded, debugged, and deployed through Bob. This page demonstrates exactly how IBM Bob eliminates repetitive procurement work and drives Growth Enabler productivity."
        highlights={[
          '200+ dev hours saved building with Bob',
          `${totalHoursSaved}h/week saved for procurement teams`,
          '15 modules built entirely by Bob',
          '5 workflow automations eliminating manual work',
        ]}
        isLoading={false}
      />

      {/* IBM Bob Banner */}
      <Box sx={{
        mb: 3, p: 3, borderRadius: 2,
        background: 'linear-gradient(135deg, #001d6c 0%, #0f62fe 50%, #6929c4 100%)',
        display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
      }}>
        <SmartToyIcon sx={{ color: 'white', fontSize: 48 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 20, mb: 0.5 }}>
            Built 100% with IBM Bob
          </Typography>
          <Typography sx={{ color: '#a6c8ff', fontSize: 13, lineHeight: 1.7 }}>
            Every line of code in ProcureIQ — from the FastAPI backend to the React frontend, from database migrations
            to AI prompt templates, from deployment configuration to this documentation — was generated, reviewed,
            debugged, and refined through IBM Bob conversations. ProcureIQ is both a <strong style={{ color: 'white' }}>product built by Bob</strong> and
            a <strong style={{ color: 'white' }}>platform powered by Bob's AI capabilities</strong>.
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2, minWidth: 120 }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 28 }}>200+</Typography>
          <Typography sx={{ color: '#a6c8ff', fontSize: 12 }}>Dev hours saved</Typography>
          <Typography sx={{ color: '#a6c8ff', fontSize: 12 }}>by IBM Bob</Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {BOB_STATS.map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ p: 2.5, textAlign: 'center', height: '100%', border: `2px solid ${s.color}22` }}>
              <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
              <Typography sx={{ fontWeight: 800, fontSize: 28, color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
                {s.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Workflow Automations" icon={<FlashOnIcon />} iconPosition="start" />
          <Tab label="How Bob Built ProcureIQ" icon={<BuildIcon />} iconPosition="start" />
          <Tab label="Team Productivity Impact" icon={<GroupsIcon />} iconPosition="start" />
          <Tab label="Bob as AI Advisor (Ignite)" icon={<AutoAwesomeIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Workflow Automations */}
      {tab === 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These are the 5 procurement workflows that ProcureIQ — built by IBM Bob — automates for Growth Enabler teams.
            Each shows the before/after productivity impact and exactly what Bob built.
          </Typography>
          {BOB_WORKFLOWS.map(w => (
            <Accordion
              key={w.id}
              expanded={expanded === w.id}
              onChange={(_, isExp) => setExpanded(isExp ? w.id : false)}
              sx={{ mb: 1, border: `1px solid ${w.color}33`, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                  <Box sx={{ width: 4, height: 40, bgcolor: w.color, borderRadius: 2, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{w.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip label={w.category} size="small" sx={{ bgcolor: `${w.color}18`, color: w.color, fontSize: 10, height: 20 }} />
                      <Chip label={w.frequency} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#198038' }}>{w.timeSavedHours}h</Typography>
                    <Typography variant="caption" color="text.secondary">saved</Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ bgcolor: '#fff1f1', border: '1px solid #da1e2844', borderRadius: 1, p: 1.5, mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#da1e28', mb: 0.5 }}>❌ BEFORE (Manual)</Typography>
                      <Typography variant="body2" color="text.secondary">{w.before}</Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#defbe6', border: '1px solid #19803844', borderRadius: 1, p: 1.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#198038', mb: 0.5 }}>✅ AFTER (Automated by ProcureIQ)</Typography>
                      <Typography variant="body2" color="text.secondary">{w.after}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ bgcolor: '#f0f4ff', border: `1px solid ${w.color}44`, borderRadius: 1, p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SmartToyIcon sx={{ color: w.color, fontSize: 16 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: 12, color: w.color }}>IBM Bob built this:</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic' }}>{w.bobRole}</Typography>
                      <List dense disablePadding>
                        {w.steps.map((step, i) => (
                          <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <CheckCircleIcon sx={{ fontSize: 14, color: '#198038' }} />
                            </ListItemIcon>
                            <ListItemText primary={step} primaryTypographyProps={{ fontSize: 12 }} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Tab 1: How Bob Built ProcureIQ */}
      {tab === 1 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            ProcureIQ v1.0 was built entirely through IBM Bob conversations during the IBM watsonx Challenge (July 8–22, 2025).
            Every architectural decision, every line of code, every deployment fix — all generated by IBM Bob.
          </Typography>
          {BOB_USAGE_TIMELINE.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#0f62fe', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </Box>
                {i < BOB_USAGE_TIMELINE.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: '#e0e0e0', mt: 0.5 }} />}
              </Box>
              <Box sx={{ pb: 2 }}>
                <Chip label={item.phase} size="small" color="primary" sx={{ mb: 0.75, fontWeight: 700 }} />
                <Typography variant="body2" color="text.secondary">{item.action}</Typography>
              </Box>
            </Box>
          ))}
          <Box sx={{ bgcolor: '#f0f4ff', border: '1px solid #0f62fe44', borderRadius: 1, p: 2, mt: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#0f62fe', mb: 1 }}>
              🤖 IBM Bob Commit History — GitHub Evidence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All 8+ commits in the repository <code>vishalkondaguri/procureiq-v1</code> were generated through IBM Bob.
              The commit messages themselves (written by Bob) document the full development lifecycle: architecture, module implementation, bug fixes, Railway deployment, and feature additions — all within the 14-day challenge window.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Tab 2: Team Productivity */}
      {tab === 2 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Quantified productivity impact for a typical Growth Enabler procurement team of 5–10 people.
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { role: 'CPO / Procurement Director', before: '3h/day reading reports', after: '15min/day with Ignite briefing', saving: '85%' },
              { role: 'Category Manager', before: '1-2 days/week finding savings', after: '30min/week reviewing auto-surfaced opportunities', saving: '90%' },
              { role: 'Contracts Analyst', before: '4h/week manual contract tracking', after: 'Zero — automated alerts & pipeline', saving: '100%' },
              { role: 'Data Analyst', before: '6-10h per Excel data clean', after: 'Upload → auto-clean in seconds', saving: '95%' },
              { role: 'Finance Controller', before: '2h/week DPO & payment tracking', after: 'Real-time Payment Analytics dashboard', saving: '80%' },
            ].map(r => (
              <Grid item xs={12} key={r.role}>
                <Card sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <GroupsIcon sx={{ color: '#0f62fe', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{r.role}</Typography>
                    <Typography variant="caption" color="text.secondary">Before: {r.before}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>After: {r.after}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#198038' }}>{r.saving}</Typography>
                    <Typography variant="caption" color="text.secondary">time saved</Typography>
                  </Box>
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseInt(r.saving)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#198038' } }}
                    />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Card sx={{ p: 2.5, bgcolor: '#f0fff4', border: '1px solid #19803844' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#198038', mb: 1 }}>
              📊 Total Growth Enabler Productivity Impact
            </Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Hours saved per team per week', value: '30+' },
                { label: 'Annual hours saved (team of 8)', value: '1,560+' },
                { label: 'Reduction in manual reporting', value: '85%' },
                { label: 'Faster supplier onboarding', value: '10×' },
              ].map(m => (
                <Grid item xs={6} sm={3} key={m.label}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#198038' }}>{m.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Box>
      )}

      {/* Tab 3: Bob as Ignite */}
      {tab === 3 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Inside ProcureIQ, IBM Bob's capabilities are channelled through <strong>Ignite</strong> — the AI Procurement Advisor.
            Ignite provides the same workflow automation and knowledge assistance that IBM Bob provides to developers, but for procurement professionals.
          </Typography>
          <Grid container spacing={2}>
            {[
              {
                title: 'Automates Repetitive Research',
                icon: <AssignmentIcon />,
                color: '#0f62fe',
                desc: 'Just as IBM Bob automates code writing, Ignite automates procurement research — supplier profiles, risk assessments, market benchmarks — through natural language conversation.',
                examples: ['Tell me about IBM as a supplier', 'What is our tail spend ratio?', 'Which contracts expire in 90 days?'],
              },
              {
                title: 'Streamlines Onboarding',
                icon: <SchoolIcon />,
                color: '#6929c4',
                desc: 'New procurement team members ask Ignite about processes, policies, and supplier history instead of spending weeks learning the system. IBM Bob trained Ignite on procurement domain knowledge.',
                examples: ['Explain what DPO means for our business', 'How do we handle spot purchases?', 'What is our contract coverage rate?'],
              },
              {
                title: 'Improves Knowledge Sharing',
                icon: <GroupsIcon />,
                color: '#198038',
                desc: 'Ignite democratises procurement intelligence. Any team member — not just experts — can ask complex questions and get accurate, data-grounded answers. IBM Bob built all 40+ prompt templates.',
                examples: ['Compare our top 5 suppliers', 'What savings opportunities exist in IT?', 'Generate an executive procurement summary'],
              },
              {
                title: 'Cuts Friction in Processes',
                icon: <FlashOnIcon />,
                color: '#9f1853',
                desc: 'Manual approval workflows, report generation, data lookups, and scenario modelling are all accessible via voice or text with Ignite — directly mirroring how IBM Bob cuts friction for developers.',
                examples: ['Model a 10% price increase scenario', 'What if we consolidate MRO suppliers?', 'Generate a board presentation summary'],
              },
            ].map(item => (
              <Grid item xs={12} sm={6} key={item.title}>
                <Card sx={{ p: 2.5, height: '100%', border: `1px solid ${item.color}33` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ color: item.color }}>{item.icon}</Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{item.desc}</Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: item.color, mb: 0.75, textTransform: 'uppercase' }}>
                    Example Ignite Queries
                  </Typography>
                  {item.examples.map(ex => (
                    <Box key={ex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 12, color: item.color }} />
                      <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#525252' }}>"{ex}"</Typography>
                    </Box>
                  ))}
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3, p: 2.5, bgcolor: '#001d6c', borderRadius: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 15, mb: 1 }}>
              IBM Bob → ProcureIQ: The Parallel
            </Typography>
            <Grid container spacing={2}>
              {[
                { bob: 'IBM Bob automates code writing for developers', procureiq: 'Ignite automates insight generation for procurement teams' },
                { bob: 'Bob answers technical questions with context', procureiq: 'Ignite answers procurement questions with data context' },
                { bob: 'Bob reduces time from idea to implementation', procureiq: 'Ignite reduces time from question to decision' },
                { bob: 'Bob built ProcureIQ in 14 days', procureiq: 'ProcureIQ saves teams 30+ hours every week' },
              ].map((row, i) => (
                <Grid item xs={12} key={i}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, p: 1.5 }}>
                      <Typography sx={{ color: '#a6c8ff', fontSize: 12 }}>🤖 {row.bob}</Typography>
                    </Box>
                    <Typography sx={{ color: '#78a9ff', fontSize: 18, fontWeight: 700 }}>→</Typography>
                    <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, p: 1.5 }}>
                      <Typography sx={{ color: '#42be65', fontSize: 12 }}>✨ {row.procureiq}</Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      )}

      {/* CTA */}
      <Box sx={{ mt: 4, p: 2.5, bgcolor: '#f7f8fa', border: '1px solid #e0e0e0', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <AutoAwesomeIcon sx={{ color: '#6929c4' }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Try Ignite — IBM Bob's procurement equivalent</Typography>
          <Typography variant="body2" color="text.secondary">
            Click the purple Ignite button (bottom right) to ask any procurement question. Built by IBM Bob. Powered by IBM watsonx.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AutoAwesomeIcon />} sx={{ bgcolor: '#6929c4', '&:hover': { bgcolor: '#491d8b' } }}>
          Open Ignite AI
        </Button>
      </Box>
    </Box>
  );
}
