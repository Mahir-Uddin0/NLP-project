import os
import base64
import logging
import asyncio
from typing import Optional, List, Dict, Any
import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.tts import TTSRequest, TTSResponse, TTSVoiceInfo, TTSStatusResponse

logger = logging.getLogger(__name__)

# Curated ElevenLabs default premier voices
ELEVENLABS_VOICES: List[TTSVoiceInfo] = [
    TTSVoiceInfo(
        voice_id="21m00Tcm4TlvDq8ikWAM",
        name="Rachel",
        provider="elevenlabs",
        gender="female",
        accent="American",
        description="Calm, warm, and natural conversational voice (Default)",
    ),
    TTSVoiceInfo(
        voice_id="pNInz6obpgDQGcFmaJgB",
        name="Adam",
        provider="elevenlabs",
        gender="male",
        accent="American",
        description="Deep, confident, and professional narration",
    ),
    TTSVoiceInfo(
        voice_id="ErXwobaYiN019PkySvjV",
        name="Antoni",
        provider="elevenlabs",
        gender="male",
        accent="American",
        description="Well-rounded, pleasant storyteller voice",
    ),
    TTSVoiceInfo(
        voice_id="EXAVITQu4vr4xnSDxMaL",
        name="Bella",
        provider="elevenlabs",
        gender="female",
        accent="American",
        description="Soft, pleasant, and empathetic female voice",
    ),
    TTSVoiceInfo(
        voice_id="TxGEqnHWrfWFTfGW9XjX",
        name="Josh",
        provider="elevenlabs",
        gender="male",
        accent="American",
        description="Young, deep, authoritative voice for presentations",
    ),
    TTSVoiceInfo(
        voice_id="JBFqnCBsd6RMkjVDRZzb",
        name="George",
        provider="elevenlabs",
        gender="male",
        accent="British",
        description="Warm, sophisticated British male narrative tone",
    ),
    TTSVoiceInfo(
        voice_id="Xb7hH8MSUJpSbSDYk0k2",
        name="Alice",
        provider="elevenlabs",
        gender="female",
        accent="British",
        description="Clear, confident, news anchor style British voice",
    ),
    TTSVoiceInfo(
        voice_id="yoZ06aMxZJJ28mfd3POQ",
        name="Sam",
        provider="elevenlabs",
        gender="male",
        accent="American",
        description="Dynamic, raspy, energetic commercial voice",
    ),
    TTSVoiceInfo(
        voice_id="XB0fDUnXU5powFXDhCwa",
        name="Charlotte",
        provider="elevenlabs",
        gender="female",
        accent="Swedish / European",
        description="Distinctive, elegant, video games and audiobooks",
    ),
    TTSVoiceInfo(
        voice_id="nPczCjzI2devNBz1zQrb",
        name="Brian",
        provider="elevenlabs",
        gender="male",
        accent="American",
        description="Deep, resonant, classic documentary style",
    ),
]

# Curated Free Neural Voices (Edge-TTS)
FREE_NEURAL_VOICES: List[TTSVoiceInfo] = [
    TTSVoiceInfo(
        voice_id="en-US-JennyNeural",
        name="Jenny (US Neural)",
        provider="edge-tts",
        gender="female",
        accent="American",
        description="Natural, expressive American female voice",
    ),
    TTSVoiceInfo(
        voice_id="en-US-GuyNeural",
        name="Guy (US Neural)",
        provider="edge-tts",
        gender="male",
        accent="American",
        description="Friendly, conversational American male voice",
    ),
    TTSVoiceInfo(
        voice_id="en-US-AriaNeural",
        name="Aria (US Expressive)",
        provider="edge-tts",
        gender="female",
        accent="American",
        description="Highly expressive, news and storytelling",
    ),
    TTSVoiceInfo(
        voice_id="en-GB-SoniaNeural",
        name="Sonia (UK Neural)",
        provider="edge-tts",
        gender="female",
        accent="British",
        description="Refined and articulate British female voice",
    ),
    TTSVoiceInfo(
        voice_id="en-GB-RyanNeural",
        name="Ryan (UK Neural)",
        provider="edge-tts",
        gender="male",
        accent="British",
        description="Smooth, natural British male voice",
    ),
    TTSVoiceInfo(
        voice_id="es-ES-ElviraNeural",
        name="Elvira (Spanish)",
        provider="edge-tts",
        gender="female",
        accent="Spanish (Spain)",
        description="Warm and natural European Spanish voice",
    ),
    TTSVoiceInfo(
        voice_id="fr-FR-DeniseNeural",
        name="Denise (French)",
        provider="edge-tts",
        gender="female",
        accent="French",
        description="Elegant, fluent French female voice",
    ),
    TTSVoiceInfo(
        voice_id="de-DE-KatjaNeural",
        name="Katja (German)",
        provider="edge-tts",
        gender="female",
        accent="German",
        description="Clear, standard German female voice",
    ),
    TTSVoiceInfo(
        voice_id="bn-BD-NabanitaNeural",
        name="Nabanita (Bengali)",
        provider="edge-tts",
        gender="female",
        accent="Bengali (Bangladesh)",
        description="Standard natural Bengali female voice",
    ),
    TTSVoiceInfo(
        voice_id="hi-IN-SwaraNeural",
        name="Swara (Hindi)",
        provider="edge-tts",
        gender="female",
        accent="Hindi (India)",
        description="Polished, natural Hindi female voice",
    ),
]

