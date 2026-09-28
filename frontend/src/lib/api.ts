const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface HealthCheckResponse {
  status: string;
  service: string;
  groq_configured?: boolean;
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

export interface TTSResponse {
  audio_base64: string;
  content_type: string;
  text_length: number;
}

export interface TranslationResponse {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  detected_source_lang?: string;
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
export async function checkBackendHealth(): Promise<{ ok: boolean; groqConfigured?: boolean }> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const data: HealthCheckResponse = await res.json();
    return { ok: true, groqConfigured: data.groq_configured };
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

// 4. Feature 2: Text to Speech (TTS)
export async function synthesizeSpeech(text: string, voice = "default", language = "en"): Promise<TTSResponse> {
  const res = await fetch(`${API_BASE_URL}/tts/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to synthesize speech" }));
    throw new Error(err.detail || "TTS synthesis error");
  }

  return res.json();
}

// 5. Feature 3: Machine Translation
export async function translateText(text: string, sourceLang = "auto", targetLang = "es"): Promise<TranslationResponse> {
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
