# ProcureIQ Phase 1 — Setup & Run Guide

## Prerequisites
- Python 3.12+ (with Poetry: `pip install poetry`)
- Node.js 22+
- Docker Desktop (for PostgreSQL, Redis, MinIO)

---

## Step 1 — Start Infrastructure

```bash
docker-compose up -d postgres redis minio
```

Wait ~15 seconds for PostgreSQL to be ready.

---

## Step 2 — Backend Setup

```bash
cd procureiq-backend

# Copy and configure environment
copy .env.example .env
# Edit .env — set WATSONX_API_KEY and WATSONX_PROJECT_ID (or leave blank for Ollama fallback)

# Install dependencies
poetry install

# Create database tables
poetry run alembic upgrade head
# (Or for dev without Alembic migrations yet):
# poetry run python -c "import asyncio; from app.db.session import engine; from app.models.base import Base; import app.models.user, app.models.supplier, app.models.spend, app.models.contract, app.models.ingestion; asyncio.run(engine.begin().__aenter__().run_sync(Base.metadata.create_all))"

# Seed demo data (50 suppliers, 3600+ transactions, 30 contracts)
poetry run python -m app.db.seed

# Start API server
poetry run uvicorn app.main:app --reload --port 8000
```

Backend available at: **http://localhost:8000/docs**

---

## Step 3 — Frontend Setup

```bash
cd procureiq-frontend

npm install

npm run dev
```

Frontend available at: **http://localhost:3000**

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@procureiq.ai | Admin@123! |
| CPO | cpo@procureiq.ai | Admin@123! |
| Analyst | analyst@procureiq.ai | Admin@123! |
| Viewer | viewer@procureiq.ai | Admin@123! |

---

## Phase 1 — What's Built

### Backend (FastAPI)
| Area | Status |
|------|--------|
| JWT Auth (login/refresh/logout/me) | ✅ Complete |
| Spend Analytics API (summary, transactions, trend, tail-spend, pareto) | ✅ Complete |
| Supplier 360 API (list, profile, categories) | ✅ Complete |
| IDE Upload & Status API | ✅ Complete |
| Ignite Chat API (REST + WebSocket) | ✅ Complete |
| Database Models (User, Supplier, SpendTransaction, Contract, IngestionRun) | ✅ Complete |
| SpendService with real SQL aggregations | ✅ Complete |
| SupplierService with 360° data assembly | ✅ Complete |
| IDE Pipeline (8-stage, xlsx + csv parsers) | ✅ Complete |
| AI Column Mapper (fuzzy matching) | ✅ Complete |
| Supplier Normalizer (RapidFuzz deduplication) | ✅ Complete |
| Data Health Scorer (5 dimensions) | ✅ Complete |
| Ignite Orchestrator (watsonx + Ollama fallback) | ✅ Complete |
| Demo data seeder (50 suppliers, ~3600 transactions) | ✅ Complete |

### Frontend (React 19)
| Area | Status |
|------|--------|
| IBM-styled MUI theme | ✅ Complete |
| Auth (login page, JWT context, RequireAuth guard) | ✅ Complete |
| PageLayout (collapsible sidebar, topbar, 14 nav items) | ✅ Complete |
| Ignite AI Drawer (WebSocket streaming, citation rendering) | ✅ Complete |
| Executive Command Center (KPI ribbon, spend trend, category chart, top suppliers) | ✅ Complete |
| Intelligent Data Engine (drag-drop upload, polling, health gauge, correction report) | ✅ Complete |
| Tail Spend Intelligence (threshold slider, charts, analysis table) | ✅ Complete |
| Supplier 360 (list with filters, 360° profile drawer, spend chart) | ✅ Complete |
| Shared DataTable (sort, search, export, pagination, sticky header) | ✅ Complete |
| KPICard, ExecutiveSummary, StatusBadge components | ✅ Complete |
| Phase 2–4 module stubs (routing works, "coming in Phase X" screens) | ✅ Complete |

---

## Running Tests

```bash
cd procureiq-backend
poetry run pytest tests/ -v
```

---

## IBM watsonx Setup

1. Create an IBM Cloud account at cloud.ibm.com
2. Provision a watsonx.ai instance
3. Generate an API key in IAM
4. Create a project in watsonx.ai and copy the Project ID
5. Set in `.env`:
   ```
   WATSONX_API_KEY=your_key_here
   WATSONX_PROJECT_ID=your_project_id
   ```

**Without watsonx:** Set `OLLAMA_ENABLED=true` and run `ollama pull llama3` for local inference.
