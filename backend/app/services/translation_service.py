import os
import re
import html
import logging
import asyncio
from typing import Optional, List, Dict, Any, Tuple
import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.translation import (
    TranslationRequest,
    TranslationResponse,
    LanguageInfo,
    TranslationStatusResponse,
)

logger = logging.getLogger(__name__)

# Supported language catalog with ISO codes, English names, native names, and flags
SUPPORTED_LANGUAGES: List[LanguageInfo] = [
    LanguageInfo(code="en", name="English", native_name="English", flag="🇺🇸"),
    LanguageInfo(code="bn", name="Bengali", native_name="বাংলা", flag="🇧🇩"),
    LanguageInfo(code="es", name="Spanish", native_name="Español", flag="🇪🇸"),
    LanguageInfo(code="fr", name="French", native_name="Français", flag="🇫🇷"),
    LanguageInfo(code="de", name="German", native_name="Deutsch", flag="🇩🇪"),
    LanguageInfo(code="it", name="Italian", native_name="Italiano", flag="🇮🇹"),
    LanguageInfo(code="pt", name="Portuguese", native_name="Português", flag="🇧🇷"),
    LanguageInfo(code="ru", name="Russian", native_name="Русский", flag="🇷🇺"),
    LanguageInfo(code="ar", name="Arabic", native_name="العربية", flag="🇸🇦"),
    LanguageInfo(code="hi", name="Hindi", native_name="हिन्दी", flag="🇮🇳"),
    LanguageInfo(code="ur", name="Urdu", native_name="اردو", flag="🇵🇰"),
    LanguageInfo(code="zh", name="Chinese (Simplified)", native_name="简体中文", flag="🇨🇳"),
    LanguageInfo(code="ja", name="Japanese", native_name="日本語", flag="🇯🇵"),
    LanguageInfo(code="ko", name="Korean", native_name="한국어", flag="🇰🇷"),
    LanguageInfo(code="tr", name="Turkish", native_name="Türkçe", flag="🇹🇷"),
    LanguageInfo(code="nl", name="Dutch", native_name="Nederlands", flag="🇳🇱"),
    LanguageInfo(code="pl", name="Polish", native_name="Polski", flag="🇵🇱"),
    LanguageInfo(code="sv", name="Swedish", native_name="Svenska", flag="🇸🇪"),
    LanguageInfo(code="el", name="Greek", native_name="Ελληνικά", flag="🇬🇷"),
]


