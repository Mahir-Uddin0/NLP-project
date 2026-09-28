import os
import logging
from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.schemas.stt import STTResponse
from app.services.stt_service import stt_service
from app.routers import (
    tts_router,
    translation_router,
    qa_router,
    ocr_router,
)

logger = logging.getLogger(__name__)

# Initialize FastAPI Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Fullstack NLP Platform API with Groq Whisper Speech-to-Text integration.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS middleware for Next.js frontend communication (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# FEATURE 1: SPEECH TO TEXT (STT) ENDPOINTS
# =====================================================================

@app.post(
    f"{settings.API_V1_STR}/stt/transcribe",
    response_model=STTResponse,
    tags=["Speech to Text"],
    summary="Transcribe Audio via Groq Whisper",
)
@app.post(
    "/stt/transcribe",
    response_model=STTResponse,
    include_in_schema=False,
)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, M4A, OGG, WEBM, FLAC) or recorded voice blob"),
    language: Optional[str] = Form("auto", description="Audio language code (e.g. 'en', 'es', 'bn', or 'auto' for auto-detection)"),
    model: Optional[str] = Form("whisper-large-v3-turbo", description="Groq Whisper model to use ('whisper-large-v3-turbo' or 'whisper-large-v3')"),
    temperature: Optional[float] = Form(0.0, description="Sampling temperature (0.0 for deterministic output)"),
):
    """Transcribes spoken audio into text using Groq Whisper API.
    Supports audio uploads as well as live microphone recordings from the browser.
    Returns transcript, language, duration, word count, and timestamped segments.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file received.")

        filename = file.filename or "recording.webm"
        return await stt_service.transcribe_audio_bytes(
            audio_bytes=content,
            filename=filename,
            language=language,
            model=model,
            temperature=temperature or 0.0,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("STT processing error in main.py")
        raise HTTPException(status_code=500, detail=f"STT processing failed: {str(e)}")


@app.get(
    f"{settings.API_V1_STR}/stt/status",
    tags=["Speech to Text"],
    summary="Check STT Engine Configuration",
)
async def get_stt_status():
    """Returns the configuration status of the Groq Whisper STT engine."""
    has_key = bool(settings.GROQ_API_KEY)
    return {
        "status": "ready" if has_key else "missing_api_key",
        "provider": "Groq Whisper API",
        "default_model": settings.DEFAULT_STT_MODEL,
        "available_models": [
            {
                "id": "whisper-large-v3-turbo",
                "name": "Whisper Large v3 Turbo (Recommended)",
                "description": "Ultra-fast, multilingual speech recognition (~1s latency)",
            },
            {
                "id": "whisper-large-v3",
                "name": "Whisper Large v3",
                "description": "Maximum accuracy multilingual Whisper model",
            },
        ],
        "configured": has_key,
    }


# =====================================================================
# SYSTEM & HEALTH ENDPOINTS
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    """System health check used by frontend to monitor API availability."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "endpoints": {
            "stt_transcribe": f"{settings.API_V1_STR}/stt/transcribe",
            "stt_status": f"{settings.API_V1_STR}/stt/status",
        },
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health",
        "groq_status": "ready" if settings.GROQ_API_KEY else "missing_key",
    }


# =====================================================================
# ROUTERS FOR SUBSEQUENT FEATURES (TTS, Translation, QA, OCR)
# =====================================================================
app.include_router(tts_router, prefix=settings.API_V1_STR)
app.include_router(translation_router, prefix=settings.API_V1_STR)
app.include_router(qa_router, prefix=settings.API_V1_STR)
app.include_router(ocr_router, prefix=settings.API_V1_STR)
