from fastapi import APIRouter, HTTPException
from app.schemas.tts import TTSRequest, TTSResponse
from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["Text to Speech"])


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(payload: TTSRequest):
    try:
        return await tts_service.synthesize(
            text=payload.text,
            voice=payload.voice,
            language=payload.language
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")
