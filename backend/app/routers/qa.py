import logging
import io
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.qa import QARequest, QAResponse
from app.services.qa_service import qa_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/qa", tags=["Question Answering"])


@router.post("/ask", response_model=QAResponse)
async def ask_question(payload: QARequest):
    try:
        return await qa_service.answer_question(
            question=payload.question,
            context=payload.context,
            history=payload.history
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("QA query failed")
        raise HTTPException(status_code=500, detail=f"QA query failed: {str(e)}")


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # Import pypdf dynamically to handle the uploaded file
        from pypdf import PdfReader
        
        content = await file.read()
        pdf = PdfReader(io.BytesIO(content))
        
        extracted_text = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_text.append(text)
                
        full_text = "\n\n".join(extracted_text)
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")
            
        return {"filename": file.filename, "extracted_text": full_text}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF parsing failed")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
