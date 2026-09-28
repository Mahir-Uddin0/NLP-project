"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  Download,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Headphones,
  FileAudio,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  synthesizeSpeech,
  fetchTTSStatus,
  fetchTTSVoices,
  TTSResponse,
  TTSVoiceInfo,
  TTSStatusResponse,
} from "@/lib/api";

const PRESET_PROMPTS = [
  {
    title: "AI Welcome",
    text: "Welcome to our Natural Language Processing platform! You can convert text into lifelike speech with natural voices.",
  },
  {
    title: "Product Launch",
    text: "We are thrilled to announce our next-generation AI suite. Designed for low latency, crystal-clear audio, and natural intelligence.",
  },
  {
    title: "Conversational",
    text: "Hey there! How has your day been going? Let me know if there is anything I can help you with today.",
  },
  {
    title: "Audiobook Narration",
    text: "The night was quiet and stars drifted gently across the midnight sky. Far in the distance, a lighthouse beamed its steady golden light across the ocean.",
  },
];

// Exactly 4 curated ElevenLabs free premade voices (2 male, 2 female)
const DEFAULT_ELEVENLABS_VOICES: TTSVoiceInfo[] = [
  {
    voice_id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Deep, confident, and professional narration",
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Soft, pleasant, and empathetic female voice",
  },
  {
    voice_id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Well-rounded, natural storyteller voice",
  },
  {
    voice_id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    provider: "elevenlabs",
    gender: "female",
    accent: "British",
    description: "Clear, confident, and articulate British voice",
  },
];

// Exactly 4 curated Free Neural voices (2 male, 2 female)
const DEFAULT_FREE_VOICES: TTSVoiceInfo[] = [
  {
    voice_id: "en-US-JennyNeural",
    name: "Jenny",
    provider: "edge-tts",
    gender: "female",
    accent: "American",
    description: "Natural, expressive American female voice",
  },
  {
    voice_id: "en-US-GuyNeural",
    name: "Guy",
    provider: "edge-tts",
    gender: "male",
    accent: "American",
    description: "Friendly, conversational American male voice",
  },
  {
    voice_id: "en-GB-SoniaNeural",
    name: "Sonia",
    provider: "edge-tts",
    gender: "female",
    accent: "British",
    description: "Refined, articulate British female voice",
  },
  {
    voice_id: "en-GB-RyanNeural",
    name: "Ryan",
    provider: "edge-tts",
    gender: "male",
    accent: "British",
    description: "Smooth, natural British male voice",
  },
];

