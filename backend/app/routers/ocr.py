from fastapi import APIRouter, File, UploadFile, HTTPException
from app.schemas.ocr import OCRResponse
from app.services.ocr_service import ocr_service

router = APIRouter(prefix="/ocr", tags=["Optical Character Recognition"])


@router.post("/extract", response_model=OCRResponse)
async def extract_text(
    file: UploadFile = File(..., description="Image file (PNG, JPG, JPEG, WEBP, BMP, etc.)")
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty image file provided.")
        return await ocr_service.extract_text_from_image(content, file.filename or "image.png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")
