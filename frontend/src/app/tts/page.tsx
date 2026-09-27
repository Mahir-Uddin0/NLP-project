"use client";

import { useState } from "react";
import { Volume2, Play, AlertCircle, Sparkles, Sliders } from "lucide-react";
import { synthesizeSpeech, TTSResponse } from "@/lib/api";

export default function TTSPage() {
  const [text, setText] = useState("Welcome to our Natural Language Processing platform. Text to speech lets you hear your content aloud.");
  const [voice, setVoice] = useState("default");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TTSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await synthesizeSpeech(text, voice, language);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to synthesize speech");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 mb-3">
            <Volume2 className="h-3.5 w-3.5" /> Feature 2 of 5
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            Text to Speech (TTS)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Convert text into natural audio speech with customizable voices and accents.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-zinc-400">Endpoint: POST /api/v1/tts/synthesize</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/20 text-xs sm:text-sm text-purple-900 dark:text-purple-200 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Feature Implementation Status:</span> Scheduled after STT feature completion. Will be powered by free TTS APIs.
        </div>
      </div>

      {/* Input & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Input Text
          </label>
          <textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text to convert to speech..."
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{text.length} characters</span>
            <span>Max 5,000</span>
          </div>
        </div>

        {/* Settings Box */}
        <div className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            <Sliders className="h-4 w-4" />
            <span>Voice Settings</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100"
            >
              <option value="default">Default Neutral Voice</option>
              <option value="male">Natural Male</option>
              <option value="female">Natural Female</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100"
            >
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="bn">Bengali (bn)</option>
            </select>
          </div>

          <button
            onClick={handleSynthesize}
            disabled={loading || !text.trim()}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm py-3 transition shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Synthesizing...
              </span>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Audio
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audio Player Result */}
      {result && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Synthesized Audio Output
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Format: {result.content_type}
            </span>
          </div>

          <audio
            controls
            className="w-full"
            src={`data:${result.content_type};base64,${result.audio_base64}`}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}
    </div>
  );
}
