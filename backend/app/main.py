from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.assistant import router as assistant_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="GetSoundOn Assistant API", version="0.1.0")

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
_use_star = _origins == ["*"] or not _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _use_star else _origins,
    allow_credentials=not _use_star,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
