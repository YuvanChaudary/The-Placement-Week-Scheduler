import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Placement Week Scheduler"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database & Supabase settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/placement_db"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # Application settings
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
