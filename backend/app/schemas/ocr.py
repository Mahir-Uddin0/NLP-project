from typing import Optional, List
from pydantic import BaseModel, Field


class OCRPageResult(BaseModel):
    page_number: int = Field(..., description="1-indexed page number")
    parsed_text: str = Field(..., description="Text extracted from this page")
    word_count: int = Field(..., description="Word count for this page")
    character_count: int = Field(..., description="Character count for this page")


class OCRResponse(BaseModel):
    extracted_text: str = Field(..., description="Complete extracted text across all pages")
    filename: str = Field(..., description="Original name of the uploaded file")
    file_type: str = Field(..., description="Detected file format (e.g. pdf, png, jpg)")
    file_size_bytes: int = Field(..., description="File size in bytes")
    page_count: int = Field(1, description="Number of pages parsed")
    pages: List[OCRPageResult] = Field(default_factory=list, description="Breakdown of extracted text per page")
    processing_time_ms: Optional[int] = Field(None, description="OCR execution latency in milliseconds")
    provider: str = Field("OCR.space", description="Engine provider name")


class OCRStatusResponse(BaseModel):
    status: str = Field("active", description="OCR service readiness")
    provider: str = Field("OCR.space", description="Service provider")
    max_file_size_mb: float = Field(1.0, description="Maximum upload size limit in MB")
    max_pdf_pages: int = Field(3, description="Maximum allowed PDF pages")
    supported_formats: List[str] = Field(
        default=["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif"],
        description="Supported file extensions",
    )

