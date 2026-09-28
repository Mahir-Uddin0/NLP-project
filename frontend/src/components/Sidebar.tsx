"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Mic,
  Volume2,
  Languages,
  HelpCircle,
  ScanText,
  LayoutDashboard,
  Zap,
  Server,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Radio,
} from "lucide-react";
import { checkBackendHealth } from "@/lib/api";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "1. Speech to Text",
    href: "/stt",
    icon: Mic,
    badge: "Active",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    poweredBy: "Groq Whisper",
  },
  {
    name: "2. Text to Speech",
    href: "/tts",
    icon: Volume2,
    badge: "Active",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    poweredBy: "ElevenLabs & Free",
  },
  {
    name: "3. Machine Translation",
    href: "/translation",
    icon: Languages,
    badge: "Step 3",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    poweredBy: "Pending",
  },
  {
    name: "4. Question Answering",
    href: "/qa",
    icon: HelpCircle,
    badge: "Step 4",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    poweredBy: "Pending",
  },
  {
    name: "5. OCR Extraction",
    href: "/ocr",
    icon: ScanText,
    badge: "Step 5",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    poweredBy: "Pending",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{
    ok: boolean | null;
    groqConfigured?: boolean;
    elevenlabsConfigured?: boolean;
  }>({ ok: null });

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const res = await checkBackendHealth();
      if (mounted) {
        setBackendStatus({
          ok: res.ok,
          groqConfigured: res.groqConfigured,
          elevenlabsConfigured: res.elevenlabsConfigured,
        });
      }
    };
    check();
    const timer = setInterval(check, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-zinc-900 dark:text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Radio className="h-4 w-4" />
          </div>
          <span className="font-extrabold tracking-tight">NLP Suite</span>
        </Link>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          aria-label="Toggle navigation menu"
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {isOpenMobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900">
          <Link
            href="/"
            onClick={() => setIsOpenMobile(false)}
            className="flex items-center gap-3 font-bold text-zinc-900 dark:text-white group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight leading-none text-zinc-900 dark:text-white">
                NLP Suite
              </div>
              <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">
                Fullstack AI Platform
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsOpenMobile(false)}
            aria-label="Close sidebar"
            className="lg:hidden text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feature Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            AI Modules
          </div>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpenMobile(false)}
                className={`group flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Live Service Status & API Links */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
          {/* Backend Status Box */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Server className="h-3.5 w-3.5" /> FastAPI Server
              </span>
              {backendStatus.ok === null ? (
                <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
                  Checking
                </span>
              ) : backendStatus.ok ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Online
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                  <XCircle className="h-3.5 w-3.5" />
                  Offline
                </span>
              )}
            </div>

            {/* Groq Status */}
            <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Zap className="h-3.5 w-3.5 text-orange-500" /> Groq STT Engine
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                Whisper Turbo
              </span>
            </div>

            {/* TTS Status */}
            <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Volume2 className="h-3.5 w-3.5 text-purple-500" /> TTS Engine
              </span>
              <span className="text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                {backendStatus.elevenlabsConfigured ? "ElevenLabs & Free" : "Free Neural"}
              </span>
            </div>
          </div>

          {/* Swagger link */}
          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-indigo-300 dark:hover:bg-zinc-800/60 transition"
          >
            <span>FastAPI Interactive Docs</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    </>
  );
}
