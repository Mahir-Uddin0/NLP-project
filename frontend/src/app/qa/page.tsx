"use client";

import { useState } from "react";
import { HelpCircle, Send, FileText, AlertCircle, Sparkles, CheckCircle } from "lucide-react";
import { askQuestion, QAResponse } from "@/lib/api";

export default function QAPage() {
  const [context, setContext] = useState(
    "Natural Language Processing (NLP) is a branch of artificial intelligence that gives computers the ability to understand text and spoken words in much the same way human beings can."
  );
  const [question, setQuestion] = useState("What is Natural Language Processing?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError("Please enter a question to ask.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await askQuestion(question, context);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-3">
            <HelpCircle className="h-3.5 w-3.5" /> Feature 4 of 5
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            Question Answering System
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Extract accurate answers from documents or ask open questions using Google's Gemini API.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-zinc-400">Endpoint: POST /api/v1/qa/ask</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Powered by Gemini 3.8 Flash:</span> Provides fast, context-aware answers to your questions.
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-6">
        {/* Context Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <FileText className="h-3.5 w-3.5" /> Reference Context / Document (Optional)
            </label>
            <span className="text-xs text-zinc-400">{context.length} chars</span>
          </div>
          <textarea
            rows={5}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Paste reference text or paragraph here for extractive QA..."
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Question Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Your Question
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is Natural Language Processing?"
              className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk();
              }}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 transition shadow-sm"
            >
              {loading ? (
                "Thinking..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer Card */}
      {result && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Answer
              </span>
            </div>
            {result.confidence && (
              <span className="text-xs font-mono text-zinc-400">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-base text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
            {result.answer}
          </p>
        </div>
      )}
    </div>
  );
}
