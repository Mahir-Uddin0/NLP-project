import logging
from typing import Optional, List
import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.schemas.stt import STTResponse, STTSegment

logger = logging.getLogger(__name__)

MIME_MAP = {
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "m4a": "audio/m4a",
    "ogg": "audio/ogg",
    "webm": "audio/webm",
    "flac": "audio/flac",
    "mp4": "audio/mp4",
}


class STTService:
    """Service handling Speech-to-Text processing using Groq's high-speed Whisper API."""

    def __init__(self):
        self.base_url = settings.GROQ_BASE_URL
        self.default_model = settings.DEFAULT_STT_MODEL

    async def transcribe_audio_bytes(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        language: Optional[str] = "auto",
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> STTResponse:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="GROQ_API_KEY is not configured in the backend environment. Please check backend/.env.",
            )

        selected_model = model or self.default_model
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
        mime_type = MIME_MAP.get(ext, "audio/webm")

        logger.info(
            f"Sending STT request to Groq: file='{filename}' ({len(audio_bytes)} bytes), "
            f"mime='{mime_type}', model='{selected_model}', lang='{language}'"
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
        }

        form_data = {
            "model": selected_model,
            "response_format": "verbose_json",
            "temperature": str(temperature),
        }

        # Only pass language if it is not auto-detect
        if language and language.lower() not in ("auto", "none", ""):
            form_data["language"] = language.lower()

        files = {
            "file": (filename, audio_bytes, mime_type),
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=headers,
                    files=files,
                    data=form_data,
                )

            if res.status_code != 200:
                error_body = res.text
                logger.error(f"Groq STT error ({res.status_code}): {error_body}")
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Groq Whisper transcription failed: {error_body}",
                )

            data = res.json()
            transcript = (data.get("text") or "").strip()
            detected_lang = data.get("language", language or "en")
            duration = data.get("duration")

            segments: List[STTSegment] = []
            for raw_seg in data.get("segments", []):
                segments.append(
                    STTSegment(
                        id=raw_seg.get("id", len(segments)),
                        start=round(raw_seg.get("start", 0.0), 2),
                        end=round(raw_seg.get("end", 0.0), 2),
                        text=(raw_seg.get("text") or "").strip(),
                    )
                )

            word_count = len(transcript.split()) if transcript else 0

            return STTResponse(
                transcript=transcript,
                language=detected_lang,
                duration_seconds=round(duration, 2) if duration is not None else None,
                model_used=selected_model,
                word_count=word_count,
                segments=segments,
            )

        except HTTPException:
            raise
        except httpx.RequestError as exc:
            logger.error(f"Network error connecting to Groq API: {exc}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to communicate with Groq Whisper API: {str(exc)}",
            )
        except Exception as exc:
            logger.exception("Unexpected error during STT processing")
            raise HTTPException(
                status_code=500,
                detail=f"STT processing failed: {str(exc)}",
            )


stt_service = STTService()
