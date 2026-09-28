from .stt import STTRequest, STTResponse, STTSegment
from .tts import TTSRequest, TTSResponse, TTSVoiceInfo, TTSStatusResponse
from .translation import TranslationRequest, TranslationResponse
from .qa import QARequest, QAResponse
from .ocr import OCRResponse

__all__ = [
    "STTRequest",
    "STTResponse",
    "STTSegment",
    "TTSRequest",
    "TTSResponse",
    "TTSVoiceInfo",
    "TTSStatusResponse",
    "TranslationRequest",
    "TranslationResponse",
    "QARequest",
    "QAResponse",
    "OCRResponse",
]
