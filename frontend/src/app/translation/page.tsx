"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Sparkles,
  AlertCircle,
  FileText,
  Zap,
  Globe,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  translateText,
  fetchTranslationStatus,
  fetchTranslationLanguages,
  TranslationResponse,
  LanguageInfo,
  TranslationStatusResponse,
} from "@/lib/api";

const PRESET_PROMPTS = [
  {
    title: "AI & NLP",
    text: "Artificial Intelligence and Natural Language Processing are transforming how humans and computers communicate.",
    src: "en",
    tgt: "bn",
  },
  {
    title: "Greeting (English)",
    text: "Hello! Welcome to our multilingual machine translation system. How can I help you today?",
    src: "en",
    tgt: "es",
  },
  {
    title: "Bengali to English",
    text: "প্রাকৃতিক ভাষা প্রক্রিয়াকরণ কৃত্রিম বুদ্ধিমত্তার একটি অত্যন্ত গুরুত্বপূর্ণ ও সম্ভাবনাময় শাখা।",
    src: "bn",
    tgt: "en",
  },
  {
    title: "Business Email",
    text: "Thank you for reaching out to us. We look forward to collaborating with your team on our upcoming AI project.",
    src: "en",
    tgt: "fr",
  },
];

const DEFAULT_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", native_name: "English", flag: "🇺🇸" },
  { code: "bn", name: "Bengali", native_name: "বাংলা", flag: "🇧🇩" },
  { code: "es", name: "Spanish", native_name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native_name: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native_name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", native_name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", native_name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Russian", native_name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", native_name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", native_name: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", native_name: "اردو", flag: "🇵🇰" },
  { code: "zh", name: "Chinese", native_name: "简体中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", native_name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native_name: "한국어", flag: "🇰🇷" },
  { code: "tr", name: "Turkish", native_name: "Türkçe", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", native_name: "Nederlands", flag: "🇳🇱" },
];

