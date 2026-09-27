import logging
import base64
from typing import Optional
from app.schemas.tts import TTSResponse

logger = logging.getLogger(__name__)


class TTSService:
    """Service handling Text-to-Speech synthesis."""

    async def synthesize(self, text: str, voice: Optional[str] = "default", language: Optional[str] = "en") -> TTSResponse:
        logger.info(f"Synthesizing text of length {len(text)} to speech (voice={voice}, lang={language})")

        dummy_wav = (
            b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
            b"D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
        )
        audio_b64 = base64.b64encode(dummy_wav).decode("utf-8")

        return TTSResponse(
            audio_base64=audio_b64,
            content_type="audio/wav",
            text_length=len(text)
        )


tts_service = TTSService()
