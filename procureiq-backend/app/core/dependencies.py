"""Shared FastAPI dependencies — database sessions, authentication, RBAC."""
from __future__ import annotations
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_async_session():  # type: ignore[return]
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user: User | None = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: str):
    """Dependency factory for role-based access control."""
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(roles)}",
            )
        return current_user
    return _check
