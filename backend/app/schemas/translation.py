from typing import Optional
from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Source text to translate")
    source_lang: str = Field("auto", description="Source language code or 'auto'")
    target_lang: str = Field(..., description="Target language code (e.g., 'es', 'fr', 'de', 'bn')")


class TranslationResponse(BaseModel):
    translated_text: str = Field(..., description="Translated text output")
    source_lang: str = Field(..., description="Source language code")
    target_lang: str = Field(..., description="Target language code")
    detected_source_lang: Optional[str] = Field(None, description="Automatically detected language if source was 'auto'")
