import logging
from app.schemas.translation import TranslationResponse

logger = logging.getLogger(__name__)


class TranslationService:
    """Service handling Machine Translation."""

    async def translate(self, text: str, source_lang: str = "auto", target_lang: str = "en") -> TranslationResponse:
        logger.info(f"Translating text ({len(text)} chars) from {source_lang} to {target_lang}")

        return TranslationResponse(
            translated_text=f"[Translated to {target_lang}]: {text}",
            source_lang=source_lang,
            target_lang=target_lang,
            detected_source_lang=source_lang if source_lang != "auto" else "en"
        )


translation_service = TranslationService()
