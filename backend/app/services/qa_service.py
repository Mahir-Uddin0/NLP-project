import logging
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from app.core.config import settings
from app.schemas.qa import ChatMessage

logger = logging.getLogger(__name__)

# Try importing google-genai
try:
    from google import genai
    from google.genai import types
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    logger.warning("google-genai package not found. QA feature will be disabled.")


FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
]


class QAService:
    def __init__(self):
        self.api_key = None
        self.default_model = settings.DEFAULT_QA_MODEL
        self.client = None

    def get_client(self):
        if self.client is None or self.api_key != settings.GEMINI_API_KEY:
            self.api_key = settings.GEMINI_API_KEY
            if self.api_key and HAS_GEMINI:
                self.client = genai.Client(api_key=self.api_key)
            else:
                self.client = None
        return self.client

    def is_configured(self) -> bool:
        return bool(self.get_client())

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "active" if self.is_configured() else "inactive",
            "provider": "google-gemini",
            "model": self.default_model,
            "configured": self.is_configured(),
        }

    async def answer_question(self, question: str, context: Optional[str] = None, history: Optional[List[ChatMessage]] = None) -> Dict[str, Any]:
        """
        Answers a question using Gemini API asynchronously, with conversation history and optional context.
        Implements automatic multi-model fallback in case a model encounters 503 UNAVAILABLE or traffic spikes.
        """
        if not self.is_configured():
            raise HTTPException(
                status_code=503,
                detail="Gemini API is not configured. Please set GEMINI_API_KEY in the environment."
            )

        if not question or not question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        contents = []
        
        # Add context instruction if provided
        if context and context.strip():
            context_instruction = f"Here is some reference context to use for answering questions:\n\n{context.strip()}"
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=context_instruction)]))
            contents.append(types.Content(role="model", parts=[types.Part.from_text(text="Understood. I will use this context to answer your subsequent questions.")]))

        # Append history
        if history:
            for msg in history[-5:]:  # Limit to last 5 messages as requested
                role = "user" if msg.role == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))
        
        # Append current question
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=question.strip())]))

        # Build candidate list with default_model first, followed by distinct fallbacks
        models_to_try = [self.default_model]
        for m in FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = None
        client = self.get_client()
        for model_name in models_to_try:
            try:
                logger.info(f"Attempting QA generation with model: {model_name}")
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                    )
                )

                if response.text and response.text.strip():
                    return {
                        "answer": response.text.strip(),
                        "confidence": 0.95,
                        "context_used": bool(context and context.strip()),
                        "model_used": model_name
                    }
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying fallback if available...")
                last_error = e

        logger.error(f"All candidate Gemini models failed. Last error: {last_error}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"QA generation failed across all available models: {str(last_error)}"
        )


qa_service = QAService()
