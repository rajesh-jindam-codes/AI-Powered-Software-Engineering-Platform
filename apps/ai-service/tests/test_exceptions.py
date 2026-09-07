"""Tests for AI Service exception handling and RFC 7807 problem details."""

import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import APIRouter
from app.main import app
from app.core.exceptions import DevFlowException

error_test_router = APIRouter()


@error_test_router.get("/test-error")
async def trigger_error():
    raise DevFlowException(
        message="Model context window exceeded.",
        status_code=400,
        code="CONTEXT_LIMIT_EXCEEDED",
        details={"maxTokens": 8192, "requestedTokens": 10500},
    )


app.include_router(error_test_router)


@pytest.mark.asyncio
async def test_devflow_exception_format():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/test-error", headers={"x-request-id": "req-custom-999"})
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "CONTEXT_LIMIT_EXCEEDED"
        assert data["detail"] == "Model context window exceeded."
        assert data["traceId"] == "req-custom-999"
        assert data["details"]["maxTokens"] == 8192
