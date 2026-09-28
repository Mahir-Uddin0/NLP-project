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
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Headphones,
  FileAudio,
  Clock,
  ArrowRight,
  Settings2,
  Languages,
  Info,
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
    text: "Welcome to our Natural Language Processing platform! You can convert text into lifelike speech with ultra-realistic voices.",
  },
  {
    title: "Product Launch",
    text: "We are thrilled to announce our next-generation multimodal AI suite. Designed for ultra-low latency, crystal-clear audio, and cross-language intelligence.",
  },
  {
    title: "Multilingual Greeting",
    text: "Hello! Welcome to our multilingual speech synthesizer. ¡Hola! Bonjour! Hallo! নমস্কার! Enjoy natural speech in any dialect.",
  },
  {
    title: "Audiobook Narration",
    text: "The night was quiet and stars drifted gently across the midnight sky. Far in the distance, a lighthouse beamed its steady golden light across the endless ocean.",
  },
];

const DEFAULT_ELEVENLABS_VOICES: TTSVoiceInfo[] = [
  {
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Calm, warm, and natural conversational voice (Default)",
  },
  {
    voice_id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Deep, confident, and professional narration",
  },
  {
    voice_id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Well-rounded, pleasant storyteller voice",
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
    voice_id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    provider: "elevenlabs",
    gender: "male",
    accent: "American",
    description: "Warm, authentic, and engaging male voice",
  },
  {
    voice_id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    provider: "elevenlabs",
    gender: "female",
    accent: "American",
    description: "Young, clear, and energetic female voice",
  },
];

const DEFAULT_FREE_VOICES: TTSVoiceInfo[] = [
  {
    voice_id: "en-US-JennyNeural",
    name: "Jenny (US Neural)",
    provider: "edge-tts",
    gender: "female",
    accent: "American",
    description: "Natural, expressive American female voice",
  },
  {
    voice_id: "en-US-GuyNeural",
    name: "Guy (US Neural)",
    provider: "edge-tts",
    gender: "male",
    accent: "American",
    description: "Friendly, conversational American male voice",
  },
  {
    voice_id: "en-US-AriaNeural",
    name: "Aria (US Expressive)",
    provider: "edge-tts",
    gender: "female",
    accent: "American",
    description: "Highly expressive, news and storytelling",
  },
  {
    voice_id: "en-GB-SoniaNeural",
    name: "Sonia (UK Neural)",
    provider: "edge-tts",
    gender: "female",
    accent: "British",
    description: "Refined and articulate British female voice",
  },
  {
    voice_id: "en-GB-RyanNeural",
    name: "Ryan (UK Neural)",
    provider: "edge-tts",
    gender: "male",
    accent: "British",
    description: "Warm and engaging British male voice",
  },
  {
    voice_id: "bn-BD-NabanitaNeural",
    name: "Nabanita (Bengali)",
    provider: "edge-tts",
    gender: "female",
    accent: "Bengali",
    description: "Natural Bangladeshi Bengali female voice",
  },
  {
    voice_id: "bn-BD-PradeepNeural",
    name: "Pradeep (Bengali)",
    provider: "edge-tts",
    gender: "male",
    accent: "Bengali",
    description: "Clear and resonant Bengali male voice",
  },
  {
    voice_id: "es-ES-ElviraNeural",
    name: "Elvira (Spanish)",
    provider: "edge-tts",
    gender: "female",
    accent: "Spanish",
    description: "Authentic Castilian Spanish voice",
  },
  {
    voice_id: "fr-FR-DeniseNeural",
    name: "Denise (French)",
    provider: "edge-tts",
    gender: "female",
    accent: "French",
    description: "Sophisticated Parisian French voice",
  },
];

