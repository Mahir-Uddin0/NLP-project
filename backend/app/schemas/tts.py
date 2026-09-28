from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TTSVoiceInfo(BaseModel):
    voice_id: str = Field(..., description="Unique voice identifier")
    name: str = Field(..., description="Display name of the voice")
    provider: str = Field("elevenlabs", description="Voice provider ('elevenlabs' or 'edge-tts')")
    gender: Optional[str] = Field("female", description="Gender: male, female, neutral")
    accent: Optional[str] = Field("American", description="Accent or regional dialect")
    description: Optional[str] = Field(None, description="Tone, style or usage recommendation")
    preview_url: Optional[str] = Field(None, description="Short audio sample preview URL if available")


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize into speech")
    provider: Optional[str] = Field("elevenlabs", description="TTS Provider: 'elevenlabs' or 'free'")
    voice_id: Optional[str] = Field("21m00Tcm4TlvDq8ikWAM", description="Voice ID or name")
    model_id: Optional[str] = Field("eleven_multilingual_v2", description="ElevenLabs model ID")
    stability: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="ElevenLabs voice stability")
    similarity_boost: Optional[float] = Field(0.75, ge=0.0, le=1.0, description="ElevenLabs clarity/similarity boost")
    speed: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Speech playback speed multiplier")
    language: Optional[str] = Field("en", description="Spoken language code (e.g. en, es, fr, bn)")


class TTSResponse(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded synthesized audio (MP3)")
    content_type: str = Field("audio/mpeg", description="Audio MIME type")
    text_length: int = Field(..., description="Number of characters synthesized")
    word_count: int = Field(..., description="Number of words synthesized")
    provider: str = Field(..., description="Engine used ('elevenlabs' or 'edge-tts')")
    voice_used: str = Field(..., description="Name or ID of voice used")
    model_used: Optional[str] = Field(None, description="Model used for synthesis")
    duration_seconds: Optional[float] = Field(None, description="Estimated or actual audio duration in seconds")


class TTSStatusResponse(BaseModel):
    elevenlabs_configured: bool
    default_voice_id: str
    default_model: str
    providers: List[str]
    voices: List[TTSVoiceInfo]
    models: List[Dict[str, str]]
