"""System API — health check, observability, version info."""
from __future__ import annotations
import time
import platform
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_async_session
from app.config import settings

router = APIRouter()

START_TIME = time.time()
VERSION = "1.0.0"


@router.get("/ping")
async def ping():
    """Simple liveness probe — no auth required."""
    return {"status": "ok", "timestamp": time.time()}


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_async_session)):
    """Detailed readiness probe — checks DB connectivity."""
    db_ok = False
    db_latency_ms = 0
    try:
        t0 = time.monotonic()
        await db.execute(text("SELECT 1"))
        db_latency_ms = round((time.monotonic() - t0) * 1000, 1)
        db_ok = True
    except Exception:
        pass

    uptime_seconds = round(time.time() - START_TIME, 1)
    status = "healthy" if db_ok else "degraded"

    return {
        "status": status,
        "version": VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
        "checks": {
            "database": {
                "status": "ok" if db_ok else "error",
                "latency_ms": db_latency_ms,
            },
            "watsonx": {
                "configured": bool(settings.WATSONX_API_KEY),
                "model": settings.WATSONX_MODEL_ID,
            },
            "ollama": {
                "enabled": settings.OLLAMA_ENABLED,
                "model": settings.OLLAMA_MODEL,
            },
        },
        "platform": {
            "python": platform.python_version(),
            "system": platform.system(),
        },
    }


@router.get("/version")
async def version_info():
    """Application version and capability manifest."""
    return {
        "app": "ProcureIQ",
        "version": VERSION,
        "api_version": "v1",
        "phase": "4",
        "modules": [
            "executive-command-center",
            "intelligent-data-engine",
            "tail-spend-intelligence",
            "supplier-360",
            "contract-intelligence",
            "supplier-risk-assessment",
            "pareto-analysis",
            "savings-opportunity-engine",
            "procurement-health-score",
            "what-if-analysis",
            "spend-forecasting",
            "executive-reporting",
            "documentation-center",
            "settings",
            "ignite-ai",
        ],
        "ai": {
            "primary": "IBM watsonx",
            "fallback": "Ollama",
            "assistant": "Ignite",
        },
    }
