"use client";

import { useState, useRef, useEffect } from "react";
import { 
  HelpCircle, 
  Send, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  User, 
  Bot, 
  Paperclip, 
  Mic, 
  Volume2, 
  VolumeX, 
  Square, 
  X,
  Loader2
} from "lucide-react";
import { askQuestion, uploadPDF, transcribeAudio, synthesizeSpeech, ChatMessage } from "@/lib/api";

export default function QAPage() {
  const [context, setContext] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // STT Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTS Playback states
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Cleanup audio & recorder on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ----------------------------------------------------
  // Audio Playback (TTS)
  // ----------------------------------------------------
  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingIndex(null);
    setIsPlayingAudio(false);
    setIsSynthesizingTTS(false);
  };

  const handlePlayTTS = async (textToSpeak: string, msgIndex: number) => {
    // If clicking the currently playing message, toggle stop
    if (playingIndex === msgIndex && (isPlayingAudio || isSynthesizingTTS)) {
      stopAudio();
      return;
    }

    stopAudio();
    if (!textToSpeak.trim()) return;

    setIsSynthesizingTTS(true);
    setPlayingIndex(msgIndex);

    try {
      // Strip markdown symbols for natural speech synthesis
      const cleanText = textToSpeak.replace(/[*#_`~>]/g, "").trim();
      
      // Call existing modular synthesizeSpeech from api.ts
      const data = await synthesizeSpeech({
        text: cleanText.slice(0, 1500),
        provider: "free",
        voice_id: "en-US-JennyNeural",
      });

      const audioSrc = `data:${data.content_type || "audio/mp3"};base64,${data.audio_base64}`;
      const audio = new Audio(audioSrc);
      audioPlayerRef.current = audio;

      audio.onplay = () => {
        setIsPlayingAudio(true);
        setIsSynthesizingTTS(false);
      };

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = () => {
        stopAudio();
        setError("Failed to play synthesized audio.");
      };

      await audio.play();
    } catch (err: unknown) {
      console.error("TTS playback error:", err);
      stopAudio();
      setError(err instanceof Error ? err.message : "Text to speech failed");
    } finally {
      setIsSynthesizingTTS(false);
    }
  };

  const handlePromptTTS = () => {
    if (playingIndex === -1 && (isPlayingAudio || isSynthesizingTTS)) {
      stopAudio();
      return;
    }

    if (question.trim()) {
      handlePlayTTS(question.trim(), -1);
    } else {
      // If prompt is empty, read aloud the latest assistant message
      const lastBotMsg = [...messages].reverse().find((m) => m.role === "model");
      if (lastBotMsg) {
        handlePlayTTS(lastBotMsg.content, -1);
      }
    }
  };

  // ----------------------------------------------------
  // Speech Recording (STT)
  // ----------------------------------------------------
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          // Call existing modular transcribeAudio from api.ts
          const sttRes = await transcribeAudio(audioBlob, "auto", "whisper-large-v3-turbo");
          if (sttRes.transcript && sttRes.transcript.trim()) {
            setQuestion((prev) => (prev ? `${prev} ${sttRes.transcript.trim()}` : sttRes.transcript.trim()));
          }
        } catch (err: unknown) {
          console.error("STT transcription error:", err);
          setError(err instanceof Error ? err.message : "Audio transcription failed");
        } finally {
          setIsTranscribing(false);
          setRecordingSeconds(0);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error("Microphone access error:", err);
      setError("Microphone permission denied or microphone not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ----------------------------------------------------
  // QA Chat execution
  // ----------------------------------------------------
  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    setError(null);
    stopAudio();

    try {
      // Get the last 5 messages as history
      const history = messages.slice(-5);
      const data = await askQuestion(userMsg.content, context, history);
      
      const botMsg: ChatMessage = { role: "model", content: data.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
      // Remove optimistic user message on error
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

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
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
            Chat with Gemini 3.8 Flash. Includes Speech-to-Text, Voice playback, and PDF document context.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PDF Context Indicator */}
      {pdfName && (
        <div className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <FileText className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Active Document:</span> {pdfName}
          </div>
          <button onClick={clearPdf} className="text-zinc-400 hover:text-red-500 transition" title="Clear document context">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4 shadow-sm relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3 opacity-60">
            <Sparkles className="h-10 w-10 text-amber-500" />
            <p className="text-sm font-medium">Hello! Ask a question by typing or speaking, or upload a PDF to get started.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-amber-500 text-white rounded-tr-sm" : "bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"}`}>
                  {msg.content}
                </div>

                {/* Individual message voice playback button for bot responses */}
                {msg.role === "model" && (
                  <div className="flex items-center gap-2 pl-1">
                    <button
                      type="button"
                      onClick={() => handlePlayTTS(msg.content, idx)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                      title={playingIndex === idx && isPlayingAudio ? "Stop audio" : "Listen to answer (Neural TTS)"}
                    >
                      {playingIndex === idx && isSynthesizingTTS ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                          <span>Generating voice...</span>
                        </>
                      ) : playingIndex === idx && isPlayingAudio ? (
                        <>
                          <VolumeX className="h-3 w-3 text-amber-500 animate-pulse" />
                          <span className="text-amber-500 font-medium">Stop audio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
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
      <div className="shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 shadow-sm flex flex-col gap-2">
        {/* Live Recording Status Bar */}
        {(isRecording || isTranscribing) && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">
                {isRecording ? `Recording speech (${formatSeconds(recordingSeconds)})` : "Transcribing speech with Whisper..."}
              </span>
            </div>
            {isRecording && (
              <button 
                type="button"
                onClick={stopRecording}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 underline cursor-pointer"
              >
                Stop & Transcribe
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input 
            type="file" 
            accept=".pdf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPdf}
            className="p-3 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition disabled:opacity-50 flex-shrink-0"
            title="Upload PDF Context"
          >
            {uploadingPdf ? <Loader2 className="h-5 w-5 text-amber-500 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>

          <textarea
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "Ask a question (or use mic to speak)..."}
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
            {/* STT Microphone Button */}
            <button 
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing || loading}
              className={`p-2 rounded-lg transition ${
                isRecording 
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse" 
                  : isTranscribing 
                  ? "text-amber-500" 
                  : "text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={
                isRecording 
                  ? "Recording... click to stop and transcribe" 
                  : isTranscribing 
                  ? "Transcribing with Groq Whisper..." 
                  : "Speak your question (STT)"
              }
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              ) : isRecording ? (
                <Square className="h-4 w-4 fill-current text-rose-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* TTS Speaker Button in Prompt Bar */}
            <button 
              type="button"
              onClick={handlePromptTTS}
              disabled={isSynthesizingTTS || (!question.trim() && messages.length === 0)}
              className={`p-2 rounded-lg transition ${
                playingIndex === -1 && isPlayingAudio
                  ? "text-amber-500 animate-pulse bg-amber-50 dark:bg-amber-950/50"
                  : "text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
              }`}
              title={
                playingIndex === -1 && isPlayingAudio
                  ? "Stop audio"
                  : question.trim()
                  ? "Listen to current question (TTS)"
                  : "Listen to latest response (TTS)"
              }
            >
              {playingIndex === -1 && isSynthesizingTTS ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              ) : playingIndex === -1 && isPlayingAudio ? (
                <VolumeX className="h-4 w-4 text-amber-500" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            
            <button
              type="button"
              onClick={handleAsk}
              disabled={loading || !question.trim() || isRecording}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition shadow-sm"
              title="Send message"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
