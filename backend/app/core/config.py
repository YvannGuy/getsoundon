from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Phase 1 : proxy vers l’API Next (moteur + persistance). LangGraph viendra derrière ce service."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    next_assistant_base_url: str = "http://127.0.0.1:3000"
    """URL de base du site Next (sans slash final)."""

    cors_origins: str = "*"
    """Liste séparée par des virgules, ou * pour dev."""


def get_settings() -> Settings:
    return Settings()
