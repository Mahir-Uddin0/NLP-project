import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "NLP Suite - Fullstack AI Workspace",
  description: "Monorepo NLP platform featuring STT (Groq Whisper), TTS, Machine Translation, Question Answering, and OCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 px-6 text-center text-xs text-zinc-500">
            NLP Project Monorepo • Powered by Next.js & FastAPI • Groq Whisper Integration
          </footer>
        </div>
      </body>
    </html>
  );
}
