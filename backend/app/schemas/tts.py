from typing import Optional
from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize into speech")
    voice: Optional[str] = Field("default", description="Voice identifier or gender preference")
    language: Optional[str] = Field("en", description="Language code")


class TTSResponse(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded synthesized audio (e.g. WAV or MP3)")
    content_type: str = Field("audio/wav", description="Audio MIME type")
    text_length: int = Field(..., description="Number of characters synthesized")