export default function TranslationPage() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("bn");
  const [text, setText] = useState(
    "Artificial Intelligence and Natural Language Processing are transforming how humans and computers communicate."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Dynamic status & languages from backend
  const [status, setStatus] = useState<TranslationStatusResponse | null>(null);
  const [languages, setLanguages] = useState<LanguageInfo[]>(DEFAULT_LANGUAGES);

  const sourceSelectId = useId();
  const targetSelectId = useId();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const s = await fetchTranslationStatus();
        if (mounted && s) {
          setStatus(s);
          if (s.languages && s.languages.length > 0) {
            setLanguages(s.languages);
          }
        }
      } catch {
        // Fallback to local defaults
      }

      try {
        const l = await fetchTranslationLanguages();
        if (mounted && l && l.length > 0) {
          setLanguages(l);
        }
      } catch {
        // Fallback handled
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Swap languages
  const handleSwap = () => {
    if (sourceLang === "auto") return;
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);

    // If we have a translation result, swap the text too
    if (result?.translated_text) {
      setText(result.translated_text);
      setResult(null);
    }
  };

  // Perform Translation
  const handleTranslate = async () => {
    if (!text.trim()) {
      setError("Please enter text to translate.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await translateText(text, sourceLang, targetLang);
      setResult(data);
    } catch (err: unknown) {
      console.error("Translation request failed:", err);
      let msg = err instanceof Error ? err.message : "Translation failed";
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("Could not connect") ||
        msg.includes("Load failed")
      ) {
        msg = "Cannot reach the backend server. Please verify the FastAPI backend is running on port 8000.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key for translation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleTranslate();
    }
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(text);
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 2000);
  };

  const handleCopyTarget = () => {
    if (!result?.translated_text) return;
    navigator.clipboard.writeText(result.translated_text);
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  };

  // Text to Speech playback using Browser Web Speech API
  const handleSpeakTranslation = () => {
    if (!result?.translated_text || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.translated_text);
    utterance.lang = targetLang;
    utterance.rate = 0.95;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleLoadPreset = (preset: typeof PRESET_PROMPTS[0]) => {
    setText(preset.text);
    setSourceLang(preset.src);
    setTargetLang(preset.tgt);
    setResult(null);
  };

  const sourceWordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const targetLanguageObj = languages.find((l) => l.code === targetLang);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 mb-3 border border-blue-200 dark:border-blue-800">
            <Languages className="h-3.5 w-3.5" /> Feature 3 of 5: Machine Translation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Machine Translation Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Fast multilingual machine translation calling the direct MyMemory API endpoint without requiring any API keys or credentials.
          </p>
        </div>

        {/* Direct Endpoint Info Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-blue-900 dark:text-blue-200 leading-none">
              Direct MyMemory API
            </div>
            <div className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
              Direct Endpoint • No API Key Required
            </div>
          </div>
        </div>
      </div>

      {/* Preset Prompts Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Quick Translation Templates
          </span>
          <span className="text-xs text-zinc-400">Click to test</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p.title}
              onClick={() => handleLoadPreset(p)}
              className="px-3.5 py-2 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition truncate shadow-2xs cursor-pointer"
            >
              <div className="font-bold truncate">{p.title}</div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                {p.src.toUpperCase()} → {p.tgt.toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        {/* Source Language Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <label htmlFor={sourceSelectId} className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
            From:
          </label>
          <select
            id={sourceSelectId}
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">🌐 Auto Detect Language</option>
            {languages.map((l) => (
              <option key={`src-${l.code}`} value={l.code}>
                {l.flag ? `${l.flag} ` : ""}{l.name} ({l.native_name})
              </option>
            ))}
          </select>
        </div>

        {/* Swap Languages Button */}
        <button
          onClick={handleSwap}
          disabled={sourceLang === "auto"}
          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          title={sourceLang === "auto" ? "Cannot swap with Auto Detect" : "Swap Languages"}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>

        {/* Target Language Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <label htmlFor={targetSelectId} className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
            To:
          </label>
          <select
            id={targetSelectId}
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map((l) => (
              <option key={`tgt-${l.code}`} value={l.code}>
                {l.flag ? `${l.flag} ` : ""}{l.name} ({l.native_name})
              </option>
            ))}
          </select>
        </div>

        {/* Translate CTA Button */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-sm shadow-blue-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Translate Text</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="font-bold">Translation Error</div>
            <div className="text-xs text-rose-700 dark:text-rose-300">{error}</div>
          </div>
        </div>
      )}

      {/* Dual Panel Translation Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Box */}
        <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>Source Text</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySource}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1 rounded-md transition cursor-pointer"
                  title="Copy source text"
                >
                  {copiedSource ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedSource ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={() => setText("")}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500 px-2 py-1 rounded-md transition cursor-pointer"
                  title="Clear text"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type, paste, or insert text to translate (Ctrl+Enter to translate)..."
              maxLength={10000}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950 p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition resize-y font-normal leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{text.length}</span> chars •{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{sourceWordCount}</span> words
            </span>
            <span className="text-[11px] text-zinc-400">Ctrl + Enter to Translate</span>
          </div>
        </div>

        {/* Translation Output Box */}
        <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  Translation ({targetLanguageObj?.name || targetLang.toUpperCase()})
                </span>
              </span>

              {result && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSpeakTranslation}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-600 dark:hover:text-blue-300 px-2 py-1 rounded-md transition cursor-pointer"
                    title="Listen to translation"
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${isPlayingAudio ? "text-blue-600 animate-pulse" : ""}`} />
                    <span>{isPlayingAudio ? "Playing" : "Listen"}</span>
                  </button>

                  <button
                    onClick={handleCopyTarget}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1 rounded-md transition cursor-pointer"
                    title="Copy translation"
                  >
                    {copiedTarget ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedTarget ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-[200px] h-[218px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950 p-4 text-sm text-zinc-900 dark:text-zinc-100 overflow-y-auto leading-relaxed">
              {result ? (
                <p className="whitespace-pre-wrap font-normal">{result.translated_text}</p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs space-y-1">
                  <Languages className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                  <span>Click &quot;Translate Text&quot; to see translation output...</span>
                </div>
              )}
            </div>
          </div>

          {/* Result Footer Details */}
          {result ? (
            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold font-mono text-[11px]">
                  {result.provider}
                </span>
                {result.match_quality !== undefined && (
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Match: {Math.round((result.match_quality || 0.85) * 100)}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">
                  {result.character_count} chars • {result.word_count} words
                </span>
                <Link
                  href="/tts"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Voice Studio</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-right text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              Powered by MyMemory Translated Engine
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
