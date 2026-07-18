"""Auth and Spend API integration tests."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    """FastAPI app should be importable and respond to docs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/docs")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_login_bad_credentials():
    """Login with wrong credentials should return 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@example.com", "password": "wrong"},
        )
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_spend_summary_requires_auth():
    """Spend summary endpoint must return 401 without a token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/spend/summary")
        assert r.status_code == 401
