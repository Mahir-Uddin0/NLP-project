from .stt import router as stt_router
from .tts import router as tts_router
from .translation import router as translation_router
from .qa import router as qa_router
from .ocr import router as ocr_router

__all__ = [
    "stt_router",
    "tts_router",
    "translation_router",
    "qa_router",
    "ocr_router",
]
