"""Request middleware — audit logging with DB persistence, rate limiting."""
from __future__ import annotations
import time
import uuid
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# ── In-process token-bucket rate limiter ─────────────────────────────────────
# For production, replace with Redis-backed `slowapi`.
_rate_buckets: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_PER_MINUTE = 120
RATE_LIMIT_AI_PER_MINUTE = 60   # raised — 20 was too restrictive for interactive chat


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token-bucket rate limiter per (IP + path-bucket).
    - /api/v1/ignite/*  → 20 req/min
    - Everything else   → 120 req/min
    """

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Determine limit bucket
        if "/ignite" in path:
            limit = RATE_LIMIT_AI_PER_MINUTE
            bucket_key = f"ai:{ip}"
        else:
            limit = RATE_LIMIT_PER_MINUTE
            bucket_key = f"api:{ip}"

        now = time.time()
        window = 60.0

        # Trim entries older than the window
        _rate_buckets[bucket_key] = [t for t in _rate_buckets[bucket_key] if now - t < window]

        if len(_rate_buckets[bucket_key]) >= limit:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after_seconds": 60,
                },
                headers={"Retry-After": "60"},
            )

        _rate_buckets[bucket_key].append(now)
        response = await call_next(request)
        return response


class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Log all state-mutating requests (POST/PUT/PATCH/DELETE) to:
    1. Python logger (always)
    2. DB audit_logs table (async, non-blocking — skips on DB error)
    """

    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 1)

        if request.method not in ("GET", "HEAD", "OPTIONS"):
            user_id = request.headers.get("x-user-id", "anonymous")
            user_email = request.headers.get("x-user-email")
            ip = request.client.host if request.client else None
            ua = request.headers.get("user-agent")

            # Logger (sync, always succeeds)
            logger.info(
                "AUDIT method=%s path=%s status=%d duration_ms=%s user=%s ip=%s",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                user_id,
                ip,
            )

            # Async DB write — best-effort, do not block the response
            try:
                from app.db.session import async_session_factory
                from app.models.audit import AuditLog

                async with async_session_factory() as db:
                    entry = AuditLog(
                        id=str(uuid.uuid4()),
                        tenant_id="demo-tenant-001",
                        user_id=user_id if user_id != "anonymous" else None,
                        user_email=user_email,
                        method=request.method,
                        path=request.url.path,
                        status_code=response.status_code,
                        duration_ms=int(duration_ms),
                        ip_address=ip,
                        user_agent=ua[:512] if ua else None,
                    )
                    db.add(entry)
                    await db.commit()
            except Exception as exc:
                logger.debug("Audit DB write skipped: %s", exc)

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security response headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # CSP — strict for API (no browser rendering)
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'"
        )
        return response
