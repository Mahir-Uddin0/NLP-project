import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.schemas.tts import TTSRequest, TTSResponse, TTSVoiceInfo, TTSStatusResponse
from app.services.tts_service import tts_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["Text to Speech"])


@router.get("/status", response_model=TTSStatusResponse)
async def get_tts_status():
    """Returns the configuration status, available engines, models, and voices."""
    return tts_service.get_status()


@router.get("/voices", response_model=List[TTSVoiceInfo])
async def list_voices(
    provider: Optional[str] = Query(None, description="Filter voices by provider ('elevenlabs' or 'edge-tts')")
):
    """Returns the list of curated high-quality voices."""
    return tts_service.get_voices(provider)


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(payload: TTSRequest):
    """Synthesizes text into natural-sounding speech audio using ElevenLabs or Free Neural TTS.
    Returns base64 encoded MP3 audio along with duration and character counts.
    """
    try:
        return await tts_service.synthesize(payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("TTS Route Error")
        raise HTTPException(status_code=500, detail=f"Text-to-Speech synthesis failed: {str(e)}")
