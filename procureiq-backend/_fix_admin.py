import asyncio, sys
sys.path.insert(0, '.')
from app.db.session import async_session_factory
from sqlalchemy import text

async def fix():
    async with async_session_factory() as db:
        result = await db.execute(text(
            "UPDATE users SET is_active = true, status = 'active' "
            "WHERE email IN ('admin@procureiq.ai','analyst@procureiq.ai','cpo@procureiq.ai','viewer@procureiq.ai')"
        ))
        await db.commit()
        print(f'[OK] Fixed {result.rowcount} user(s) — is_active=true, status=active')

asyncio.run(fix())
