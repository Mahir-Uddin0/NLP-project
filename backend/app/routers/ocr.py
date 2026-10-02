import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.schemas.ocr import OCRResponse, OCRStatusResponse
from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["Optical Character Recognition"])


@router.get("/status", response_model=OCRStatusResponse)
async def get_ocr_status():
    """Returns the OCR service status, size limits, and supported formats."""
    return ocr_service.get_status()


@router.post("/extract", response_model=OCRResponse)
async def extract_text(
    file: UploadFile = File(..., description="Image (PNG, JPG, WEBP, BMP) or PDF document (max 1 MB, max 3 pages)"),
    language: str = Form("eng", description="OCR target language code (e.g. eng, spa, fre, ger, ara, chs)"),
):
    """Extracts text from images and PDF documents using the OCR.space API.
    
    Enforces strict upload boundaries:
    - Maximum 1 MB file size.
    - Maximum 3 pages for PDF documents.
    """
    try:
        return await ocr_service.process_file(file=file, language=language)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("OCR Extraction Endpoint Error")
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

