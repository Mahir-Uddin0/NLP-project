from fastapi import APIRouter, HTTPException
from app.schemas.translation import TranslationRequest, TranslationResponse
from app.services.translation_service import translation_service

router = APIRouter(prefix="/translation", tags=["Machine Translation"])


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(payload: TranslationRequest):
    try:
        return await translation_service.translate(
            text=payload.text,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
