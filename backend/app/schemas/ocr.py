from typing import Optional, List
from pydantic import BaseModel, Field


class OCRResponse(BaseModel):
    extracted_text: str = Field(..., description="Full text extracted from image")
    confidence: Optional[float] = Field(None, description="Average OCR confidence score")
    lines: Optional[List[str]] = Field(None, description="Extracted text split line-by-line")