ELEVENLABS_MODELS = [
    {
        "id": "eleven_multilingual_v2",
        "name": "Eleven Multilingual v2",
        "description": "State of the art multilingual speech generation across 29 languages",
    },
    {
        "id": "eleven_flash_v2_5",
        "name": "Eleven Flash v2.5",
        "description": "Ultra-fast low-latency model designed for real-time speech",
    },
    {
        "id": "eleven_turbo_v2_5",
        "name": "Eleven Turbo v2.5",
        "description": "Balanced high performance and quality",
    },
]


class TTSService:
    """Service handling Text-to-Speech synthesis with ElevenLabs and Free Neural fallbacks."""

    def __init__(self):
        self.base_url = settings.ELEVENLABS_BASE_URL
        self.default_voice_id = settings.DEFAULT_TTS_VOICE_ID
        self.default_model = settings.DEFAULT_TTS_MODEL

    def get_elevenlabs_api_key(self) -> Optional[str]:
        """Dynamically retrieves ELEVENLABS_API_KEY from backend/.env or environment.
        Allows instant updates when user edits backend/.env without restarting the server.
        """
        from dotenv import dotenv_values
        for env_path in [
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            "backend/.env",
            ".env",
        ]:
            if os.path.isfile(env_path):
                try:
                    vals = dotenv_values(env_path)
                    val = vals.get("ELEVENLABS_API_KEY")
                    if val and val.strip():
                        return val.strip()
                except Exception:
                    pass
        return os.getenv("ELEVENLABS_API_KEY") or settings.ELEVENLABS_API_KEY

    def get_status(self) -> TTSStatusResponse:
        key = self.get_elevenlabs_api_key()
        has_key = bool(key)
        return TTSStatusResponse(
            elevenlabs_configured=has_key,
            default_voice_id=self.default_voice_id,
            default_model=self.default_model,
            providers=["elevenlabs", "edge-tts"],
            voices=ELEVENLABS_VOICES + FREE_NEURAL_VOICES,
            models=ELEVENLABS_MODELS,
        )

    def get_voices(self, provider: Optional[str] = None) -> List[TTSVoiceInfo]:
        if provider == "elevenlabs":
            return ELEVENLABS_VOICES
        elif provider in ("free", "edge-tts"):
            return FREE_NEURAL_VOICES
        return ELEVENLABS_VOICES + FREE_NEURAL_VOICES

    async def synthesize(self, payload: TTSRequest) -> TTSResponse:
        provider = (payload.provider or "elevenlabs").lower()
        text = payload.text.strip()
        word_count = len(text.split())

        # If ElevenLabs requested
        if provider == "elevenlabs":
            return await self._synthesize_elevenlabs(payload, word_count)
        else:
            return await self._synthesize_free_neural(payload, word_count)

    async def _synthesize_elevenlabs(self, payload: TTSRequest, word_count: int) -> TTSResponse:
        api_key = self.get_elevenlabs_api_key()
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail=(
                    "ELEVENLABS_API_KEY is not configured in backend/.env. "
                    "You can switch to the 'Free Neural' engine in the dropdown or add your key."
                ),
            )

        voice_id = payload.voice_id or self.default_voice_id
        model_id = payload.model_id or self.default_model

        # Match voice name if found
        matched_voice = next((v for v in ELEVENLABS_VOICES if v.voice_id == voice_id), None)
        voice_name = matched_voice.name if matched_voice else voice_id

        url = f"{self.base_url}/text-to-speech/{voice_id}?output_format=mp3_44100_128"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
        }
        body: Dict[str, Any] = {
            "text": payload.text,
            "model_id": model_id,
            "voice_settings": {
                "stability": payload.stability if payload.stability is not None else 0.5,
                "similarity_boost": payload.similarity_boost if payload.similarity_boost is not None else 0.75,
                "speed": payload.speed if payload.speed is not None else 1.0,
            },
        }

        logger.info(f"Synthesizing ElevenLabs speech: voice='{voice_name}' ({voice_id}), model='{model_id}'")

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, headers=headers, json=body)

            if res.status_code == 200:
                audio_bytes = res.content
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                # Estimate duration (~150 words per minute -> ~2.5 words per second)
                estimated_duration = round(max(1.0, word_count / 2.5), 1)

                return TTSResponse(
                    audio_base64=audio_b64,
                    content_type="audio/mpeg",
                    text_length=len(payload.text),
                    word_count=word_count,
                    provider="elevenlabs",
                    voice_used=voice_name,
                    model_used=model_id,
                    duration_seconds=estimated_duration,
                )

            # Handle detailed ElevenLabs error messages
            error_text = res.text
            logger.error(f"ElevenLabs error ({res.status_code}): {error_text}")

            if res.status_code == 401:
                if "missing_permissions" in error_text:
                    raise HTTPException(
                        status_code=401,
                        detail=(
                            "ElevenLabs API Key Permission Error: The key is missing the 'text_to_speech' permission. "
                            "Please edit your key in ElevenLabs Settings > API Keys to enable 'Text to Speech', "
                            "or switch to the 'Free Neural' engine in the UI."
                        ),
                    )
                raise HTTPException(
                    status_code=401,
                    detail="Invalid ElevenLabs API Key. Please verify your ELEVENLABS_API_KEY in backend/.env.",
                )
            elif res.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="ElevenLabs quota exceeded or rate limit reached. Please switch to the 'Free Neural' engine.",
                )
            else:
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"ElevenLabs synthesis failed: {error_text}",
                )

        except HTTPException:
            raise
        except httpx.RequestError as exc:
            logger.error(f"Network error connecting to ElevenLabs API: {exc}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to communicate with ElevenLabs API: {str(exc)}",
            )

    async def _synthesize_free_neural(self, payload: TTSRequest, word_count: int) -> TTSResponse:
        import edge_tts

        voice_id = payload.voice_id or "en-US-JennyNeural"
        # If user passed an ElevenLabs ID by mistake when switching to free, default to Jenny
        if not voice_id.endswith("Neural"):
            voice_id = "en-US-JennyNeural"

        matched_voice = next((v for v in FREE_NEURAL_VOICES if v.voice_id == voice_id), None)
        voice_name = matched_voice.name if matched_voice else voice_id

        # Calculate rate adjustment from speed slider (e.g. 1.2x -> "+20%")
        speed = payload.speed or 1.0
        rate_percent = int(round((speed - 1.0) * 100))
        rate_str = f"{'+' if rate_percent >= 0 else ''}{rate_percent}%"

        logger.info(f"Synthesizing Free Neural speech: voice='{voice_name}', rate='{rate_str}'")

        try:
            communicate = edge_tts.Communicate(payload.text, voice_id, rate=rate_str)
            audio_bytes = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes += chunk["data"]

            if not audio_bytes:
                raise HTTPException(status_code=500, detail="Free Neural synthesis returned empty audio.")

            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            estimated_duration = round(max(1.0, (word_count / 2.5) / speed), 1)

            return TTSResponse(
                audio_base64=audio_b64,
                content_type="audio/mpeg",
                text_length=len(payload.text),
                word_count=word_count,
                provider="edge-tts",
                voice_used=voice_name,
                model_used="Azure Neural Voice Engine",
                duration_seconds=estimated_duration,
            )
        except Exception as exc:
            logger.exception("Free Neural TTS synthesis error")
            raise HTTPException(status_code=500, detail=f"Neural TTS synthesis failed: {str(exc)}")


tts_service = TTSService()
