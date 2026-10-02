import os
import io
import logging
from typing import Optional, List
import httpx
import pypdf
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.schemas.ocr import OCRResponse, OCRPageResult, OCRStatusResponse

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"}


class OCRService:
    """Service handling Optical Character Recognition via OCR.space API with strict 1 MB and 3-page limits."""

    def __init__(self):
        self.default_api_url = settings.OCR_SPACE_API_URL or "https://api.ocr.space/parse/image"

    def get_api_key(self) -> Optional[str]:
        """Dynamically retrieves OCR.space API key from environment, settings, or .env file."""
        key = os.getenv("OCR_SPACE_API_KEY") or settings.OCR_SPACE_API_KEY
        if not key:
            from dotenv import dotenv_values
            for env_path in [
                os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
                "backend/.env",
                ".env",
            ]:
                if os.path.isfile(env_path):
                    try:
                        vals = dotenv_values(env_path)
                        val = vals.get("OCR_SPACE_API_KEY")
                        if val and val.strip():
                            key = val.strip()
                            break
                    except Exception:
                        pass
        return key or "K81145082488957"

    def get_status(self) -> OCRStatusResponse:
        """Returns readiness status and operational parameters."""
        has_key = bool(self.get_api_key())
        return OCRStatusResponse(
            status="active" if has_key else "unconfigured",
            provider="OCR.space",
            max_file_size_mb=1.0,
            max_pdf_pages=3,
            supported_formats=sorted(list(SUPPORTED_EXTENSIONS)),
        )

    async def process_file(
        self,
        file: UploadFile,
        language: str = "eng",
    ) -> OCRResponse:
        """Extracts text from uploaded image or PDF document using OCR.space.
        
        Enforces:
        - Max file size of 1 MB (1,048,576 bytes).
        - Max 3 pages for PDF files.
        """
        api_key = self.get_api_key()
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OCR.space API key not configured. Please set OCR_SPACE_API_KEY in the environment.",
            )

        filename = file.filename or "uploaded_file"
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        # Validate extension
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '.{ext}'. Supported formats are: {', '.join(sorted(list(SUPPORTED_EXTENSIONS)))}.",
            )

        # Read binary file content
        content = await file.read()
        file_size = len(content)

        # Validate file size: maximum 1 MB (1024 * 1024 bytes)
        max_bytes = settings.MAX_OCR_FILE_SIZE_BYTES or (1024 * 1024)
        if file_size > max_bytes:
            size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of 1 MB (uploaded size: {size_mb:.2f} MB). Please choose a smaller file.",
            )

        # Validate PDF page count if document is PDF
        page_count = 1
        if ext == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                page_count = len(reader.pages)
                max_pages = settings.MAX_OCR_PDF_PAGES or 3
                if page_count > max_pages:
                    raise HTTPException(
                        status_code=400,
                        detail=f"PDF document exceeds the maximum limit of {max_pages} pages (uploaded file has {page_count} pages). Please upload a document with {max_pages} pages or fewer.",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Could not parse PDF page count via pypdf: {e}")
                # Allow OCR.space to process if pypdf has parsing issue, but log warning

        # Call OCR.space API
        mime_type = file.content_type or ("application/pdf" if ext == "pdf" else f"image/{ext}")
        payload_data = {
            "apikey": api_key,
            "language": language or "eng",
            "isOverlayRequired": "false",
            "detectOrientation": "true",
            "scale": "true",
            "OCREngine": "1",
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                files = {
                    "file": (filename, content, mime_type)
                }
                response = await client.post(
                    self.default_api_url,
                    data=payload_data,
                    files=files,
                )

            if response.status_code != 200:
                logger.error(f"OCR.space HTTP error {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"OCR.space upstream service error (HTTP {response.status_code}).",
                )

            data = response.json()
            is_errored = data.get("IsErroredOnProcessing", False)
            if is_errored:
                err_msg = data.get("ErrorMessage")
                if isinstance(err_msg, list):
                    err_msg = "; ".join(err_msg)
                err_details = data.get("ErrorDetails", "")
                full_err = f"{err_msg or 'OCR processing failed'}. {err_details}".strip()
                logger.error(f"OCR.space processing failure: {full_err}")
                raise HTTPException(
                    status_code=400,
                    detail=f"OCR processing failed: {full_err}",
                )

            parsed_results = data.get("ParsedResults") or []
            if not parsed_results:
                return OCRResponse(
                    extracted_text="",
                    filename=filename,
                    file_type=ext,
                    file_size_bytes=file_size,
                    page_count=page_count,
                    pages=[],
                    processing_time_ms=int(data.get("ProcessingTimeInMilliseconds") or 0),
                    provider="OCR.space",
                )

            pages_breakdown: List[OCRPageResult] = []
            extracted_text_chunks: List[str] = []

            for idx, item in enumerate(parsed_results):
                page_text = (item.get("ParsedText") or "").strip()
                # Normalize linebreaks
                normalized_text = page_text.replace("\r\n", "\n").replace("\r", "\n")
                if normalized_text:
                    extracted_text_chunks.append(normalized_text)

                words = len(normalized_text.split()) if normalized_text else 0
                chars = len(normalized_text)
                pages_breakdown.append(
                    OCRPageResult(
                        page_number=idx + 1,
                        parsed_text=normalized_text,
                        word_count=words,
                        character_count=chars,
                    )
                )

            full_text = "\n\n--- Page Break ---\n\n".join(extracted_text_chunks) if len(extracted_text_chunks) > 1 else (extracted_text_chunks[0] if extracted_text_chunks else "")

            processing_ms = None
            try:
                processing_ms = int(data.get("ProcessingTimeInMilliseconds") or 0)
            except Exception:
                pass

            return OCRResponse(
                extracted_text=full_text,
                filename=filename,
                file_type=ext,
                file_size_bytes=file_size,
                page_count=len(pages_breakdown) if pages_breakdown else page_count,
                pages=pages_breakdown,
                processing_time_ms=processing_ms,
                provider="OCR.space",
            )

        except HTTPException:
            raise
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="OCR extraction timed out. Please try again with a smaller or higher contrast file.",
            )
        except Exception as e:
            logger.exception("Unexpected error in OCR processing")
            raise HTTPException(
                status_code=500,
                detail=f"OCR extraction encountered an unexpected error: {str(e)}",
            )


ocr_service = OCRService()

