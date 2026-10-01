from typing import Optional, List
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender (user or model)")
    content: str = Field(..., description="Content of the message")

class QARequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question to answer")
    context: Optional[str] = Field(None, description="Optional context paragraph / reference document")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Previous conversation history")

class QAResponse(BaseModel):
    answer: str = Field(..., description="Answer to the question")
    confidence: Optional[float] = Field(None, description="Model confidence score if available")
    context_used: bool = Field(..., description="Whether reference context was provided and used")
