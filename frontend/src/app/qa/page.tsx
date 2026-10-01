"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, Send, FileText, AlertCircle, Sparkles, User, Bot, Paperclip, Mic, Volume2, X } from "lucide-react";
import { askQuestion, uploadPDF, ChatMessage } from "@/lib/api";

export default function QAPage() {
  const [context, setContext] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      // Get the last 5 messages as history
      const history = messages.slice(-5);
      const data = await askQuestion(userMsg.content, context, history);
      
      const botMsg: ChatMessage = { role: "model", content: data.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
      // Remove the optimistic user message if failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setUploadingPdf(true);
    setError(null);
    try {
      const data = await uploadPDF(file);
      setContext(data.extracted_text);
      setPdfName(data.filename);
      
      // Add a system message to the chat
      setMessages((prev) => [
        ...prev, 
        { role: "model", content: `I have analyzed the document "${data.filename}". You can now ask me questions about it!` }
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearPdf = () => {
    setContext("");
    setPdfName(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 shrink-0">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-3">
            <HelpCircle className="h-3.5 w-3.5" /> QA Chatbot
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            Conversational QA System
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Chat with Gemini 3.8 Flash. Upload a PDF to set the context.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PDF Context Indicator */}
      {pdfName && (
        <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <FileText className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Active Document:</span> {pdfName}
          </div>
          <button onClick={clearPdf} className="text-zinc-400 hover:text-red-500 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4 shadow-sm relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3 opacity-60">
            <Sparkles className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium">Hello! Ask me anything or upload a PDF to get started.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-amber-500 text-white rounded-tr-sm" : "bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Bot className="h-4 w-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-tl-sm flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm flex items-end gap-2">
        <input 
          type="file" 
          accept=".pdf"
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPdf}
          className="p-3 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition disabled:opacity-50 flex-shrink-0"
          title="Upload PDF Context"
        >
          {uploadingPdf ? <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>

        <textarea
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-transparent py-3 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none min-h-[44px] max-h-[120px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />

        <div className="flex items-center gap-1 pb-1 pr-1 flex-shrink-0">
          <button 
            className="p-2 text-zinc-400 hover:text-blue-500 transition rounded-lg"
            title="Speech to Text (Coming Soon)"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button 
            className="p-2 text-zinc-400 hover:text-blue-500 transition rounded-lg"
            title="Text to Speech (Coming Soon)"
          >
            <Volume2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition shadow-sm"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
