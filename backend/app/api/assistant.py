import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.models.schemas import MessageRequest, MessageResponse
from app.services.assistant_proxy_service import AssistantProxyService

router = APIRouter(prefix="/assistant", tags=["assistant"])

_settings = get_settings()
_service = AssistantProxyService(_settings.next_assistant_base_url)


@router.post("/message", response_model=MessageResponse)
async def post_message(body: MessageRequest) -> MessageResponse:
    try:
        return await _service.post_message(body.message, body.session_id)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/session/{session_id}", response_model=MessageResponse)
async def get_session(session_id: str) -> MessageResponse:
    try:
        return await _service.get_session(session_id)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
