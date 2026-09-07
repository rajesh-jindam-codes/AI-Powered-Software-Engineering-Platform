"""DEVFLOW AI Service — Configuration Management."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    SERVICE_NAME: str = "DEVFLOW AI Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", alias="ENVIRONMENT")
    PORT: int = Field(default=8000, alias="PORT")
    HOST: str = Field(default="0.0.0.0", alias="HOST")
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:4000",
    ]

    # Database & Storage
    DATABASE_URL: str = "postgresql://devflow:devflow_password@localhost:5432/devflow_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    KAFKA_BROKERS: str = "localhost:9092"

    # LLM Keys
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None


settings = Settings()
