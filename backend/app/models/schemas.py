from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    session_id: str | None = Field(default=None, description="UUID session existante")


class AssistantMeta(BaseModel):
    matches_stub: bool = False
    provider_count: int = 0


class MessageResponse(BaseModel):
    session_id: str
    state: dict[str, Any]
    recommended: dict[str, Any] | list[Any] | None = None
    ranked_providers: list[dict[str, Any]] = Field(default_factory=list)
    ready_for_results: bool = False
    meta: AssistantMeta = Field(default_factory=AssistantMeta)


class ErrorBody(BaseModel):
    error: str
    details: dict[str, Any] | None = None


# Modèles cibles LangGraph / state explicite (MVP typé léger, JSON côté fil)
class SlotStub(BaseModel):
    status: Literal["empty", "candidate", "resolved", "ambiguous"] = "empty"


class AssistantStateStub(BaseModel):
    """Placeholder : le state canonique reste JSON côté Next jusqu’au port Python complet."""

    session_id: str | None = None
    user_id: str | None = None
    messages: list[dict[str, Any]] = Field(default_factory=list)
    slots: dict[str, Any] = Field(default_factory=dict)
    qualification: dict[str, Any] = Field(default_factory=dict)
    brief: dict[str, Any] = Field(default_factory=dict)
    recommendations: list[Any] = Field(default_factory=list)
    matches: list[Any] = Field(default_factory=list)
    interruption_pending: bool = False
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
