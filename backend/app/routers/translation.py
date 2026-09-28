import logging
from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.translation import (
    TranslationRequest,
    TranslationResponse,
    LanguageInfo,
    TranslationStatusResponse,
)
from app.services.translation_service import translation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translation", tags=["Machine Translation"])


@router.get("/status", response_model=TranslationStatusResponse)
async def get_translation_status():
    """Returns the translation service readiness, registered email allocation, and supported languages."""
    return translation_service.get_status()


@router.get("/languages", response_model=List[LanguageInfo])
async def list_languages():
    """Returns the catalog of supported translation languages."""
    return translation_service.get_languages()


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(payload: TranslationRequest):
    """Translates text from source language to target language using MyMemory Translated API.
    Supports auto-detection of source language, smart chunking for long text, and cleans HTML entities.
    """
    try:
        return await translation_service.translate(
            text=payload.text,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Translation Route Error")
        raise HTTPException(status_code=500, detail=f"Machine Translation failed: {str(e)}")
