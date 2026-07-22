"""Async SQLAlchemy session factory."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings

# Railway PostgreSQL may give postgres:// or postgresql:// — normalise to postgresql+asyncpg://
def _async_db_url(raw: str) -> str:
    url = raw
    url = url.replace("postgres://", "postgresql://")
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # If already has +asyncpg, the above could double it — normalise
    url = url.replace("postgresql+asyncpg+asyncpg://", "postgresql+asyncpg://")
    return url

_db_url = _async_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)
