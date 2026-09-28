"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Download,
  AlertCircle,
  FileAudio,
  Volume2,
  Clock,
  FileText,
  Languages,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { transcribeAudio, STTResponse, STTSegment } from "@/lib/api";

const languageOptions = [
  { code: "auto", name: "Auto Detect (Multilingual)" },
  { code: "en", name: "English (en)" },
  { code: "es", name: "Spanish (es)" },
  { code: "fr", name: "French (fr)" },
  { code: "de", name: "German (de)" },
  { code: "bn", name: "Bengali (bn)" },
  { code: "hi", name: "Hindi (hi)" },
  { code: "ar", name: "Arabic (ar)" },
  { code: "zh", name: "Chinese (zh)" },
  { code: "ja", name: "Japanese (ja)" },
  { code: "ru", name: "Russian (ru)" },
  { code: "pt", name: "Portuguese (pt)" },
  { code: "it", name: "Italian (it)" },
];

export default function STTPage() {
  // Input mode: "mic" or "upload"
  const [activeTab, setActiveTab] = useState<"mic" | "upload">("mic");

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Configuration settings
  const [language, setLanguage] = useState("auto");
  const [selectedModel, setSelectedModel] = useState("whisper-large-v3-turbo");

  // Processing & Results
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<STTResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSegments, setShowSegments] = useState(true);

  // Audio Playback state for preview
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder & Web Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Draw real-time audio visualizer waveform on HTML5 canvas
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / 32) - 2;
      let x = 1;

      for (let i = 0; i < 32; i++) {
        // Average frequency band
        const sampleIndex = Math.floor((i / 32) * (bufferLength / 2));
        const value = dataArray[sampleIndex] || 0;
        const percent = value / 255;
        const barHeight = Math.max(6, percent * (canvas.height - 8));

        // Dynamic gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#4f46e5");
        gradient.addColorStop(1, "#ec4899");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight, 4);
        ctx.fill();

        x += barWidth + 2;
      }
    };

    render();
  }, []);

  // Start Live Audio Recording
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Select mime type supported by browser
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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Stop stream audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Stop visualizer animation
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start visualizer animation loop
      drawVisualizer();
    } catch (err: unknown) {
      console.error("Microphone access error:", err);
      setError(
        "Microphone access was denied or not available. Please allow microphone permissions in your browser."
      );
    }
  };

  // Stop Live Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Discard recording
  const discardRecording = () => {
    stopRecording();
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordingDuration(0);
    setResult(null);
  };

  // Toggle preview audio playback
  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setError(null);
      setResult(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setError(null);
      setResult(null);
    }
  };

  // Execute Transcription via Backend Groq API
  const handleTranscribe = async () => {
    const audioPayload = activeTab === "mic" ? recordedAudioBlob : uploadedFile;
    if (!audioPayload) {
      setError("Please record your voice or choose an audio file first.");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const data = await transcribeAudio(audioPayload, language, selectedModel);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    if (!result?.transcript) return;
    navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download transcript as file
  const handleDownload = (format: "txt" | "json") => {
    if (!result) return;
    let content = "";
    let mime = "text/plain";
    let extension = "txt";

    if (format === "txt") {
      content = result.transcript;
    } else {
      content = JSON.stringify(result, null, 2);
      mime = "application/json";
      extension = "json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nlp-transcript-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Groq Whisper API Active
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Speech to Text (STT)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Real-time microphone voice recording and ultra-fast transcription powered by Groq Whisper.
          </p>
        </div>

        {/* Status / Model pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-500">
            Model: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedModel}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Column & Configuration Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Audio Input (Mic or File) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-2xl bg-zinc-200/60 dark:bg-zinc-900 p-1.5 border border-zinc-300/60 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab("mic")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "mic"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Mic className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Record with Microphone</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === "upload"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Upload Audio File</span>
            </button>
          </div>

          {/* TAB 1: LIVE MICROPHONE RECORDING */}
          {activeTab === "mic" && (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
              {/* Waveform Canvas / Visualizer */}
              <div className="w-full max-w-md h-20 flex items-center justify-center">
                {isRecording ? (
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={72}
                    className="w-full h-full rounded-xl bg-zinc-50 dark:bg-zinc-950/60 p-2"
                  />
                ) : recordedAudioUrl ? (
                  <div className="flex items-center gap-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                    <Check className="h-4 w-4" />
                    Recording captured ({formatTime(recordingDuration)})
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Microphone ready. Tap button below to begin speaking.
                  </div>
                )}
              </div>

              {/* Big Pulsing Mic Button */}
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-3 rounded-full bg-red-500/20 animate-ping duration-1000" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`relative flex items-center justify-center h-24 w-24 rounded-full shadow-lg transition-all transform active:scale-95 ${
                    isRecording
                      ? "bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/30"
                      : "bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <Square className="h-8 w-8 fill-current" />
                  ) : (
                    <Mic className="h-9 w-9" />
                  )}
                </button>
              </div>

              {/* Timer & Controls */}
              <div className="space-y-1">
                <div className="font-mono text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200">
                  {formatTime(recordingDuration)}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isRecording
                    ? "Recording audio... Click stop when finished"
                    : recordedAudioBlob
                    ? "Ready to transcribe"
                    : "Click to start recording"}
                </p>
              </div>

              {/* Recorded Audio Preview Bar */}
              {recordedAudioUrl && !isRecording && (
                <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <FileAudio className="h-4 w-4 text-indigo-500" /> Recorded Speech Audio
                    </span>
                    <span className="font-mono text-zinc-400">
                      {((recordedAudioBlob?.size || 0) / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <audio
                    ref={previewAudioRef}
                    src={recordedAudioUrl}
                    onPlay={() => setIsPlayingPreview(true)}
                    onPause={() => setIsPlayingPreview(false)}
                    onEnded={() => setIsPlayingPreview(false)}
                    controls
                    className="w-full h-10"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={discardRecording}
                      disabled={isTranscribing}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-record
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIO FILE UPLOAD */}
          {activeTab === "upload" && (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-8 shadow-xs space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed transition-all p-8 text-center ${
                  isDragging
                    ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/40 scale-[1.01]"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-950/40"
                }`}
              >
                <input
                  type="file"
                  accept="audio/*,video/mp4,video/mpeg,.wav,.mp3,.mpeg,.mpg,.mpga,.m4a,.ogg,.webm,.flac,.mp4"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                    isDragging
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                  }`}>
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {uploadedFile
                        ? uploadedFile.name
                        : isDragging
                        ? "Drop audio/video file here..."
                        : "Choose audio file or drag & drop here"}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">
                      WAV, MP3, MPEG, MPG, M4A, OGG, WEBM, FLAC, MP4 (Max: 25MB)
                    </p>
                  </div>
                </label>
              </div>

              {uploadedFile && (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileAudio className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="font-semibold truncate text-zinc-800 dark:text-zinc-200">
                      {uploadedFile.name}
                    </span>
                    <span className="text-zinc-400">
                      ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-zinc-400 hover:text-red-500 font-semibold transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Big Action Submit Button */}
          <button
            onClick={handleTranscribe}
            disabled={
              isTranscribing ||
              (activeTab === "mic" && !recordedAudioBlob) ||
              (activeTab === "upload" && !uploadedFile)
            }
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-md shadow-indigo-600/20 transition active:scale-[0.99]"
          >
            {isTranscribing ? (
              <span className="flex items-center gap-2.5">
                <span className="h-5 w-5 rounded-full border-3 border-white border-t-transparent animate-spin" />
                Transcribing Audio with Groq Whisper...
              </span>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Transcribe Audio (Groq Whisper)
              </>
            )}
          </button>
        </div>

        {/* Right 1 Col: Transcription Settings */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
              <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Engine Configuration
            </h3>

            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Spoken Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-sm text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400">
                Auto Detect detects languages across 90+ spoken dialects.
              </p>
            </div>

            {/* Whisper Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Groq Whisper Model
              </label>
              <div className="space-y-2">
                <label
                  onClick={() => setSelectedModel("whisper-large-v3-turbo")}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedModel === "whisper-large-v3-turbo"
                      ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={selectedModel === "whisper-large-v3-turbo"}
                    onChange={() => setSelectedModel("whisper-large-v3-turbo")}
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      Whisper Large v3 Turbo
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Fastest (~1s)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Groq optimized for speed and near-zero latency.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setSelectedModel("whisper-large-v3")}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedModel === "whisper-large-v3"
                      ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={selectedModel === "whisper-large-v3"}
                    onChange={() => setSelectedModel("whisper-large-v3")}
                    className="mt-1 text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                      Whisper Large v3
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Full Whisper architecture for maximum vocabulary precision.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Provider Info Card */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Inference Provider:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Groq Cloud LPU</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Response Format:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">verbose_json</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Error encountered:</span>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* TRANSCRIPTION RESULTS SECTION */}
      {result && (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm space-y-6">
          {/* Top Bar with Metrics & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" /> Transcribed Successfully
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Lang: {result.language?.toUpperCase()}
              </span>
              {result.duration_seconds && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {result.duration_seconds}s
                </span>
              )}
              {result.word_count !== undefined && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {result.word_count} words
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button
                onClick={() => handleDownload("txt")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition"
                title="Download text file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export .txt</span>
              </button>
              <button
                onClick={() => handleDownload("json")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition"
                title="Download JSON with segments"
              >
                <Download className="h-3.5 w-3.5" />
                <span>.json</span>
              </button>
            </div>
          </div>

          {/* Transcript Text Box */}
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/70 p-6">
            <p className="text-lg text-zinc-900 dark:text-zinc-100 font-normal leading-relaxed whitespace-pre-wrap select-all">
              {result.transcript || <span className="italic text-zinc-400">No speech detected in audio.</span>}
            </p>
          </div>

          {/* Timestamped Segments Section */}
          {result.segments && result.segments.length > 0 && (
            <div className="space-y-3 pt-2">
              <button
                onClick={() => setShowSegments(!showSegments)}
                className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Timeline Segments ({result.segments.length})
                </span>
                {showSegments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showSegments && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.segments.map((seg) => (
                    <div
                      key={seg.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/50 text-xs"
                    >
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 shrink-0 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        {seg.start}s - {seg.end}s
                      </span>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-normal">
                        {seg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Next Action Cards: Cross-module shortcuts */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              Continue with this text:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/translation"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition"
              >
                <Languages className="h-3.5 w-3.5" /> Translate Text <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/qa"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
              >
                <FileText className="h-3.5 w-3.5" /> Ask Questions About This Audio <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
