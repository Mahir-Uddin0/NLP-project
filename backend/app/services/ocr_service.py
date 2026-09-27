import logging
from app.schemas.ocr import OCRResponse

logger = logging.getLogger(__name__)


class OCRService:
    """Service handling Optical Character Recognition."""

    async def extract_text_from_image(self, image_bytes: bytes, filename: str) -> OCRResponse:
        logger.info(f"Extracting text from image '{filename}', size={len(image_bytes)} bytes")

        mock_lines = [
            f"[OCR Service Ready] Processed image '{filename}'.",
            "Extracted line 1: Natural Language Processing Monorepo.",
            "Extracted line 2: Ready for free API integration."
        ]

        return OCRResponse(
            extracted_text="\n".join(mock_lines),
            confidence=0.98,
            lines=mock_lines
        )


ocr_service = OCRService()
