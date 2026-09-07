"""API Router aggregation for AI Service."""

from fastapi import APIRouter
from app.api.routes import health, info, rag

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(info.router)
api_router.include_router(rag.router)
