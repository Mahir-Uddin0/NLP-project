"use client";

import { useState } from "react";
import { Languages, ArrowRightLeft, Copy, Check, AlertCircle, Sparkles } from "lucide-react";
import { translateText, TranslationResponse } from "@/lib/api";

const languageOptions = [
  { code: "auto", name: "Auto Detect" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "bn", name: "Bengali" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
];

export default function TranslationPage() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [text, setText] = useState("Hello world! Artificial Intelligence and Natural Language Processing are transforming how humans and computers communicate.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSwap = () => {
    if (sourceLang !== "auto") {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    }
  };

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
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyTranslation = () => {
    if (result?.translated_text) {
      navigator.clipboard.writeText(result.translated_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-3">
            <Languages className="h-3.5 w-3.5" /> Feature 3 of 5
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            Machine Translation
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Fast, neural machine translation supporting multilingual language pairs.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-zinc-400">Endpoint: POST /api/v1/translation/translate</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Feature Implementation Status:</span> Scheduled after TTS.
        </div>
      </div>

      {/* Language Selectors Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-semibold text-zinc-500">From:</span>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 text-sm text-zinc-900 dark:text-zinc-100"
          >
            {languageOptions.map((opt) => (
              <option key={`src-${opt.code}`} value={opt.code}>{opt.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSwap}
          disabled={sourceLang === "auto"}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition"
          title="Swap languages"
        >
          <ArrowRightLeft className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-semibold text-zinc-500">To:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 text-sm text-zinc-900 dark:text-zinc-100"
          >
            {languageOptions.filter((opt) => opt.code !== "auto").map((opt) => (
              <option key={`tgt-${opt.code}`} value={opt.code}>{opt.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm"
        >
          {loading ? "Translating..." : "Translate"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Side-by-side Translation Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Source Text
          </label>
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to translate..."
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Translation Result
            </label>
            {result && (
              <button
                onClick={copyTranslation}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          <div className="min-h-[200px] h-[216px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 text-sm text-zinc-800 dark:text-zinc-200 overflow-y-auto">
            {result ? (
              <p className="whitespace-pre-wrap">{result.translated_text}</p>
            ) : (
              <span className="text-zinc-400 italic">Click &quot;Translate&quot; to see result...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
