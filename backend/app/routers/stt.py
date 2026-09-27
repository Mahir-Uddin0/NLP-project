import logging
from typing import Optional, List
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from app.core.config import settings
from app.schemas.stt import STTResponse
from app.services.stt_service import stt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stt", tags=["Speech to Text"])


@router.get("/status")
async def get_stt_status():
    """Returns the configuration status of the Groq STT engine."""
    has_key = bool(settings.GROQ_API_KEY)
    return {
        "status": "ready" if has_key else "missing_api_key",
        "provider": "Groq Whisper API",
        "default_model": settings.DEFAULT_STT_MODEL,
        "available_models": [
            {
                "id": "whisper-large-v3-turbo",
                "name": "Whisper Large v3 Turbo (Recommended)",
                "description": "Ultra-fast, multilingual speech recognition with high accuracy",
            },
            {
                "id": "whisper-large-v3",
                "name": "Whisper Large v3",
                "description": "Maximum accuracy multilingual Whisper model",
            },
        ],
        "configured": has_key,
    }


@router.post("/transcribe", response_model=STTResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, M4A, OGG, WEBM, FLAC, MP4)"),
    language: Optional[str] = Form("auto", description="Audio language code (e.g. 'en', 'es', 'bn', or 'auto')"),
    model: Optional[str] = Form("whisper-large-v3-turbo", description="Groq Whisper model to use"),
    temperature: Optional[float] = Form(0.0, description="Sampling temperature (0.0 for deterministic output)"),
):
    """Transcribes spoken audio into text using Groq Whisper API.
    Supports both file uploads and microphone blobs directly from the browser.
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file provided.")

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
        logger.exception("STT route error")
        raise HTTPException(status_code=500, detail=f"STT processing failed: {str(e)}")
