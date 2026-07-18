"""One-shot script: verify ingestion_runs columns in the DB."""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import async_session_factory
from sqlalchemy import text

async def main():
    async with async_session_factory() as db:
        r = await db.execute(text(
            "SELECT column_name, data_type "
            "FROM information_schema.columns "
            "WHERE table_name='ingestion_runs' "
            "ORDER BY ordinal_position"
        ))
        print("ingestion_runs columns:")
        for row in r.fetchall():
            print(" ", row)

asyncio.run(main())
