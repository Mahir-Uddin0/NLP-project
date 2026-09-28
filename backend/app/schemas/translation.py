from typing import Optional, List
from pydantic import BaseModel, Field


class LanguageInfo(BaseModel):
    code: str = Field(..., description="ISO 639-1 language code")
    name: str = Field(..., description="English display name of the language")
    native_name: str = Field(..., description="Native script display name")
    flag: Optional[str] = Field(None, description="Country or regional flag emoji")


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Source text to translate")
    source_lang: str = Field("auto", description="Source language code or 'auto'")
    target_lang: str = Field("bn", description="Target language code (e.g. 'bn', 'es', 'fr', 'en')")


class TranslationResponse(BaseModel):
    translated_text: str = Field(..., description="Translated text output")
    source_lang: str = Field(..., description="Source language code")
    target_lang: str = Field(..., description="Target language code")
    detected_source_lang: Optional[str] = Field(None, description="Automatically detected language if source was 'auto'")
    match_quality: Optional[float] = Field(None, description="Translation confidence / match score (0.0 to 1.0)")
    character_count: int = Field(..., description="Number of characters translated")
    word_count: int = Field(..., description="Number of words translated")
    provider: str = Field("MyMemory Translated", description="Translation service provider")
    alternative_matches: Optional[List[str]] = Field(default_factory=list, description="Alternative human translations from Translation Memory")


class TranslationStatusResponse(BaseModel):
    status: str = Field("active", description="Service readiness status")
    provider: str = Field("MyMemory Translated", description="Engine provider name")
    registered_email: str = Field(..., description="Email associated with MyMemory allocation (50k words/day)")
    daily_limit_words: int = Field(50000, description="Daily free word quota")
    languages: List[LanguageInfo] = Field(default_factory=list, description="Supported languages catalog")
