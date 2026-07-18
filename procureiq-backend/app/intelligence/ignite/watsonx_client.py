"""IBM watsonx SDK wrapper with Ollama fallback."""
from __future__ import annotations
import httpx
from typing import AsyncGenerator

from app.config import settings


class WatsonxClient:
    """Thin async wrapper around the IBM watsonx.ai REST API.

    Falls back to Ollama for local inference when watsonx is unavailable.
    """

    async def _get_iam_token(self) -> str:
        if not settings.WATSONX_API_KEY:
            raise RuntimeError("WATSONX_API_KEY is not configured")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                    "apikey": settings.WATSONX_API_KEY,
                },
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def generate(self, *, system: str, user: str) -> tuple[str, bool]:
        """Single-turn text generation via watsonx. Returns (text, is_local)."""
        token = await self._get_iam_token()
        payload = {
            "model_id": settings.WATSONX_MODEL_ID,
            "project_id": settings.WATSONX_PROJECT_ID,
            "input": f"[SYSTEM]\n{system}\n\n[USER]\n{user}",
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 1024,
                "temperature": 0.2,
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.WATSONX_URL}/ml/v1/text/generation?version=2024-05-31",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            text = resp.json()["results"][0]["generated_text"]
            return text, False

    async def stream(self, *, system: str, user: str) -> AsyncGenerator[str, None]:
        """Streaming text generation via watsonx (SSE)."""
        token = await self._get_iam_token()
        payload = {
            "model_id": settings.WATSONX_MODEL_ID,
            "project_id": settings.WATSONX_PROJECT_ID,
            "input": f"[SYSTEM]\n{system}\n\n[USER]\n{user}",
            "parameters": {"decoding_method": "greedy", "max_new_tokens": 1024},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{settings.WATSONX_URL}/ml/v1/text/generation_stream?version=2024-05-31",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        chunk = json.loads(line[6:])
                        token_text = chunk.get("results", [{}])[0].get("generated_text", "")
                        if token_text:
                            yield token_text

    # ── Ollama fallback ────────────────────────────────────────────────────────

    async def generate_local(self, *, system: str, user: str) -> tuple[str, bool]:
        """Single-turn via Ollama local inference. Returns (text, is_local=True)."""
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": f"[SYSTEM]\n{system}\n\n[USER]\n{user}",
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
            resp.raise_for_status()
            return resp.json()["response"], True

    async def stream_local(self, *, system: str, user: str) -> AsyncGenerator[str, None]:
        """Streaming via Ollama local inference."""
        import json
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": f"[SYSTEM]\n{system}\n\n[USER]\n{user}",
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload
            ) as resp:
                async for line in resp.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if chunk.get("response"):
                            yield chunk["response"]
