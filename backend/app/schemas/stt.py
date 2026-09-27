from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class STTSegment(BaseModel):
    id: int = Field(..., description="Segment index")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text for this segment")


class STTResponse(BaseModel):
    transcript: str = Field(..., description="Full transcribed text")
    language: Optional[str] = Field("en", description="Detected or requested language")
    duration_seconds: Optional[float] = Field(None, description="Audio duration in seconds")
    model_used: Optional[str] = Field("whisper-large-v3-turbo", description="Model used for transcription")
    word_count: Optional[int] = Field(0, description="Total word count in transcription")
    segments: Optional[List[STTSegment]] = Field(default_factory=list, description="Timestamped segments")


class STTRequest(BaseModel):
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio string if not uploaded via multipart")
    language: Optional[str] = Field("auto", description="Audio language code or 'auto' for automatic detection")
    model: Optional[str] = Field("whisper-large-v3-turbo", description="Groq Whisper model to use")
