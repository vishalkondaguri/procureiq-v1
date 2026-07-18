# ProcureIQ v1.0

> **AI-Powered Procurement Intelligence Platform** — IBM watsonx Challenge Submission

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![IBM watsonx](https://img.shields.io/badge/IBM-watsonx.ai-purple)](https://www.ibm.com/watsonx)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![Phase](https://img.shields.io/badge/Phase-4%20Complete-brightgreen)]()

## Overview

ProcureIQ is an enterprise-grade AI procurement intelligence platform that transforms raw procurement data into actionable decisions. It features **Ignite**, an AI procurement advisor powered by IBM watsonx — not a chatbot, but a domain-specific procurement expert with live data access, conversation memory, and tool dispatch.

**Tagline:** *Transforming Procurement Data into Intelligent Decisions*

## All 15 Modules — Phase 4 Complete

| # | Module | Phase | Status |
|---|--------|-------|--------|
| 1 | Executive Command Center | 1 | ✅ Live |
| 2 | Intelligent Data Engine (IDE) | 1 | ✅ Live |
| 3 | Ignite AI Assistant | 1 | ✅ Live |
| 4 | Tail Spend Intelligence | 1 | ✅ Live |
| 5 | Supplier 360 | 1 | ✅ Live |
| 6 | Contract Intelligence | 2 | ✅ Live |
| 7 | Supplier Risk Assessment | 2 | ✅ Live |
| 8 | 80/20 Pareto Analysis | 2 | ✅ Live |
| 9 | Savings Opportunity Engine | 2 | ✅ Live |
| 10 | Procurement Health Score | 2 | ✅ Live |
| 11 | What-if Analysis | 3 | ✅ Live |
| 12 | Spend Forecasting | 3 | ✅ Live |
| 13 | Executive Reporting | 3 | ✅ Live |
| 14 | Documentation Center | 4 | ✅ Live |
| 15 | Settings / Admin | 4 | ✅ Live |

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+
- Docker Desktop
- IBM watsonx API key (or Ollama for local inference)

### Development Setup

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis minio

# 2. Backend
cd procureiq-backend
cp .env.example .env          # Fill in WATSONX_API_KEY, WATSONX_PROJECT_ID
poetry install
poetry run alembic upgrade head   # Runs migrations 001 → 002 → 003
poetry run python -m app.db.seed  # Seeds 50 suppliers, 3600 transactions, 30 contracts
poetry run uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd procureiq-frontend
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API + Swagger:** http://localhost:8000/docs
- **Backend ReDoc:** http://localhost:8000/redoc
- **MinIO Console:** http://localhost:9001
- **Health Check:** http://localhost:8000/api/v1/system/health

### Demo Login

```
Email:    admin@procureiq.com
Password: Admin@123!
```

## Technology Stack

**Frontend:** React 19, TypeScript, Vite, Material UI v6, React Query v5, React Router v7, Recharts, Framer Motion

**Backend:** FastAPI, Python 3.12, SQLAlchemy 2, PostgreSQL 16 + pgvector, Alembic, Pydantic v2, Celery, Redis 7

**AI:** IBM watsonx.ai (Granite 13B Chat, primary), Ollama (local fallback — llama3/mistral)

**Infrastructure:** Docker Compose, MinIO/S3 (document storage), OpenTelemetry-ready

## Project Structure

```
ProcureIQ v1.0/
├── procureiq-frontend/          # React 19 SPA
│   └── src/
│       ├── app/                 # Router, theme, auth context
│       ├── core/                # Shared components, types, API client
│       ├── ignite/              # AI assistant drawer + WebSocket hook
│       └── modules/             # 15 feature modules (one folder each)
├── procureiq-backend/           # FastAPI server
│   └── app/
│       ├── api/v1/              # 16 API routers
│       ├── services/            # Business logic (11 services)
│       ├── models/              # SQLAlchemy ORM models (9 models)
│       ├── intelligence/        # Ignite orchestrator + IDE pipeline
│       └── tasks/               # Celery async tasks
├── migrations/versions/         # 3 Alembic migration files (001–003)
├── docker-compose.yml           # Full stack: frontend, backend, celery, postgres, redis, minio
└── README.md
```

## IBM watsonx Integration

Ignite uses IBM watsonx.ai for:
- **Natural language Q&A** — live procurement data querying (Granite model)
- **IDE column mapping** — AI-assisted column name → canonical model mapping
- **Contract clause extraction** — risk analysis of liability, payment, auto-renewal terms
- **Executive report narrative** — board-ready paragraph generation from live data
- **Spend forecast narration** — human-readable interpretation of statistical forecasts
- **What-if insights** — strategic recommendations for scenario results

Set `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in `.env` to enable.
Without them, Ignite automatically falls back to Ollama local inference (`OLLAMA_ENABLED=true`).

## Phase 4 — Enterprise Polish

Phase 4 delivered:
- **Documentation Center** — 10 searchable module docs, each with 5–8 sections (business purpose, FRs, API design, DB design, AI logic, test strategy, version history). Filter by phase, category, keyword. Print-ready viewer.
- **Settings** — 6-tab management console: General identity, Currency & Fiscal, Ignite AI tuning, Users & RBAC (create/suspend/role-change users), Audit Log viewer, System Health dashboard
- **Audit Trail** — Every POST/PUT/PATCH/DELETE request persisted to `audit_logs` table with user, IP, path, status, duration
- **Rate Limiting** — Token-bucket: 120 req/min general, 20 req/min for AI endpoints
- **Security Headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy on every response
- **System API** — `/api/v1/system/health` (DB liveness), `/api/v1/system/version` (capability manifest), `/api/v1/system/ping` (uptime check)
- **Alembic Migrations** — 3 versioned migration files covering all 9 ORM models across all phases
- **Settings API** — Tenant-scoped key/value store with 5 categories (general, currency, fiscal, ignite, notifications), full RBAC user management endpoints

---

*ProcureIQ v1.0 — IBM watsonx Challenge · Phase 4 Complete · All 15 modules live*
