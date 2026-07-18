"""Ignite API v3 — REST + WebSocket with DB-aware tool dispatch."""
from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.intelligence.ignite.orchestrator import IgniteOrchestrator
from app.core.dependencies import get_current_user, get_async_session
from app.core.security import decode_access_token
from app.db.session import async_session_factory
from app.models.user import User
from sqlalchemy import select

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    module_context: str = "dashboard"
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    citations: list[dict] = []
    is_local_inference: bool = False
    conversation_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User     = Depends(get_current_user),
    db: AsyncSession       = Depends(get_async_session),
):
    """Single-turn Ignite query via REST with live data tools."""
    orchestrator = IgniteOrchestrator(db=db, tenant_id=str(current_user.tenant_id))
    result = await orchestrator.handle(
        message=request.message,
        module_context=request.module_context,
        user=current_user,
        conversation_id=request.conversation_id,
    )
    return result


@router.websocket("/stream")
async def chat_stream(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """
    Streaming Ignite conversation via WebSocket.

    Client connects: ws://localhost:8000/api/v1/ignite/stream?token=<jwt>
    Client sends JSON: {"message": "...", "module_context": "...", "conversation_id": "..."}
    Server emits:
      {"type": "token",  "content": "..."}   — one per token
      {"type": "done",   "citations": [...], "is_local_inference": bool, "conversation_id": "..."}
      {"type": "error",  "message": "..."}
    """
    await websocket.accept()

    # Authenticate via query-param token
    tenant_id = "demo-tenant-001"
    db_session = None
    try:
        if token:
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    db_session = async_session_factory()
                    async with db_session as db:
                        result = await db.execute(
                            select(User).where(User.id == user_id, User.deleted_at.is_(None))
                        )
                        user = result.scalar_one_or_none()
                        if user and user.is_active:
                            tenant_id = str(user.tenant_id)
    except Exception:
        pass  # fall back to demo tenant; still allow connection

    async with async_session_factory() as db:
        orchestrator = IgniteOrchestrator(db=db, tenant_id=tenant_id)
        try:
            while True:
                data = await websocket.receive_json()
                async for event in orchestrator.stream(
                    message=data.get("message", ""),
                    module_context=data.get("module_context", "dashboard"),
                    conversation_id=data.get("conversation_id"),
                ):
                    await websocket.send_json(event)
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass
