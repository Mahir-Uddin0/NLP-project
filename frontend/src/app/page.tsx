"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  Volume2,
  Languages,
  HelpCircle,
  ScanText,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Cpu,
  Radio,
  FileText,
  Activity,
} from "lucide-react";
import { checkBackendHealth, normalizeRootUrl } from "@/lib/api";

const modules = [
  {
    id: "stt",
    title: "Speech to Text",
    subtitle: "Feature 1 of 5",
    description: "Ultra-fast voice transcription with automatic language identification powered by Groq Whisper Turbo.",
    icon: Mic,
    href: "/stt",
    color: "indigo",
    badge: "Active",
    model: "Whisper Large v3 Turbo",
    provider: "Groq Cloud API",
    highlights: ["Live microphone capture", "Audio file uploads (MP3, WAV, M4A)", "Word timestamps & segments"],
    accentGradient: "from-indigo-500/10 to-indigo-500/0 hover:border-indigo-500/50",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300",
    iconBg: "bg-indigo-600 text-white",
  },
  {
    id: "tts",
    title: "Text to Speech",
    subtitle: "Feature 2 of 5",
    description: "Synthesize lifelike, expressive spoken voice from text with both free neural voices and ElevenLabs.",
    icon: Volume2,
    href: "/tts",
    color: "purple",
    badge: "Active",
    model: "Neural Speech Engine",
    provider: "Free Neural & ElevenLabs",
    highlights: ["Free Jenny, Guy, Sonia & Ryan", "High fidelity natural prosody", "Instant base64 audio player"],
    accentGradient: "from-purple-500/10 to-purple-500/0 hover:border-purple-500/50",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300",
    iconBg: "bg-purple-600 text-white",
  },
  {
    id: "translation",
    title: "Machine Translation",
    subtitle: "Feature 3 of 5",
    description: "Accurate multilingual translation across 40+ global languages using direct MyMemory API with zero credentials.",
    icon: Languages,
    href: "/translation",
    color: "blue",
    badge: "Active",
    model: "Neural MT Pipeline",
    provider: "MyMemory API",
    highlights: ["Automatic source detection", "One-click copy & swap", "Direct endpoint integration"],
    accentGradient: "from-blue-500/10 to-blue-500/0 hover:border-blue-500/50",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300",
    iconBg: "bg-blue-600 text-white",
  },
  {
    id: "qa",
    title: "QA Chatbot Studio",
    subtitle: "Feature 4 of 5",
    description: "Conversational question answering with smart multi-model fallback, PDF document ingestion, and voice controls.",
    icon: HelpCircle,
    href: "/qa",
    color: "amber",
    badge: "Enhanced",
    model: "Gemini 3.8 Flash",
    provider: "Google Gemini AI",
    highlights: ["Multi-turn memory (last 5 msgs)", "PDF context extraction", "Integrated speech & voice"],
    accentGradient: "from-amber-500/10 to-amber-500/0 hover:border-amber-500/50",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
    iconBg: "bg-amber-600 text-white",
  },
  {
    id: "ocr",
    title: "Optical Character Recognition",
    subtitle: "Feature 5 of 5",
    description: "Scan documents, images, receipts, and screenshots to accurately extract printed and typed text.",
    icon: ScanText,
    href: "/ocr",
    color: "rose",
    badge: "Active",
    model: "OCR Extraction Pipeline",
    provider: "FastAPI Backend",
    highlights: ["Multi-format image parser", "Instant text clipboard copy", "Confidence scoring"],
    accentGradient: "from-rose-500/10 to-rose-500/0 hover:border-rose-500/50",
    badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300",
    iconBg: "bg-rose-600 text-white",
  },
];

export default function Home() {
  const [health, setHealth] = useState<{
    ok: boolean | null;
    groqConfigured?: boolean;
    elevenlabsConfigured?: boolean;
    translationConfigured?: boolean;
    geminiConfigured?: boolean;
  }>({ ok: null });

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((res) => {
      if (mounted) {
        setHealth({
          ok: res.ok,
          groqConfigured: res.groqConfigured,
          elevenlabsConfigured: res.elevenlabsConfigured,
          translationConfigured: res.translationConfigured,
          geminiConfigured: res.geminiConfigured,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const docsUrl = `${normalizeRootUrl()}/api/v1/docs`;

  return (
    <div className="space-y-10 py-2">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-br from-white via-zinc-50 to-indigo-50/30 dark:from-zinc-900 dark:via-zinc-900/80 dark:to-indigo-950/20 p-8 sm:p-10 shadow-sm">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
            <Radio className="h-3.5 w-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" />
            Fullstack NLP & Multimodal AI Studio
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.15]">
            Unified Workspace for <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Natural Language</span> Processing
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Transcribe speech in real-time, generate human-quality neural voice, translate across 40+ languages, chat with documents via Gemini 3.8 Flash, and extract text from images in one modern web platform.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/qa"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm hover:shadow"
            >
              <Sparkles className="h-4 w-4" /> Launch QA Chatbot
            </Link>
            <Link
              href="/stt"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition"
            >
              <Mic className="h-4 w-4 text-indigo-500" /> Speech to Text
            </Link>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition ml-auto"
            >
              <span>Interactive Swagger API</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Live System Pipeline Status Strip */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Live AI Engine Status</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">FastAPI Backend:</span>
            {health.ok === null ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-ping" /> Checking...
              </span>
            ) : health.ok ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                <XCircle className="h-3.5 w-3.5 text-red-500" /> Offline / Connecting
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${health.groqConfigured ? "bg-emerald-500" : "bg-zinc-400"}`} />
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Groq Whisper</p>
              <p className="text-[11px] text-zinc-500">{health.groqConfigured ? "STT Ready" : "Awaiting Key"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Neural Voices</p>
              <p className="text-[11px] text-zinc-500">Free & ElevenLabs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">MyMemory MT</p>
              <p className="text-[11px] text-zinc-500">Zero-Auth Direct</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${health.geminiConfigured ? "bg-emerald-500" : "bg-amber-400"}`} />
            <div>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Gemini 3.8 Flash</p>
              <p className="text-[11px] text-zinc-500">{health.geminiConfigured ? "Active & Fallback" : "Configured"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white">
              Studio Features & Modules
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Select a tool to begin processing audio, text, documents, or images.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 hidden sm:block">5 Active Capabilities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className={`group relative flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md ${mod.accentGradient}`}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${mod.iconBg} shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${mod.badgeBg}`}>
                      {mod.badge}
                    </span>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    {mod.subtitle}
                  </p>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                    {mod.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
                    {mod.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="font-mono text-[11px] text-zinc-400 font-normal">{mod.provider}</span>
                  <div className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Module</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Architecture & Monorepo Summary Banner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Monorepo Architecture</span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Engineered with Modern Fullstack Tooling
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Powered by a high-performance <strong>FastAPI asynchronous backend</strong> in Python, paired with a resilient <strong>Next.js 16 frontend</strong> utilizing React 19, Turbopack, and Tailwind CSS. Built to easily deploy across Vercel and Render.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
              Next.js 16
            </span>
            <span className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
              FastAPI
            </span>
            <span className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
              Python 3.11
            </span>
            <span className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
              Turbopack
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