export default function TTSPage() {
  const [text, setText] = useState(
    "Welcome to our Natural Language Processing platform. Text to speech lets you hear your content with lifelike voices!"
  );
  const [provider, setProvider] = useState<"elevenlabs" | "free">("free");
  const [voiceId, setVoiceId] = useState("en-US-JennyNeural");
  const [modelId, setModelId] = useState("eleven_multilingual_v2");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState("en");

  // Status & Voices from backend
  const [status, setStatus] = useState<TTSStatusResponse | null>(null);
  const [allVoices, setAllVoices] = useState<TTSVoiceInfo[]>([]);
  const [filterGender, setFilterGender] = useState<"all" | "female" | "male">("all");

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
  const languageSelectId = useId();
  const filterGenderId = useId();

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
            setVoiceId(s.default_voice_id || "21m00Tcm4TlvDq8ikWAM");
          } else {
            setProvider("free");
            setVoiceId("en-US-JennyNeural");
          }
          if (s.voices && s.voices.length > 0) {
            setAllVoices(s.voices);
          }
        }
      } catch {
        // Fallback to local defaults if backend is initializing
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
      setVoiceId("21m00Tcm4TlvDq8ikWAM");
    } else {
      setVoiceId("en-US-JennyNeural");
    }
  };

  // Filter voices according to current provider & gender filter
  const currentProviderVoices = (
    allVoices.length > 0
      ? allVoices
      : provider === "elevenlabs"
      ? DEFAULT_ELEVENLABS_VOICES
      : DEFAULT_FREE_VOICES
  ).filter((v) => {
    const matchesProvider =
      provider === "elevenlabs" ? v.provider === "elevenlabs" : v.provider === "edge-tts";
    const matchesGender = filterGender === "all" ? true : v.gender === filterGender;
    return matchesProvider && matchesGender;
  });

  // Selected voice metadata
  const selectedVoice = (
    allVoices.length > 0
      ? allVoices
      : provider === "elevenlabs"
      ? DEFAULT_ELEVENLABS_VOICES
      : DEFAULT_FREE_VOICES
  ).find((v) => v.voice_id === voiceId);

  // Synthesize Speech
  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError("Please enter some text to synthesize.");
      return;
    }

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
        provider,
        voice_id: voiceId,
        model_id: modelId,
        stability,
        similarity_boost: similarityBoost,
        speed,
        language,
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
          audioRef.current.play().catch(() => {
            // Browser autoplay policy might require manual interaction
          });
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

  // Estimate speaking time (avg ~140 words per min)
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
            Convert written text into natural, emotional, and lifelike audio speech powered by
            ElevenLabs AI and Microsoft Neural voices.
          </p>
        </div>

        {/* Engine Toggle Pill */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 self-start sm:self-auto">
          <button
            onClick={() => handleProviderChange("elevenlabs")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              provider === "elevenlabs"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>ElevenLabs AI</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
              PRO
            </span>
          </button>

          <button
            onClick={() => handleProviderChange("free")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              provider === "free"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Free Neural</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              FREE
            </span>
          </button>
        </div>
      </div>

      {/* Engine Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ElevenLabs Engine Info */}
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
              <span>ElevenLabs API</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
              {status?.elevenlabs_configured ? "Key Configured" : "Available"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Ultra-realistic speech synthesis with human-like intonation, emotion, and adjustable
            stability & clarity.
          </p>
        </div>

        {/* Free Neural Engine Info */}
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
              <span>Free Neural Voice Engine</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Unlimited & Ready
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Powered by Microsoft Azure Neural voices via edge-tts. 100% free, no quota limits, supports
            English, Spanish, Bengali, and more.
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
                Sample Presets
              </span>
              <span className="text-xs text-zinc-400">Click to load</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  onClick={() => setText(p.text)}
                  className="px-3 py-2 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/30 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition truncate shadow-2xs"
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
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 px-2 py-1 rounded-md transition"
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
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-500 px-2 py-1 rounded-md transition"
                  title="Clear text"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste any text you would like to convert to high-fidelity speech..."
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

          {/* Error Message with Fallback Helper */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-bold">Synthesis Error</div>
                  <div className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {error}
                  </div>
                </div>
              </div>

              {provider === "elevenlabs" && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200/60 dark:border-rose-800/60 text-xs">
                  <span className="text-rose-600 dark:text-rose-300">
                    Want instant unlimited voice synthesis without API restrictions?
                  </span>
                  <button
                    onClick={() => {
                      handleProviderChange("free");
                      handleSynthesize();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 transition text-xs shadow-2xs"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-300" />
                    <span>Switch to Free Neural & Synthesize</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Audio Output Player Card */}
          {result && audioUrl && (
            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Generated Audio Speech
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
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition hover:scale-105 active:scale-95"
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
                      className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Replay from start"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        onClick={toggleMute}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
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

        {/* Right Column: Voice Selection & Tuning Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Voice Selector Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                <Headphones className="h-4 w-4 text-purple-600" />
                <span>Voice Selection</span>
              </div>

              {/* Gender filter */}
              <div className="flex items-center gap-1 text-xs">
                <label htmlFor={filterGenderId} className="sr-only">Gender filter</label>
                <select
                  id={filterGenderId}
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value as "all" | "female" | "male")}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300"
                >
                  <option value="all">All Genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            {/* Voice Cards / List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {currentProviderVoices.map((v) => {
                const isSelected = voiceId === v.voice_id;
                return (
                  <div
                    key={v.voice_id}
                    onClick={() => setVoiceId(v.voice_id)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-purple-500"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          {v.name.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          {v.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                          {v.gender || "voice"}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {v.accent || "Standard"}
                        </span>
                      </div>
                    </div>

                    {v.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
                        {v.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tuning & Settings Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <Sliders className="h-4 w-4 text-purple-600" />
              <span>Voice Settings & Tuning</span>
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
                    ElevenLabs Model
                  </label>
                  <select
                    id={modelSelectId}
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="eleven_multilingual_v2">
                      Multilingual v2 (29 Languages, Best Emotion)
                    </option>
                    <option value="eleven_turbo_v2_5">
                      Turbo v2.5 (Fastest & Low Latency)
                    </option>
                    <option value="eleven_monolingual_v1">
                      Monolingual v1 (English Legacy)
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
                    <span>Variable / Expressive</span>
                    <span>Consistent / Flat</span>
                  </div>
                </div>

                {/* Similarity Boost */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Clarity & Similarity Boost
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
                    <span>Low Clarity</span>
                    <span>High Fidelity</span>
                  </div>
                </div>
              </div>
            )}

            {/* Free Neural Specific Language Selector */}
            {provider === "free" && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label htmlFor={languageSelectId} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-purple-500" />
                  <span>Target Spoken Language</span>
                </label>
                <select
                  id={languageSelectId}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="en">English (US / UK)</option>
                  <option value="bn">Bengali / বাংলা (bn-BD)</option>
                  <option value="es">Spanish / Español (es-ES)</option>
                  <option value="fr">French / Français (fr-FR)</option>
                  <option value="de">German / Deutsch (de-DE)</option>
                  <option value="hi">Hindi / हिन्दी (hi-IN)</option>
                  <option value="ja">Japanese / 日本語 (ja-JP)</option>
                  <option value="ar">Arabic / العربية (ar-SA)</option>
                </select>
              </div>
            )}

            {/* Synthesize CTA Button */}
            <button
              onClick={handleSynthesize}
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
