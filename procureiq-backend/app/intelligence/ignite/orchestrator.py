"""Ignite AI Orchestrator v3 — richer tool dispatch, module-aware context, conversation memory.

Execution priority:
  1. IBM watsonx   — if WATSONX_API_KEY is configured
  2. Ollama        — if OLLAMA_ENABLED=true and ollama is reachable
  3. Smart offline — always available; generates data-grounded answers from live DB tools
"""
from __future__ import annotations
import logging
import uuid
from typing import AsyncGenerator

from app.config import settings
from app.intelligence.ignite.watsonx_client import WatsonxClient
from app.intelligence.ignite.prompt_templates import build_system_prompt
from app.intelligence.ignite.tools import IGNITE_TOOLS, dispatch_tool
from app.intelligence.ignite.smart_offline import SmartOfflineEngine

logger = logging.getLogger(__name__)

# Simple in-process conversation store (Phase 4: move to Redis/DB)
_conversations: dict[str, list[dict]] = {}


class IgniteOrchestrator:
    """
    Coordinates the full Ignite v3 request pipeline:
    1. Classify intent using keyword + pattern matching
    2. Dispatch registered tools (query_spend, risk_scores, savings, contracts, etc.)
    3. Attempt watsonx generation (if API key configured)
    4. Fall back to Ollama (if enabled and reachable)
    5. Fall back to SmartOfflineEngine — data-grounded answers, always works
    """

    def __init__(self, db=None, tenant_id: str = ""):
        self.client    = WatsonxClient()
        self.db        = db
        self.tenant_id = tenant_id or "demo-tenant-001"

    # ── Public API ─────────────────────────────────────────────────────────────

    async def handle(self, *, message: str, module_context: str, user, conversation_id: str | None) -> dict:
        """Single-turn, non-streaming response with full tool augmentation."""
        conv_id   = conversation_id or str(uuid.uuid4())
        history   = _conversations.get(conv_id, [])

        tool_results = await self._dispatch_tools(message)

        reply, is_local = await self._generate(
            message=message,
            module_context=module_context,
            user=user,
            tool_results=tool_results,
            history=history,
        )

        # Persist turn
        _conversations.setdefault(conv_id, []).extend([
            {"role": "user",      "content": message},
            {"role": "assistant", "content": reply},
        ])
        if len(_conversations[conv_id]) > 40:
            _conversations[conv_id] = _conversations[conv_id][-40:]

        citations = [{"sourceType": r["tool"], "label": r["label"]} for r in tool_results]
        return {
            "reply":              reply,
            "citations":          citations,
            "is_local_inference": is_local,
            "conversation_id":    conv_id,
        }

    async def stream(
        self,
        *,
        message: str,
        module_context: str,
        conversation_id: str | None,
    ) -> AsyncGenerator[dict, None]:
        """Token-by-token streaming with tool augmentation."""
        conv_id      = conversation_id or str(uuid.uuid4())
        history      = _conversations.get(conv_id, [])
        system_prompt = build_system_prompt(module_context=module_context, user=None)

        tool_results  = await self._dispatch_tools(message)
        user_prompt   = self._build_augmented_prompt(message, tool_results, history)

        accumulated = ""
        citations   = [{"sourceType": r["tool"], "label": r["label"]} for r in tool_results]

        # ── Try watsonx (only when real credentials are configured) ───────────
        if settings.watsonx_configured:
            try:
                async for token in self.client.stream(system=system_prompt, user=user_prompt):
                    accumulated += token
                    yield {"type": "token", "content": token}
                yield {"type": "done", "citations": citations,
                       "is_local_inference": False, "conversation_id": conv_id}
                _conversations.setdefault(conv_id, []).extend([
                    {"role": "user",      "content": message},
                    {"role": "assistant", "content": accumulated},
                ])
                return
            except Exception as exc:
                logger.warning("watsonx stream failed: %s", exc)

        # ── Try Ollama (only when explicitly enabled) ─────────────────────────
        if settings.ollama_configured:
            try:
                async for token in self.client.stream_local(system=system_prompt, user=user_prompt):
                    accumulated += token
                    yield {"type": "token", "content": token}
                yield {"type": "done", "citations": citations,
                       "is_local_inference": True, "conversation_id": conv_id}
                _conversations.setdefault(conv_id, []).extend([
                    {"role": "user",      "content": message},
                    {"role": "assistant", "content": accumulated},
                ])
                return
            except Exception as exc:
                logger.warning("Ollama stream also failed: %s", exc)

        # ── Smart offline engine (always works) ───────────────────────────────
        engine   = SmartOfflineEngine()
        response = engine.generate(
            message=message,
            module_context=module_context,
            tool_results=tool_results,
            history=history,
        )

        # Stream word-by-word so the UI still gets the typing effect
        words = response.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            accumulated += chunk
            yield {"type": "token", "content": chunk}

        yield {"type": "done", "citations": citations,
               "is_local_inference": True, "conversation_id": conv_id}

        _conversations.setdefault(conv_id, []).extend([
            {"role": "user",      "content": message},
            {"role": "assistant", "content": accumulated},
        ])

    # ── Private helpers ────────────────────────────────────────────────────────

    async def _generate(
        self, *, message: str, module_context: str, user, tool_results: list[dict], history: list[dict]
    ) -> tuple[str, bool]:
        """Try watsonx → Ollama → smart offline. Returns (reply, is_local)."""
        system_prompt = build_system_prompt(module_context=module_context, user=user)
        user_prompt   = self._build_augmented_prompt(message, tool_results, history)

        if settings.watsonx_configured:
            try:
                return await self.client.generate(system=system_prompt, user=user_prompt)
            except Exception as exc:
                logger.warning("watsonx unavailable: %s", exc)

        if settings.ollama_configured:
            try:
                return await self.client.generate_local(system=system_prompt, user=user_prompt)
            except Exception as exc:
                logger.warning("Ollama unavailable: %s", exc)

        engine = SmartOfflineEngine()
        reply  = engine.generate(
            message=message,
            module_context=module_context,
            tool_results=tool_results,
            history=history,
        )
        return reply, True

    async def _dispatch_tools(self, message: str) -> list[dict]:
        """Invoke all matching tools and collect results."""
        results = []
        for tool in IGNITE_TOOLS:
            if tool.should_invoke(message):
                try:
                    result = await dispatch_tool(tool.name, message, self.db, self.tenant_id)
                    results.append(result)
                except Exception as exc:
                    logger.warning("Tool %s failed: %s", tool.name, exc)
        return results

    def _build_augmented_prompt(
        self, message: str, tool_results: list[dict], history: list[dict]
    ) -> str:
        parts = []
        if history:
            recent = history[-6:]
            conv_ctx = "\n".join(
                f"{'User' if t['role'] == 'user' else 'Ignite'}: {t['content']}"
                for t in recent
            )
            parts.append(f"[Previous conversation]\n{conv_ctx}")
        if tool_results:
            data_ctx = "\n".join(f"[{r['tool']}] {r['content']}" for r in tool_results)
            parts.append(f"[Live procurement data]\n{data_ctx}")
        parts.append(f"[User question]\n{message}")
        return "\n\n".join(parts)
