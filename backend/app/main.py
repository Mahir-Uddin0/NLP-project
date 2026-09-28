from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import (
    stt_router,
    tts_router,
    translation_router,
    qa_router,
    ocr_router,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS configuration for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Feature Routers
app.include_router(stt_router, prefix=settings.API_V1_STR)
app.include_router(tts_router, prefix=settings.API_V1_STR)
app.include_router(translation_router, prefix=settings.API_V1_STR)
app.include_router(qa_router, prefix=settings.API_V1_STR)
app.include_router(ocr_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "elevenlabs_configured": bool(settings.ELEVENLABS_API_KEY),
        "features": {
            "stt": f"{settings.API_V1_STR}/stt/transcribe",
            "tts": f"{settings.API_V1_STR}/tts/synthesize",
            "translation": f"{settings.API_V1_STR}/translation/translate",
            "qa": f"{settings.API_V1_STR}/qa/ask",
            "ocr": f"{settings.API_V1_STR}/ocr/extract",
        }
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health",
        "groq_status": "configured" if settings.GROQ_API_KEY else "missing_key"
    }
