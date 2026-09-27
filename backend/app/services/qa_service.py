import logging
from typing import Optional
from app.schemas.qa import QAResponse

logger = logging.getLogger(__name__)


class QAService:
    """Service handling Question Answering."""

    async def answer_question(self, question: str, context: Optional[str] = None) -> QAResponse:
        logger.info(f"Answering question: '{question}' (has context: {context is not None})")

        sample_answer = (
            f"This is a placeholder response for question: '{question}'. "
            + (f"Using provided context snippet: '{context[:60]}...' " if context else "No context provided.")
        )

        return QAResponse(
            answer=sample_answer,
            confidence=0.95,
            context_used=bool(context and len(context.strip()) > 0)
        )


qa_service = QAService()
