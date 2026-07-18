"""FastAPI v1 router — mounts all module routers (Phase 4 complete)."""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    spend,
    contracts,
    suppliers,
    risk,
    savings,
    ide,
    ignite,
    forecasting,
    whatif,
    reports,
    health,
    settings,
    system,
    notifications,
    intelligence,
)

api_router = APIRouter()

api_router.include_router(auth.router,        prefix="/auth",       tags=["Authentication"])
api_router.include_router(spend.router,       prefix="/spend",      tags=["Spend Analytics"])
api_router.include_router(contracts.router,   prefix="/contracts",  tags=["Contract Intelligence"])
api_router.include_router(suppliers.router,   prefix="/suppliers",  tags=["Supplier 360"])
api_router.include_router(risk.router,        prefix="/risk",       tags=["Supplier Risk"])
api_router.include_router(savings.router,     prefix="/savings",    tags=["Savings Engine"])
api_router.include_router(ide.router,         prefix="/ide",        tags=["Intelligent Data Engine"])
api_router.include_router(ignite.router,      prefix="/ignite",     tags=["Ignite AI"])
api_router.include_router(forecasting.router, prefix="/forecast",   tags=["Spend Forecasting"])
api_router.include_router(whatif.router,      prefix="/whatif",     tags=["What-if Analysis"])
api_router.include_router(reports.router,     prefix="/reports",    tags=["Executive Reporting"])
api_router.include_router(health.router,      prefix="/health",     tags=["Procurement Health Score"])
api_router.include_router(settings.router,    prefix="/settings",   tags=["Settings & RBAC"])
api_router.include_router(system.router,        prefix="/system",        tags=["System & Observability"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(intelligence.router,  prefix="/intelligence",  tags=["Supplier Intelligence"])
