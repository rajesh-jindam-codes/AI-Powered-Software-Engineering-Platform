"""Health check endpoints for AI Service."""

from datetime import datetime, timezone
import platform
import sys
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthStatus(BaseModel):
    status: str
    timestamp: str
    service: str
    environment: str
    pythonVersion: str
    platform: str
    services: dict[str, dict[str, str]]


@router.get("/health", response_model=HealthStatus)
@router.get("/api/v1/health", response_model=HealthStatus)
async def get_health() -> HealthStatus:
    """Returns AI service health status and runtime environment details."""
    from app.core.config import settings

    return HealthStatus(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        service=settings.SERVICE_NAME,
        environment=settings.ENVIRONMENT,
        pythonVersion=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        platform=platform.platform(),
        services={
            "vectorDatabase": {"status": "up"},
            "llmGateway": {"status": "up"},
            "astParser": {"status": "up"},
        },
    )


@router.get("/health/liveness")
async def get_liveness() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/health/readiness")
async def get_readiness() -> dict[str, str]:
    return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}
