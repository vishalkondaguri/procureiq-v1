"""Lightweight in-process TTL response cache for read-heavy API endpoints.

Uses a simple dict + timestamp. For multi-process prod deployments, replace with Redis.
"""
from __future__ import annotations
import inspect
import time
import hashlib
import json
import functools
from typing import Any, Callable

# {cache_key: (value, expires_at)}
_CACHE: dict[str, tuple[Any, float]] = {}

DEFAULT_TTL = 60          # seconds — KPI/summary endpoints
MEDIUM_TTL  = 30          # seconds — supplier/risk lists
SHORT_TTL   = 10          # seconds — paginated queries


def _make_key(prefix: str, **kwargs) -> str:
    payload = json.dumps(kwargs, sort_keys=True, default=str)
    h = hashlib.md5(payload.encode()).hexdigest()[:8]
    return f"{prefix}:{h}"


def get_cached(key: str) -> Any | None:
    entry = _CACHE.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    if key in _CACHE:
        del _CACHE[key]
    return None


def set_cached(key: str, value: Any, ttl: float = DEFAULT_TTL) -> None:
    _CACHE[key] = (value, time.time() + ttl)


def invalidate_prefix(prefix: str) -> None:
    """Remove all cache entries whose key starts with prefix."""
    to_del = [k for k in _CACHE if k.startswith(prefix)]
    for k in to_del:
        del _CACHE[k]


def cached(prefix: str, ttl: float = DEFAULT_TTL, key_from_kwargs: list[str] | None = None):
    """
    Async decorator that caches the result of an async function.

    Key building:
    - Binds all positional and keyword args to the function's parameter names.
    - Automatically includes `tenant_id` from `self.tenant_id` (if present) so
      different tenants never share a cache entry.
    - If `key_from_kwargs` is given, only those named parameters contribute to the key.

    Usage:
        @cached("spend_kpis", ttl=60)
        async def get_kpis(self, period_start=None, period_end=None): ...

        @cached("supplier_list", ttl=30, key_from_kwargs=["page", "page_size", "search"])
        async def list_suppliers(self, page=1, page_size=50, search=None): ...
    """
    def decorator(fn: Callable):
        sig = inspect.signature(fn)

        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            # Bind positional + keyword args to parameter names
            try:
                bound = sig.bind(*args, **kwargs)
                bound.apply_defaults()
                all_params: dict[str, Any] = dict(bound.arguments)
            except TypeError:
                # Fallback: skip cache if binding fails
                return await fn(*args, **kwargs)

            # Remove 'self' — we'll pull tenant_id from it instead
            self_obj = all_params.pop("self", None)

            # Build key payload from selected or all params
            if key_from_kwargs is not None:
                key_params = {k: v for k, v in all_params.items() if k in key_from_kwargs}
            else:
                key_params = dict(all_params)

            # Scope key by tenant so tenants never share entries
            if self_obj is not None and hasattr(self_obj, "tenant_id"):
                key_params["_tenant"] = self_obj.tenant_id

            key = _make_key(prefix, **key_params)

            hit = get_cached(key)
            if hit is not None:
                return hit

            result = await fn(*args, **kwargs)
            set_cached(key, result, ttl)
            return result

        return wrapper
    return decorator
