export function normalizeApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, "");
    return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
}

export function normalizeRootUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000";
}

/**
 * Smart resilient API fetch helper with cloud proxy and direct fallback:
 * 1. Checks NEXT_PUBLIC_API_URL directly (e.g. Render production URL)
 * 2. Checks Next.js internal proxy (/api/backend/...)
 * 3. Falls back to direct IPv4 loopback (http://127.0.0.1:8000/api/v1/...)
 * 4. Falls back to http://localhost:8000/api/v1/...
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const candidates: string[] = [];

  // For OCR routes, prioritize same-origin Next.js serverless route to prevent Render cold-start latency
  if (cleanEndpoint.startsWith("/ocr") && typeof window !== "undefined") {
    candidates.push("/api");
    candidates.push("/api/backend");
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    candidates.push(normalizeApiBaseUrl());
  }

  // Next.js internal proxy route (/api/backend/...)
  if (typeof window !== "undefined") {
    candidates.push("/api/backend");
  }

  // Direct IPv4 loopback and localhost
  candidates.push("http://127.0.0.1:8000/api/v1");
  candidates.push("http://localhost:8000/api/v1");

  const uniqueCandidates = Array.from(new Set(candidates));
  let lastError: Error | null = null;

  for (let i = 0; i < uniqueCandidates.length; i++) {
    const base = uniqueCandidates[i];
    const isLast = i === uniqueCandidates.length - 1;
    try {
      const url = `${base}${cleanEndpoint}`;
      const res = await fetch(url, options);
      // Return if response is ok, or if it's a client error other than 404, or if this is the last candidate
      if (res.ok || (res.status !== 404 && res.status < 500) || isLast) {
        return res;
      }
      continue;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`Could not connect to API backend at ${cleanEndpoint}`);
}

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

export interface OCRPageResult {
  page_number: number;
  parsed_text: string;
  word_count: number;
  character_count: number;
}

export interface OCRResponse {
  extracted_text: string;
  filename?: string;
  file_type?: string;
  file_size_bytes?: number;
  page_count?: number;
  pages?: OCRPageResult[];
  processing_time_ms?: number;
  provider?: string;
  confidence?: number;
  lines?: string[];
}

// 1. Health check with resilient fallbacks
export async function checkBackendHealth(): Promise<{
  ok: boolean;
  groqConfigured?: boolean;
  elevenlabsConfigured?: boolean;
  translationConfigured?: boolean;
  geminiConfigured?: boolean;
  ocrConfigured?: boolean;
}> {
  const rootUrl = normalizeRootUrl();
  const healthEndpoints = [
    `${rootUrl}/health`,
    "/health",
    "http://127.0.0.1:8000/health",
    "http://localhost:8000/health",
  ];
  const uniqueEndpoints = Array.from(new Set(healthEndpoints));

  for (const url of uniqueEndpoints) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          groqConfigured: data.groq_configured,
          elevenlabsConfigured: data.elevenlabs_configured,
          translationConfigured: data.translation_configured,
          geminiConfigured: data.gemini_configured,
          ocrConfigured: data.ocr_configured,
        };
      }
    } catch {
      continue;
    }
  }
  return { ok: false };
}

// 2. STT Status
export async function fetchSTTStatus(): Promise<STTStatusResponse | null> {
  try {
    const res = await apiFetch("/stt/status", {
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

  const res = await apiFetch("/stt/transcribe", {
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
    const res = await apiFetch("/tts/status", {
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
    const endpoint = provider
      ? `/tts/voices?provider=${encodeURIComponent(provider)}`
      : "/tts/voices";
    const res = await apiFetch(endpoint, {
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

  const res = await apiFetch("/tts/synthesize", {
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
    const res = await apiFetch("/translation/status", {
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
    const res = await apiFetch("/translation/languages", {
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
  const res = await apiFetch("/translation/translate", {
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

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

// 6. Feature 4: Question Answering (QA)
export async function askQuestion(question: string, context?: string, history?: ChatMessage[]): Promise<QAResponse> {
  const res = await apiFetch("/qa/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to process question" }));
    throw new Error(err.detail || "QA query error");
  }

  return res.json();
}

export async function uploadPDF(file: File): Promise<{ filename: string; extracted_text: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch("/qa/upload-pdf", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to upload PDF" }));
    throw new Error(err.detail || "PDF upload error");
  }

  return res.json();
}

// 7. Feature 5: Optical Character Recognition (OCR) via OCR.space
export async function extractTextWithOCR(file: File, language = "eng"): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);

  const res = await apiFetch("/ocr/extract", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to extract text from document" }));
    throw new Error(err.detail || "OCR extraction error");
  }

  return res.json();
}

export const extractTextFromImage = extractTextWithOCR;
