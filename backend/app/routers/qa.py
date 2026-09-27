from fastapi import APIRouter, HTTPException
from app.schemas.qa import QARequest, QAResponse
from app.services.qa_service import qa_service

router = APIRouter(prefix="/qa", tags=["Question Answering"])


@router.post("/ask", response_model=QAResponse)
async def ask_question(payload: QARequest):
    try:
        return await qa_service.answer_question(
            question=payload.question,
            context=payload.context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QA query failed: {str(e)}")
