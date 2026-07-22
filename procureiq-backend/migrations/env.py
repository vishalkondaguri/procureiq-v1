"""Alembic environment for ProcureIQ migrations."""
from __future__ import annotations
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.models.base import Base
# Import ALL models so they are registered with metadata
import app.models.user      # noqa: F401
import app.models.supplier  # noqa: F401
import app.models.spend     # noqa: F401
import app.models.contract  # noqa: F401
import app.models.ingestion # noqa: F401
import app.models.risk      # noqa: F401
import app.models.savings   # noqa: F401
import app.models.audit     # noqa: F401
import app.models.settings  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Allow DATABASE_URL env var to override alembic.ini
# Alembic uses a SYNC driver — strip asyncpg, use psycopg2
_db_url = os.environ.get("DATABASE_URL", "")
if _db_url:
    # Handle all possible Railway URL prefixes
    _sync_url = (
        _db_url
        .replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgres://", "postgresql://")  # some Railway URLs use postgres://
    )
    config.set_main_option("sqlalchemy.url", _sync_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
