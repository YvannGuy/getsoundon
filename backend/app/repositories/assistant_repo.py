"""
Persistance Supabase côté Python — phase ultérieure.

Aujourd’hui la source de vérité est Next.js (service_role) via /api/assistant/*.
"""

from typing import Any


class AssistantRepository:
    async def load_snapshot(self, session_id: str) -> dict[str, Any] | None:
        raise NotImplementedError("Brancher supabase-py + tables assistant_* dans une phase suivante.")

    async def save_snapshot(self, session_id: str, payload: dict[str, Any]) -> None:
        raise NotImplementedError("Brancher supabase-py + tables assistant_* dans une phase suivante.")
