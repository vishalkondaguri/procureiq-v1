"""ProcureIQ Backend – Application Entry Point"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.middleware import AuditLogMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware
from app.config import settings
from app.db.session import engine
from app.models.base import Base

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Always create tables — safe to run even if alembic already ran
    # (create_all is idempotent — it skips existing tables)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created.")
    except Exception as exc:
        logger.warning("Table creation skipped (may already exist): %s", exc)

    # Auto-seed demo data if DB is empty (ensures dashboard is never blank)
    try:
        from app.db.seed import auto_seed_if_empty
        await auto_seed_if_empty()
        logger.info("Demo data seeding complete.")
    except Exception as exc:
        logger.warning("Auto-seed skipped: %s", exc)

    yield
    # Shutdown: nothing to close (async engine handles pool cleanup)


def create_app() -> FastAPI:
    # Hide API docs in production unless explicitly enabled
    _docs_url    = "/docs"    if settings.api_docs_enabled else None
    _redoc_url   = "/redoc"   if settings.api_docs_enabled else None
    _openapi_url = "/openapi.json" if settings.api_docs_enabled else None

    app = FastAPI(
        title="ProcureIQ API",
        description="AI-Powered Procurement Intelligence Platform — IBM watsonx Challenge",
        version="1.0.0",
        docs_url=_docs_url,
        redoc_url=_redoc_url,
        openapi_url=_openapi_url,
        lifespan=lifespan,
    )

    # CORS — origins from ALLOWED_ORIGINS_STR env var (comma-separated)
    # In Railway, set: ALLOWED_ORIGINS_STR=https://your-frontend.up.railway.app
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
        expose_headers=["Content-Disposition"],
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuditLogMiddleware)
    app.add_middleware(RateLimitMiddleware)

    # Mount API router
    app.include_router(api_router, prefix="/api/v1")

    # Root health check — instant liveness probe (no DB dependency)
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "ok", "environment": settings.ENVIRONMENT, "version": "1.0.0"}

    # Alias at root for Railway healthcheck
    @app.get("/")
    async def root():
        return {"status": "ok", "service": "ProcureIQ API", "version": "1.0.0"}

    return app


app = create_app()