export default function TTSPage() {
  const [text, setText] = useState(
    "Welcome to our Natural Language Processing platform. Text to speech lets you hear your content with lifelike voices!"
  );
  const [provider, setProvider] = useState<"elevenlabs" | "free">("elevenlabs");
  const [voiceId, setVoiceId] = useState("pNInz6obpgDQGcFmaJgB"); // Adam
  const [modelId, setModelId] = useState("eleven_multilingual_v2");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [speed, setSpeed] = useState(1.0);

  // Status & Voices from backend
  const [, setStatus] = useState<TTSStatusResponse | null>(null);
  const [allVoices, setAllVoices] = useState<TTSVoiceInfo[]>([]);

  // Execution states
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [result, setResult] = useState<TTSResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Audio Player states
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const speedSelectId = useId();
  const modelSelectId = useId();

  // Load status and voices on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const s = await fetchTTSStatus();
        if (mounted && s) {
          setStatus(s);
          if (s.elevenlabs_configured) {
            setProvider("elevenlabs");
            setVoiceId(s.default_voice_id || "pNInz6obpgDQGcFmaJgB");
          } else {
            setProvider("free");
            setVoiceId("en-US-JennyNeural");
          }
          if (s.voices && s.voices.length > 0) {
            setAllVoices(s.voices);
          }
        }
      } catch {
        // Fallback to local defaults
      }

      try {
        const v = await fetchTTSVoices();
        if (mounted && v && v.length > 0) {
          setAllVoices(v);
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

  // Update voiceId default when provider changes
  const handleProviderChange = (newProvider: "elevenlabs" | "free") => {
    setProvider(newProvider);
    setError(null);
    if (newProvider === "elevenlabs") {
      setVoiceId("pNInz6obpgDQGcFmaJgB");
    } else {
      setVoiceId("en-US-JennyNeural");
    }
  };

  // 4 voices for current provider
  const currentProviderVoices = (
    allVoices.length > 0
      ? allVoices
      : provider === "elevenlabs"
      ? DEFAULT_ELEVENLABS_VOICES
      : DEFAULT_FREE_VOICES
  )
    .filter((v) =>
      provider === "elevenlabs" ? v.provider === "elevenlabs" : v.provider === "edge-tts"
    )
    .slice(0, 4);

  // Selected voice metadata
  const selectedVoice = currentProviderVoices.find((v) => v.voice_id === voiceId) || currentProviderVoices[0];

  // Synthesize Speech
  const handleSynthesize = async (overrideVoiceId?: string, overrideProvider?: "elevenlabs" | "free") => {
    if (!text.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }

    const activeProvider = overrideProvider || provider;
    const activeVoiceId = overrideVoiceId || voiceId;

    if (overrideProvider) setProvider(overrideProvider);
    if (overrideVoiceId) setVoiceId(overrideVoiceId);

    setIsSynthesizing(true);
    setError(null);

    // Stop and reset any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const res = await synthesizeSpeech({
        text,
        provider: activeProvider,
        voice_id: activeVoiceId,
        model_id: modelId,
        stability,
        similarity_boost: similarityBoost,
        speed,
      });

      setResult(res);

      // Create blob URL for audio element
      const binaryString = atob(res.audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: res.content_type || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Auto play the new audio
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to synthesize speech";
      setError(msg);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Audio Player controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `synthesized-speech-${selectedVoice?.name || "voice"}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatSeconds = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(1, Math.round((wordCount / 140) * 60 / speed));

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 mb-3 border border-purple-200 dark:border-purple-800">
            <Volume2 className="h-3.5 w-3.5" /> Feature 2 of 5: Text to Speech
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Text to Speech Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Convert text into lifelike audio speech with your choice of ElevenLabs AI or Free Neural voice engines.
          </p>
        </div>

        {/* Engine Toggle Pill - Clean & Minimal */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            onClick={() => handleProviderChange("elevenlabs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              provider === "elevenlabs"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>ElevenLabs AI</span>
          </button>

          <button
            onClick={() => handleProviderChange("free")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              provider === "free"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Free Neural</span>
          </button>
        </div>
      </div>

      {/* Engine Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => handleProviderChange("elevenlabs")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            provider === "elevenlabs"
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>ElevenLabs Engine</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Free Tier
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            High-fidelity natural voices with expressive inflection and emotional tone.
          </p>
        </div>

        <div
          onClick={() => handleProviderChange("free")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            provider === "free"
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-500"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Free Neural Engine</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Unlimited
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Powered by Microsoft Azure Neural voices via edge-tts. Fast, high-clarity, and reliable.
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Text Input & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Preset Prompts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Sample Prompts
              </span>
              <span className="text-xs text-zinc-400">Click to insert</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  onClick={() => setText(p.text)}
                  className="px-3 py-2 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/30 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition truncate shadow-2xs cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Box */}
          <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <FileAudio className="h-3.5 w-3.5 text-purple-500" />
                <span>Text to Synthesize</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1 rounded-md transition cursor-pointer"
                  title="Copy text"
                >
                  {copiedText ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedText ? "Copied" : "Copy"}</span>
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
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste any text to convert to natural speech..."
              maxLength={5000}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950 p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-zinc-900 transition resize-y font-normal leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {text.length}
                  </span>{" "}
                  / 5,000 characters
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {wordCount}
                  </span>{" "}
                  words
                </span>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Est. duration: ~{estimatedSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Error Message with Quick Action */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-bold">Synthesis Notice</div>
                  <div className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {error}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-800/60 text-xs">
                <span className="text-rose-600 dark:text-rose-300">
                  Switch engine to try immediately:
                </span>
                <button
                  onClick={() => {
                    const fallback = provider === "elevenlabs" ? "free" : "elevenlabs";
                    handleProviderChange(fallback);
                    handleSynthesize(undefined, fallback);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 transition text-xs shadow-2xs cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Switch Engine & Synthesize</span>
                </button>
              </div>
            </div>
          )}

          {/* Audio Output Player Card */}
          {result && audioUrl && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Synthesized Audio Output
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold font-mono">
                    {result.provider}
                  </span>
                  <span className="text-zinc-400 font-mono">
                    {result.content_type}
                  </span>
                </div>
              </div>

              {/* Hidden HTML Audio element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* Custom Player UI */}
              <div className="space-y-4">
                {/* Visualizer Wave Bars animation */}
                <div className="flex items-end justify-center gap-1 h-12 py-1 bg-zinc-50 dark:bg-zinc-950/70 rounded-xl px-4 border border-zinc-100 dark:border-zinc-800/80">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const heightPercent = isPlaying
                      ? 20 + Math.sin(i * 0.5 + currentTime * 8) * 45 + Math.random() * 30
                      : 15;
                    return (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          isPlaying
                            ? "bg-gradient-to-t from-purple-600 to-indigo-500"
                            : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                        style={{ height: `${Math.max(10, Math.min(95, heightPercent))}%` }}
                      />
                    );
                  })}
                </div>

                {/* Scrubber & Time */}
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.01}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs font-mono text-zinc-500">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{formatSeconds(duration || result.duration_seconds || estimatedSeconds)}</span>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition hover:scale-105 active:scale-95 cursor-pointer"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }
                      }}
                      className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      title="Replay from start"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        onClick={toggleMute}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-18 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download MP3</span>
                    </button>

                    <Link
                      href="/stt"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition"
                    >
                      <span>Transcribe in STT</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Synthesis Metadata pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-zinc-400 text-[10px]">VOICE</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {result.voice_used}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-zinc-400 text-[10px]">WORDS</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {result.word_count}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-zinc-400 text-[10px]">CHARACTERS</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {result.text_length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="text-zinc-400 text-[10px]">DURATION</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {result.duration_seconds
                        ? `${result.duration_seconds.toFixed(1)}s`
                        : `${estimatedSeconds}s`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Voice Selection (Exactly 4 Options) & Tuning (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Voice Selector Card - Exactly 4 voices */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                <Headphones className="h-4 w-4 text-purple-600" />
                <span>Voice ({provider === "elevenlabs" ? "ElevenLabs" : "Neural"})</span>
              </div>
              <span className="text-[11px] text-zinc-400">4 Curated Voices</span>
            </div>

            {/* Exactly 4 Clean Voice Cards */}
            <div className="space-y-2.5">
              {currentProviderVoices.map((v) => {
                const isSelected = voiceId === v.voice_id;
                return (
                  <div
                    key={v.voice_id}
                    onClick={() => setVoiceId(v.voice_id)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-white leading-none">
                            {v.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                            {v.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                          {v.gender}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {v.accent}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tuning & Settings Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Sliders className="h-4 w-4 text-purple-600" />
              <span>Voice Settings</span>
            </div>

            {/* Playback Speed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor={speedSelectId} className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Playback Speed
                </label>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {speed.toFixed(2)}x
                </span>
              </div>
              <input
                id={speedSelectId}
                type="range"
                min={0.7}
                max={1.5}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>0.7x (Slower)</span>
                <span>1.0x (Normal)</span>
                <span>1.5x (Faster)</span>
              </div>
            </div>

            {/* ElevenLabs Specific Tuners */}
            {provider === "elevenlabs" && (
              <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* Model Selector */}
                <div className="space-y-1.5">
                  <label htmlFor={modelSelectId} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Voice Model
                  </label>
                  <select
                    id={modelSelectId}
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="eleven_multilingual_v2">
                      Multilingual v2 (High Quality)
                    </option>
                    <option value="eleven_turbo_v2_5">
                      Turbo v2.5 (Fast & Low Latency)
                    </option>
                  </select>
                </div>

                {/* Stability */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Voice Stability
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {stability.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={stability}
                    onChange={(e) => setStability(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Expressive</span>
                    <span>Consistent</span>
                  </div>
                </div>

                {/* Similarity Boost */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Clarity / Similarity
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {similarityBoost.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={similarityBoost}
                    onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Natural</span>
                    <span>High Fidelity</span>
                  </div>
                </div>
              </div>
            )}

            {/* Synthesize CTA Button */}
            <button
              onClick={() => handleSynthesize()}
              disabled={isSynthesizing || !text.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm py-3.5 transition shadow-md shadow-purple-600/25 active:scale-98 cursor-pointer"
            >
              {isSynthesizing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating Speech...
                </span>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Synthesize Speech</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
