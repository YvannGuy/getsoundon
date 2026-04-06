"""
Délègue au route handler Next qui exécute le moteur TS et persiste dans Supabase.
Permet d’exposer un point d’entrée Python (mobile, workers) sans dupliquer la logique métier.
"""

from typing import Any

import httpx

from app.models.schemas import AssistantMeta, MessageResponse


class AssistantProxyService:
    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")

    async def post_message(self, message: str, session_id: str | None) -> MessageResponse:
        url = f"{self._base}/api/assistant/message"
        body: dict[str, Any] = {"message": message}
        if session_id:
            body["session_id"] = session_id
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        return self._parse_response(data)

    async def get_session(self, session_id: str) -> MessageResponse:
        url = f"{self._base}/api/assistant/session/{session_id}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        return self._parse_response(data)

    def _parse_response(self, data: dict[str, Any]) -> MessageResponse:
        meta_raw = data.get("meta") or {}
        meta = AssistantMeta(
            matches_stub=bool(meta_raw.get("matches_stub", False)),
            provider_count=int(meta_raw.get("provider_count", 0)),
        )
        return MessageResponse(
            session_id=data["session_id"],
            state=data.get("state") or {},
            recommended=data.get("recommended"),
            ranked_providers=data.get("ranked_providers") or [],
            ready_for_results=bool(data.get("ready_for_results", False)),
            meta=meta,
        )
