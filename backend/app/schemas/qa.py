from typing import Optional
from pydantic import BaseModel, Field


class QARequest(BaseModel):
    question: str = Field(..., min_length=2, description="User question to answer")
    context: Optional[str] = Field(None, description="Optional context paragraph / reference document")


class QAResponse(BaseModel):
    answer: str = Field(..., description="Answer to the question")
    confidence: Optional[float] = Field(None, description="Model confidence score if available")
    context_used: bool = Field(..., description="Whether reference context was provided and used")
