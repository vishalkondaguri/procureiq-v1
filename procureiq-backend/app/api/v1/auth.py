"""Auth endpoints — login, refresh, logout, me, register, forgot-password, reset-password."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
import secrets
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token, create_refresh_token,
    verify_password, decode_access_token, hash_password,
    ALGORITHM,
)
from app.core.dependencies import get_async_session, get_current_user
from app.config import settings
from app.models.user import User, USER_STATUS_PENDING
import jwt

# IBM-domain whitelist for self-service registration
_ALLOWED_DOMAINS = {"ibm.com", "watsonx.ibm.com", "procureiq.ai"}
_DEFAULT_TENANT  = "demo-tenant-001"

router = APIRouter()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    tenant_id: str

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    company: str


class RegisterResponse(BaseModel):
    message: str
    status: str  # 'pending'


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


TokenResponse.model_rebuild()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password that meets common complexity requirements."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    # Guarantee at least one of each required class
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%"),
    ]
    pwd += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)


def _create_reset_token(user_id: str) -> str:
    """JWT signed token specifically for password reset (type='reset')."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "reset",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def _decode_reset_token(token: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if data.get("type") != "reset":
            return None
        return data
    except jwt.PyJWTError:
        return None


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_202_ACCEPTED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_async_session),
):
    """Public endpoint — submit an access request (creates user with status='pending').
    
    Only allows IBM-domain emails. Duplicate requests for the same email are silently
    accepted so as not to leak whether an account already exists.
    """
    domain = body.email.split("@")[-1].lower() if "@" in body.email else ""
    if domain not in _ALLOWED_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Registration is restricted to @ibm.com, @watsonx.ibm.com and @procureiq.ai addresses.",
        )

    # Check if email already submitted (return same success to avoid enumeration)
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none() is not None:
        return RegisterResponse(
            message="Your access request has already been received. An administrator will review it shortly.",
            status="pending",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        email=body.email.lower(),
        full_name=body.full_name.strip(),
        # Store company in full_name suffix for now (no separate column needed)
        hashed_password=hash_password(str(uuid.uuid4())),  # random unusable password
        role="analyst",
        is_active=False,          # cannot log in until approved
        status=USER_STATUS_PENDING,
        tenant_id=_DEFAULT_TENANT,
    )
    db.add(new_user)
    await db.commit()

    return RegisterResponse(
        message=f"Access request submitted for {body.email}. An administrator will review it shortly.",
        status="pending",
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        if getattr(user, "status", None) == "pending":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account pending approval — an administrator will review your access request shortly.",
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled. Contact your administrator.")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_async_session),
):
    payload = decode_access_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(subject=user.id),
        refresh_token=create_refresh_token(subject=user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/logout")
async def logout():
    # In production: add refresh token to Redis deny-list
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_async_session),
):
    """Send a password-reset email.

    Always returns 202 regardless of whether the email exists —
    to prevent user-enumeration attacks.
    """
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user: User | None = result.scalar_one_or_none()

    if user and user.is_active:
        reset_token = _create_reset_token(user.id)
        from app.services.email_service import send_password_reset_email
        await send_password_reset_email(
            to_email=user.email,
            full_name=user.full_name,
            reset_token=reset_token,
        )

    return {
        "message": (
            "If an account with that email exists and is active, "
            "a password-reset link has been sent. Please check your inbox."
        )
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_async_session),
):
    """Validate the reset token and set the new password."""
    payload = _decode_reset_token(body.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )

    # Basic password strength check
    pwd = body.new_password
    if len(pwd) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if not any(c.isupper() for c in pwd):
        raise HTTPException(status_code=422, detail="Password must contain at least one uppercase letter.")
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(status_code=422, detail="Password must contain at least one number.")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    user.hashed_password = hash_password(pwd)
    await db.commit()

    return {"message": "Password updated successfully. You can now sign in with your new password."}
