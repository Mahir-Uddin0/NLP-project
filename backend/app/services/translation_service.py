import os
import logging
from typing import Optional, List, Tuple
from fastapi import HTTPException
from lara_sdk import Translator, AccessKey
from lara_sdk._errors import LaraError, LaraApiError

from app.core.config import settings
from app.schemas.translation import (
    TranslationRequest,
    TranslationResponse,
    LanguageInfo,
    TranslationStatusResponse,
)

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES: List[LanguageInfo] = [
    LanguageInfo(code="en", name="English", native_name="English", flag="🇺🇸"),
    LanguageInfo(code="bn", name="Bengali", native_name="বাংলা", flag="🇧🇩"),
    LanguageInfo(code="es", name="Spanish", native_name="Español", flag="🇪🇸"),
    LanguageInfo(code="fr", name="French", native_name="Français", flag="🇫🇷"),
    LanguageInfo(code="de", name="German", native_name="Deutsch", flag="🇩🇪"),
    LanguageInfo(code="it", name="Italian", native_name="Italiano", flag="🇮🇹"),
    LanguageInfo(code="pt", name="Portuguese", native_name="Português", flag="🇧🇷"),
    LanguageInfo(code="ru", name="Russian", native_name="Русский", flag="🇷🇺"),
    LanguageInfo(code="ar", name="Arabic", native_name="العربية", flag="🇸🇦"),
    LanguageInfo(code="hi", name="Hindi", native_name="हिन्दी", flag="🇮🇳"),
    LanguageInfo(code="ur", name="Urdu", native_name="اردো", flag="🇵🇰"),
    LanguageInfo(code="zh", name="Chinese (Simplified)", native_name="简体中文", flag="🇨🇳"),
    LanguageInfo(code="ja", name="Japanese", native_name="日本語", flag="🇯🇵"),
    LanguageInfo(code="ko", name="Korean", native_name="한국어", flag="🇰🇷"),
    LanguageInfo(code="tr", name="Turkish", native_name="Türkçe", flag="🇹🇷"),
    LanguageInfo(code="nl", name="Dutch", native_name="Nederlands", flag="🇳🇱"),
    LanguageInfo(code="pl", name="Polish", native_name="Polski", flag="🇵🇱"),
    LanguageInfo(code="sv", name="Swedish", native_name="Svenska", flag="🇸🇪"),
    LanguageInfo(code="el", name="Greek", native_name="Ελληνικά", flag="🇬🇷"),
]


class TranslationService:
    """Service handling Machine Translation via the Lara Translate API."""

    def __init__(self):
        self._translator: Optional[Translator] = None

    def get_credentials(self) -> Tuple[Optional[str], Optional[str]]:
        """Dynamically retrieves Lara access key ID and secret from environment or settings."""
        key_id = os.getenv("LARA_ACCESS_KEY_ID") or settings.LARA_ACCESS_KEY_ID
        key_secret = os.getenv("LARA_ACCESS_KEY_SECRET") or settings.LARA_ACCESS_KEY_SECRET

        if not key_id or not key_secret:
            from dotenv import dotenv_values
            for env_path in [
                os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
                "backend/.env",
                ".env",
            ]:
                if os.path.isfile(env_path):
                    try:
                        vals = dotenv_values(env_path)
                        if not key_id and vals.get("LARA_ACCESS_KEY_ID"):
                            key_id = vals.get("LARA_ACCESS_KEY_ID").strip()
                        if not key_secret and vals.get("LARA_ACCESS_KEY_SECRET"):
                            key_secret = vals.get("LARA_ACCESS_KEY_SECRET").strip()
                    except Exception:
                        pass
        return key_id, key_secret

    def get_translator(self) -> Translator:
        """Instantiates or returns cached Lara Translator client."""
        key_id, key_secret = self.get_credentials()
        if not key_id or not key_secret:
            raise HTTPException(
                status_code=500,
                detail="Lara Translate API credentials not configured. Please configure LARA_ACCESS_KEY_ID and LARA_ACCESS_KEY_SECRET.",
            )
        return Translator(AccessKey(id=key_id, secret=key_secret))

    def get_status(self) -> TranslationStatusResponse:
        """Returns service status and supported languages catalog."""
        key_id, key_secret = self.get_credentials()
        is_active = bool(key_id and key_secret)
        return TranslationStatusResponse(
            status="active" if is_active else "unconfigured",
            provider="Lara Translate",
            daily_limit_words=100000,
            languages=SUPPORTED_LANGUAGES,
        )

    def get_languages(self) -> List[LanguageInfo]:
        """Returns supported languages."""
        return SUPPORTED_LANGUAGES

    async def translate(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "bn",
    ) -> TranslationResponse:
        """Translates text from source language to target language using Lara Translate API.
        
        Supports auto-detection of source language when source_lang is 'auto',
        and computes translation quality estimation.
        """
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text to translate cannot be empty.")

        source_clean = source_lang.strip().lower() if source_lang else "auto"
        target_clean = target_lang.strip().lower() if target_lang else "bn"

        # Check identical languages
        if source_clean != "auto" and source_clean == target_clean:
            cleaned_text = text.strip()
            word_count = len(cleaned_text.split())
            return TranslationResponse(
                translated_text=cleaned_text,
                source_lang=source_clean,
                target_lang=target_clean,
                detected_source_lang=source_clean,
                match_quality=1.0,
                character_count=len(cleaned_text),
                word_count=word_count,
                provider="Lara Translate",
                alternative_matches=[],
            )

        translator = self.get_translator()
        src_param = None if source_clean in ("auto", "autodetect", "") else source_clean

        try:
            # Perform translation via Lara SDK
            result = translator.translate(
                text=text.strip(),
                source=src_param,
                target=target_clean,
            )

            translated_text = result.translation
            detected_source = getattr(result, "source_language", None) or (source_clean if source_clean != "auto" else None)

            # Compute quality estimation if possible
            match_score = 0.90
            try:
                qe_src = detected_source or (source_clean if source_clean != "auto" else "en")
                sample_sent = text.strip()[:400]
                sample_trans = translated_text.strip()[:400]
                qe = translator.quality_estimation(
                    source=qe_src,
                    target=target_clean,
                    sentence=sample_sent,
                    translation=sample_trans,
                )
                if qe and hasattr(qe, "score") and qe.score is not None:
                    match_score = round(float(qe.score), 2)
            except Exception as qe_err:
                logger.debug(f"Quality estimation skipped: {qe_err}")

            word_count = len(translated_text.split()) if translated_text else 0

            return TranslationResponse(
                translated_text=translated_text,
                source_lang=source_clean,
                target_lang=target_clean,
                detected_source_lang=detected_source,
                match_quality=match_score,
                character_count=len(translated_text),
                word_count=word_count,
                provider="Lara Translate",
                alternative_matches=[],
            )

        except (LaraApiError, LaraError) as lara_err:
            logger.error(f"Lara Translate API Error: {lara_err}")
            raise HTTPException(
                status_code=502,
                detail=f"Lara Translate API error: {str(lara_err)}",
            )
        except Exception as e:
            logger.error(f"Unexpected translation error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Machine translation failed: {str(e)}",
            )


translation_service = TranslationService()

