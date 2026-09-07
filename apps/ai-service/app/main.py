"""DEVFLOW AI — FastAPI Intelligence & Agent Service Entrypoint."""

from contextlib import asynccontextmanager
import time
import uuid
from typing import AsyncGenerator
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import (
    DevFlowException,
    devflow_exception_handler,
    generic_exception_handler,
)
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and graceful shutdown lifecycle handler."""
    logger.info(
        f"Starting {settings.SERVICE_NAME} v{settings.VERSION} on {settings.HOST}:{settings.PORT}"
    )
    yield
    logger.info(f"Shutting down {settings.SERVICE_NAME}")


def create_app() -> FastAPI:
    """Factory function creating configured FastAPI application."""
    application = FastAPI(
        title=settings.SERVICE_NAME,
        version=settings.VERSION,
        description="DEVFLOW AI — Python AI Intelligence, AST RAG & Agent Engine",
        lifespan=lifespan,
    )

    # CORS Middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID & Logging Middleware
    @application.middleware("http")
    async def request_middleware(request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.time()
        response: Response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            f"{request.method} {request.url.path} {response.status_code} - {duration_ms}ms (ID: {request_id})"
        )
        return response

    # Exception Handlers
    application.add_exception_handler(DevFlowException, devflow_exception_handler)
    application.add_exception_handler(Exception, generic_exception_handler)

    # Include API Routers
    application.include_router(api_router)

    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
