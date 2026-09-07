"""DEVFLOW AI Service — Custom Exceptions & RFC 7807 Handlers."""

from datetime import datetime, timezone
from typing import Any
from fastapi import Request
from fastapi.responses import JSONResponse


class DevFlowException(Exception):
    """Base exception for DevFlow AI errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        code: str = "AI_SERVICE_ERROR",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}


async def devflow_exception_handler(request: Request, exc: DevFlowException) -> JSONResponse:
    """Formats DevFlowException as RFC 7807 Problem Details."""
    trace_id = request.headers.get("x-request-id", "unknown")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": f"https://api.devflow.ai/errors/{exc.code.lower().replace('_', '-')}",
            "title": exc.code.replace("_", " ").title(),
            "status": exc.status_code,
            "detail": exc.message,
            "instance": str(request.url.path),
            "code": exc.code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "traceId": trace_id,
            "details": exc.details,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Formats unhandled exceptions as RFC 7807 Problem Details."""
    trace_id = request.headers.get("x-request-id", "unknown")

    return JSONResponse(
        status_code=500,
        content={
            "type": "https://api.devflow.ai/errors/internal-server-error",
            "title": "Internal Server Error",
            "status": 500,
            "detail": "An unexpected error occurred in the AI intelligence engine.",
            "instance": str(request.url.path),
            "code": "INTERNAL_AI_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "traceId": trace_id,
        },
    )
