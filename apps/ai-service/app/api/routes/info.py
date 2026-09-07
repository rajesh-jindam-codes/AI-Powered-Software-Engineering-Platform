"""System info endpoint for AI Service."""

from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(tags=["Info"])


class InfoResponse(BaseModel):
    service: str
    version: str
    environment: str
    apiPrefix: str
    timestamp: str
    capabilities: list[str]


@router.get("/api/v1/info", response_model=InfoResponse)
@router.get("/info", response_model=InfoResponse)
async def get_info() -> InfoResponse:
    """Returns capabilities and version metadata of AI Engine."""
    return InfoResponse(
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        apiPrefix=settings.API_PREFIX,
        timestamp=datetime.now(timezone.utc).isoformat(),
        capabilities=[
            "AST_SEMANTIC_CHUNKING",
            "HYBRID_DENSE_SPARSE_RETRIEVAL",
            "REACT_AGENT_RUNTIME",
            "SEMANTIC_PR_REVIEW",
            "TEST_CASE_MUTATION_SYNTHESIS",
        ],
    )
