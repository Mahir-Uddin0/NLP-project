const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface HealthCheckResponse {
  status: string;
  service: string;
  groq_configured?: boolean;
  elevenlabs_configured?: boolean;
  features: Record<string, string>;
}

export interface STTSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface STTResponse {
  transcript: string;
  language?: string;
  duration_seconds?: number;
  model_used?: string;
  word_count?: number;
  segments?: STTSegment[];
}

export interface STTStatusResponse {
  status: string;
  provider: string;
  default_model: string;
  available_models: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  configured: boolean;
}

export interface TTSVoiceInfo {
  voice_id: string;
  name: string;
  provider: "elevenlabs" | "edge-tts" | string;
  gender?: "male" | "female" | "neutral" | string;
  accent?: string;
  description?: string;
  preview_url?: string;
}

export interface TTSRequest {
  text: string;
  provider?: "elevenlabs" | "free" | "edge-tts" | string;
  voice_id?: string;
  model_id?: string;
  stability?: number;
  similarity_boost?: number;
  speed?: number;
  language?: string;
}

export interface TTSResponse {
  audio_base64: string;
  content_type: string;
  text_length: number;
  word_count: number;
  provider: string;
  voice_used: string;
  model_used?: string;
  duration_seconds?: number;
}

export interface TTSStatusResponse {
  elevenlabs_configured: boolean;
  default_voice_id: string;
  default_model: string;
  providers: string[];
  voices: TTSVoiceInfo[];
  models: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
  flag?: string;
}

export interface TranslationResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  detected_source_lang?: string;
  match_quality?: number;
  character_count: number;
  word_count: number;
  provider: string;
  alternative_matches?: string[];
}

export interface TranslationStatusResponse {
  status: string;
  provider: string;
  registered_email: string;
  daily_limit_words: number;
  languages: LanguageInfo[];
}

export interface QAResponse {
  answer: string;
  confidence?: number;
  context_used: boolean;
}

export interface OCRResponse {
  extracted_text: string;
  confidence?: number;
  lines?: string[];
}

// 1. Health check
export async function checkBackendHealth(): Promise<{
  ok: boolean;
  groqConfigured?: boolean;
  elevenlabsConfigured?: boolean;
  translationConfigured?: boolean;
  mymemoryEmail?: string;
}> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const data: HealthCheckResponse & { translation_configured?: boolean; mymemory_email?: string } = await res.json();
    return {
      ok: true,
      groqConfigured: data.groq_configured,
      elevenlabsConfigured: data.elevenlabs_configured,
      translationConfigured: data.translation_configured,
      mymemoryEmail: data.mymemory_email,
    };
  } catch {
    return { ok: false };
  }
}

// 2. STT Status
export async function fetchSTTStatus(): Promise<STTStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/stt/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 3. Feature 1: Speech to Text (STT) via Groq Whisper API
export async function transcribeAudio(
  audio: Blob | File,
  language = "auto",
  model = "whisper-large-v3-turbo"
): Promise<STTResponse> {
  const formData = new FormData();
  
  if (audio instanceof File) {
    formData.append("file", audio, audio.name);
  } else {
    // Recorded audio blob from browser MediaRecorder
    const ext = audio.type.includes("wav")
      ? "wav"
      : audio.type.includes("mp4")
      ? "mp4"
      : audio.type.includes("mpeg")
      ? "mpeg"
      : audio.type.includes("mp3")
      ? "mp3"
      : "webm";
    formData.append("file", audio, `recording.${ext}`);
  }

  if (language && language !== "auto") {
    formData.append("language", language);
  } else {
    formData.append("language", "auto");
  }

  formData.append("model", model);

  const res = await fetch(`${API_BASE_URL}/stt/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to transcribe audio" }));
    throw new Error(err.detail || "Transcription error");
  }

  return res.json();
}

// 4. TTS Status & Voices
export async function fetchTTSStatus(): Promise<TTSStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tts/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchTTSVoices(provider?: string): Promise<TTSVoiceInfo[]> {
  try {
    const url = provider
      ? `${API_BASE_URL}/tts/voices?provider=${encodeURIComponent(provider)}`
      : `${API_BASE_URL}/tts/voices`;
    const res = await fetch(url, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// 5. Feature 2: Text to Speech (TTS)
export async function synthesizeSpeech(
  request: TTSRequest | string,
  voice = "default",
  language = "en"
): Promise<TTSResponse> {
  const payload: TTSRequest =
    typeof request === "string"
      ? { text: request, voice_id: voice, language }
      : request;

  const res = await fetch(`${API_BASE_URL}/tts/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to synthesize speech" }));
    throw new Error(err.detail || "TTS synthesis error");
  }

  return res.json();
}

// 6. Translation Status & Languages
export async function fetchTranslationStatus(): Promise<TranslationStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/translation/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchTranslationLanguages(): Promise<LanguageInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/translation/languages`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// 7. Feature 3: Machine Translation via MyMemory API
export async function translateText(
  text: string,
  sourceLang = "auto",
  targetLang = "bn"
): Promise<TranslationResponse> {
  const res = await fetch(`${API_BASE_URL}/translation/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to translate text" }));
    throw new Error(err.detail || "Translation error");
  }

  return res.json();
}

// 6. Feature 4: Question Answering (QA)
export async function askQuestion(question: string, context?: string): Promise<QAResponse> {
  const res = await fetch(`${API_BASE_URL}/qa/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to process question" }));
    throw new Error(err.detail || "QA query error");
  }

  return res.json();
}

// 7. Feature 5: Optical Character Recognition (OCR)
export async function extractTextFromImage(imageFile: File): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${API_BASE_URL}/ocr/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to extract text from image" }));
    throw new Error(err.detail || "OCR extraction error");
  }

  return res.json();
}
