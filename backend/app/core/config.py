import os
from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NLP Suite API"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Groq API configuration for Speech-to-Text & LLM
    GROQ_API_KEY: Optional[str] = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    DEFAULT_STT_MODEL: str = "whisper-large-v3-turbo"

    # ElevenLabs API configuration for Text-to-Speech
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_BASE_URL: str = "https://api.elevenlabs.io/v1"
    DEFAULT_TTS_VOICE_ID: str = "pNInz6obpgDQGcFmaJgB"  # Adam (verified free premade voice)
    DEFAULT_TTS_MODEL: str = "eleven_multilingual_v2"

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(
        env_file=[
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            ".env",
            "backend/.env",
        ],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