class TranslationService:
    """Service handling Machine Translation via the direct MyMemory Translated API without credentials."""

    def __init__(self):
        self.default_api_url = settings.MYMEMORY_API_URL or "https://api.mymemory.translated.net/get"
        self.default_email = settings.MYMEMORY_EMAIL

    def get_api_url(self) -> str:
        """Dynamically retrieves the direct MyMemory API URL from environment, .env file, or settings.
        No API key or credentials required.
        """
        raw_url = None
        from dotenv import dotenv_values
        for env_path in [
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            "backend/.env",
            ".env",
        ]:
            if os.path.isfile(env_path):
                try:
                    vals = dotenv_values(env_path)
                    val = vals.get("MYMEMORY_API_URL")
                    if val and val.strip():
                        raw_url = val.strip()
                        break
                except Exception:
                    pass
        if not raw_url:
            raw_url = os.getenv("MYMEMORY_API_URL") or self.default_api_url

        # Normalize URL: strip whitespace and trailing slashes, ensure /get endpoint is present
        clean_url = raw_url.strip().rstrip("/")
        if not clean_url.endswith("/get"):
            clean_url = f"{clean_url}/get"
        return clean_url

    def get_registered_email(self) -> Optional[str]:
        """Dynamically retrieves the optional MyMemory email from environment or settings."""
        from dotenv import dotenv_values
        for env_path in [
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            "backend/.env",
            ".env",
        ]:
            if os.path.isfile(env_path):
                try:
                    vals = dotenv_values(env_path)
                    val = vals.get("MYMEMORY_EMAIL")
                    if val and val.strip():
                        return val.strip()
                except Exception:
                    pass
        return os.getenv("MYMEMORY_EMAIL") or self.default_email

    def get_status(self) -> TranslationStatusResponse:
        """Returns service status, direct endpoint, registered email (if any), and supported languages."""
        email = self.get_registered_email()
        return TranslationStatusResponse(
            status="active",
            provider="MyMemory Translated",
            registered_email=email or "Direct Endpoint (No Credentials Required)",
            daily_limit_words=50000 if email else 5000,
            languages=SUPPORTED_LANGUAGES,
        )

    def get_languages(self) -> List[LanguageInfo]:
        """Returns supported languages."""
        return SUPPORTED_LANGUAGES

    def _chunk_text(self, text: str, max_chars: int = 400) -> List[str]:
        """Splits long text into manageable chunks respecting paragraphs, sentences, or word boundaries.
        MyMemory limits single requests to ~500 characters, so ~400 chars per chunk ensures reliability.
        """
        text = text.strip()
        if len(text) <= max_chars:
            return [text]

        # First split into paragraphs
        paragraphs = text.split("\n")
        chunks: List[str] = []

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue

            if len(p) <= max_chars:
                chunks.append(p)
            else:
                # Split paragraph by sentence terminators (., ?, !, ।, etc.)
                sentences = re.split(r"([.?!।]\s+)", p)
                current_chunk = ""

                for s in sentences:
                    if len(current_chunk) + len(s) > max_chars:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                            current_chunk = s
                        else:
                            # Single sentence exceeds max_chars, split by words
                            words = s.split(" ")
                            sub_chunk = ""
                            for w in words:
                                if len(sub_chunk) + len(w) + 1 > max_chars:
                                    if sub_chunk:
                                        chunks.append(sub_chunk.strip())
                                    sub_chunk = w
                                else:
                                    sub_chunk = f"{sub_chunk} {w}".strip()
                            current_chunk = sub_chunk
                    else:
                        current_chunk += s

                if current_chunk.strip():
                    chunks.append(current_chunk.strip())

        return chunks if chunks else [text]

    async def _translate_single_chunk(
        self,
        client: httpx.AsyncClient,
        chunk: str,
        langpair: str,
        target_lang: str,
        email: Optional[str] = None,
    ) -> Tuple[str, Optional[float], Optional[str], List[str]]:
        """Sends a single chunk directly to the MyMemory API URL without any API key or credentials."""
        api_url = self.get_api_url()
        params = {
            "q": chunk,
            "langpair": langpair,
        }
        if email and email.strip():
            params["de"] = email.strip()

        try:
            res = await client.get(api_url, params=params, timeout=15.0)

            if res.status_code == 200:
                data = res.json()
                response_status = data.get("responseStatus")
                response_data = data.get("responseData") or {}
                raw_translation = response_data.get("translatedText") or ""
                clean_translation = html.unescape(raw_translation).strip()

                # Handle distinct language requirement from MyMemory
                details = str(data.get("responseDetails") or "").upper()
                if "PLEASE SELECT TWO DISTINCT LANGUAGES" in clean_translation.upper() or "PLEASE SELECT TWO DISTINCT LANGUAGES" in details:
                    # The source text is already in the target language
                    return chunk, 1.0, target_lang, []

                # Handle quota warning
                if "MYMEMORY WARNING" in clean_translation.upper() or str(response_status) in ("403", "429"):
                    if "QUOTA" in clean_translation.upper() or "LIMIT" in clean_translation.upper() or str(response_status) in ("403", "429"):
                        detail_msg = data.get("responseDetails") or clean_translation or "MyMemory daily translation quota reached."
                        logger.warning(f"MyMemory quota reached: {detail_msg}")
                        raise HTTPException(
                            status_code=429,
                            detail=f"MyMemory quota notice: {detail_msg[:200]}",
                        )

                match_score = response_data.get("match")
                if match_score is not None:
                    try:
                        match_score = round(float(match_score), 2)
                    except (ValueError, TypeError):
                        match_score = None

                # Extract detectedLanguage from responseData (where MyMemory places it)
                detected_lang: Optional[str] = response_data.get("detectedLanguage")
                if detected_lang:
                    detected_lang = str(detected_lang).strip().lower()

                # Extract alternatives from matches array
                alternatives: List[str] = []
                matches = data.get("matches", [])

                if matches and isinstance(matches, list):
                    for m in matches:
                        if not detected_lang and m.get("source"):
                            src = m.get("source")
                            if src and src != "False" and src != "autodetect":
                                detected_lang = str(src).lower()

                        trans = m.get("translation")
                        if trans and isinstance(trans, str):
                            clean_alt = html.unescape(trans).strip()
                            if clean_alt and clean_alt != clean_translation and clean_alt not in alternatives:
                                alternatives.append(clean_alt)
                            if len(alternatives) >= 3:
                                break

                return clean_translation, match_score, detected_lang, alternatives

            error_text = res.text
            logger.error(f"MyMemory error ({res.status_code}): {error_text}")
            raise HTTPException(
                status_code=res.status_code,
                detail=f"MyMemory Translation error: {error_text[:200]}",
            )
        except httpx.RequestError as exc:
            logger.error(f"Network error connecting to MyMemory: {exc}")
            raise HTTPException(
                status_code=502,
                detail=f"Failed to communicate with MyMemory Translation service: {str(exc)}",
            )

    async def translate(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "bn",
    ) -> TranslationResponse:
        """Translates text from source_lang to target_lang using MyMemory Translated API.
        Automatically chunks long inputs and cleans HTML entities.
        """
        text = text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text to translate cannot be empty.")

        # Normalize language codes
        source_clean = source_lang.strip().lower() if source_lang else "auto"
        target_clean = target_lang.strip().lower() if target_lang else "bn"

        # If user explicitly selected the same source and target language, return directly
        if source_clean != "auto" and source_clean == target_clean:
            return TranslationResponse(
                translated_text=text,
                source_lang=source_clean,
                target_lang=target_clean,
                detected_source_lang=source_clean,
                match_quality=1.0,
                character_count=len(text),
                word_count=len(text.split()),
                provider="Direct Match",
                alternative_matches=[],
            )

        # MyMemory uses 'autodetect' for auto-detection
        mymemory_source = "autodetect" if source_clean in ("auto", "autodetect") else source_clean
        langpair = f"{mymemory_source}|{target_clean}"
        email = self.get_registered_email()

        word_count = len(text.split())
        char_count = len(text)
        chunks = self._chunk_text(text, max_chars=400)

        logger.info(
            f"Translating {char_count} chars ({word_count} words) with langpair='{langpair}' across {len(chunks)} chunks"
        )

        translated_parts: List[str] = []
        match_scores: List[float] = []
        detected_sources: List[str] = []
        all_alternatives: List[str] = []

        async with httpx.AsyncClient(timeout=20.0) as client:
            # Process chunks sequentially or in small batches to respect rate limits
            for chunk in chunks:
                part, score, detected, alts = await self._translate_single_chunk(
                    client=client,
                    chunk=chunk,
                    langpair=langpair,
                    target_lang=target_clean,
                    email=email,
                )
                translated_parts.append(part)
                if score is not None:
                    match_scores.append(score)
                if detected:
                    detected_sources.append(detected)
                for alt in alts:
                    if alt not in all_alternatives:
                        all_alternatives.append(alt)

        final_translated_text = " ".join(translated_parts)
        avg_quality = round(sum(match_scores) / len(match_scores), 2) if match_scores else 0.85
        detected_lang = detected_sources[0] if detected_sources else (None if source_clean == "auto" else source_clean)

        return TranslationResponse(
            translated_text=final_translated_text,
            source_lang=source_clean,
            target_lang=target_clean,
            detected_source_lang=detected_lang,
            match_quality=avg_quality,
            character_count=char_count,
            word_count=word_count,
            provider="MyMemory Translated",
            alternative_matches=all_alternatives[:3],
        )


translation_service = TranslationService()
