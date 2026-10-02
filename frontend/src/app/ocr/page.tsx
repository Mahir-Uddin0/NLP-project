"use client";

import { useState, useRef, useId } from "react";
import Link from "next/link";
import {
  ScanText,
  Upload,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  RotateCcw,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Layers,
  Volume2,
  Languages,
  HelpCircle,
  X,
  FileWarning,
} from "lucide-react";
import { extractTextWithOCR, OCRResponse } from "@/lib/api";

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB limit
const SUPPORTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"];

const OCR_LANGUAGES = [
  { code: "eng", name: "English (Default)" },
  { code: "spa", name: "Spanish (Español)" },
  { code: "fre", name: "French (Français)" },
  { code: "ger", name: "German (Deutsch)" },
  { code: "ara", name: "Arabic (العربية)" },
  { code: "chs", name: "Chinese Simplified (简体中文)" },
  { code: "jpn", name: "Japanese (日本語)" },
  { code: "kor", name: "Korean (한국어)" },
  { code: "por", name: "Portuguese (Português)" },
  { code: "ita", name: "Italian (Italiano)" },
  { code: "rus", name: "Russian (Русский)" },
  { code: "tur", name: "Turkish (Türkçe)" },
];

export default function OCRPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("eng");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activePageTab, setActivePageTab] = useState<number | "all">("all");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const langSelectId = useId();

  const handleFileSelect = (file: File) => {
    setError(null);
    setResult(null);

    // Validate size limit (1 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`File exceeds the maximum allowed size of 1 MB (selected size: ${sizeMb} MB). Please choose a smaller file.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file format '.${ext}'. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ").toUpperCase()}`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);

    // If image, create thumbnail preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setError("Please select or drop an image or PDF file to extract text.");
      return;
    }

    setLoading(true);
    setError(null);
    setActivePageTab("all");

    try {
      const data = await extractTextWithOCR(selectedFile, language);
      setResult(data);
    } catch (err: unknown) {
      console.error("OCR Extraction failed:", err);
      const msg = err instanceof Error ? err.message : "OCR Extraction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setActivePageTab("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopyText = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = (textToDownload: string) => {
    if (!textToDownload) return;
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ocr_extracted_${selectedFile?.name || "text"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Sample quick test creator for rapid evaluation
  const handleLoadSample = (sampleType: "invoice" | "receipt") => {
    handleReset();
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 250;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 600, 250);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px sans-serif";

    if (sampleType === "invoice") {
      ctx.fillText("INVOICE #9482-B", 40, 50);
      ctx.font = "16px sans-serif";
      ctx.fillText("Client: Global Tech Enterprises", 40, 90);
      ctx.fillText("Date: October 15, 2026", 40, 120);
      ctx.fillText("Total Due: $3,500.00 USD", 40, 160);
      ctx.fillText("Payment Status: Pending Approval", 40, 190);
    } else {
      ctx.fillText("RECEIPT - ARTIFICIAL INTELLIGENCE LAB", 40, 50);
      ctx.font = "16px sans-serif";
      ctx.fillText("Items: NLP Compute Credits x 50", 40, 90);
      ctx.fillText("Subtotal: $450.00", 40, 120);
      ctx.fillText("Tax (8%): $36.00", 40, 150);
      ctx.fillText("Amount Paid: $486.00 via Corporate Card", 40, 190);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample_${sampleType}.png`, { type: "image/png" });
        handleFileSelect(file);
      }
    }, "image/png");
  };

  // Determine which text to display based on active page tab
  const getDisplayText = () => {
    if (!result) return "";
    if (activePageTab === "all") return result.extracted_text;
    const targetPage = result.pages?.find((p) => p.page_number === activePageTab);
    return targetPage?.parsed_text || "";
  };

  const displayText = getDisplayText();

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 mb-3 border border-rose-200 dark:border-rose-800">
            <ScanText className="h-3.5 w-3.5" /> Feature 5 of 5: Optical Character Recognition
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            OCR Document & Image Studio
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Extract high-precision text from images and PDF files using the OCR.space cloud engine. Strict limits enforced: max 1 MB file size and max 3 PDF pages.
          </p>
        </div>

        {/* Engine Specs Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-rose-900 dark:text-rose-200 leading-none">
              OCR.space Cloud Engine
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
              Max 1 MB • Max 3 Pages PDF
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Samples */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Instant Test Generators
          </span>
          <span className="text-xs text-zinc-400">Click to load and test immediately</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleLoadSample("invoice")}
            className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                📄 Load Sample Invoice Card
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Generates Invoice #9482-B with numerical dollars & dates
              </div>
            </div>
            <span className="text-xs text-rose-600 font-semibold">Load Sample &rarr;</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSample("receipt")}
            className="p-3 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                🧾 Load Sample Receipt Card
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Generates AI Lab receipt with subtotals, tax & items
              </div>
            </div>
            <span className="text-xs text-rose-600 font-semibold">Load Sample &rarr;</span>
          </button>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <label htmlFor={langSelectId} className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
            OCR Language:
          </label>
          <select
            id={langSelectId}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {OCR_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-zinc-400 font-medium px-2">
          Strict limit: 1 MB file size • 3 pages for PDF
        </div>
      </div>

      {/* Upload & Dropzone Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upload Dropzone */}
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[260px] relative ${
              isDragging
                ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 scale-[1.01]"
                : "border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-400 hover:bg-rose-50/10"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tiff"
              className="hidden"
            />

            <div className="h-16 w-16 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-xs">
              <Upload className="h-8 w-8" />
            </div>

            <div className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Drag & Drop Image or PDF File
            </div>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Supports PDF, PNG, JPG, WEBP, BMP (Max 1 MB, max 3 pages for PDF)
            </p>

            <button
              type="button"
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition pointer-events-none"
            >
              Browse Files on Computer
            </button>
          </div>

          {/* Selected File Details & Preview */}
          {selectedFile && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                    {selectedFile.type === "application/pdf" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[240px]">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "file"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Image Preview thumbnail if available */}
              {previewUrl && (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-48 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                  <img
                    src={previewUrl}
                    alt="Uploaded preview"
                    className="max-h-48 object-contain w-auto mx-auto"
                  />
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExtract}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-sm shadow-rose-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing with OCR.space...</span>
                  </>
                ) : (
                  <>
                    <ScanText className="h-4 w-4" />
                    <span>Extract Text Now</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-800 dark:text-red-200 text-xs">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Extraction Notice: </span>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: OCR Results Studio */}
        <div className="flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4 min-h-[380px]">
          {/* Studio Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Extracted Text Output
              </span>
            </div>

            {result && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(displayText)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadTxt(displayText)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
                  title="Download .txt"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">TXT</span>
                </button>
              </div>
            )}
          </div>

          {/* Multi-Page Tabs if pages > 1 */}
          {result && result.pages && result.pages.length > 1 && (
            <div className="flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActivePageTab("all")}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activePageTab === "all"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                All Pages ({result.page_count})
              </button>
              {result.pages.map((p) => (
                <button
                  key={p.page_number}
                  type="button"
                  onClick={() => setActivePageTab(p.page_number)}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    activePageTab === p.page_number
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Page {p.page_number}
                </button>
              ))}
            </div>
          )}

          {/* Text Area Content */}
          <div className="flex-1 flex flex-col justify-between">
            {result ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto selection:bg-rose-200">
                  {displayText || <span className="text-zinc-400 italic">No text recognized on this page.</span>}
                </div>

                {/* Pipeline Direct Actions */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Send Extracted Text To Modules
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      href="/translation"
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 font-semibold text-blue-600 dark:text-blue-400 transition flex items-center gap-1.5"
                    >
                      <Languages className="h-3.5 w-3.5" />
                      <span>Translate Text</span>
                    </Link>

                    <Link
                      href="/qa"
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/30 font-semibold text-amber-600 dark:text-amber-400 transition flex items-center gap-1.5"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Ask QA Chatbot</span>
                    </Link>

                    <Link
                      href="/tts"
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/30 font-semibold text-purple-600 dark:text-purple-400 transition flex items-center gap-1.5"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Voice Studio (TTS)</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                <ScanText className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3 stroke-[1.5]" />
                <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  Ready to Extract
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  Upload an image or PDF file on the left and click &quot;Extract Text Now&quot; to inspect parsed results.
                </p>
              </div>
            )}

            {/* Results Footer Metrics */}
            {result && (
              <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold font-mono">
                    {result.provider}
                  </span>
                  {result.processing_time_ms !== undefined && (
                    <span className="text-zinc-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {result.processing_time_ms} ms
                    </span>
                  )}
                </div>

                <div className="text-zinc-400 font-mono">
                  {displayText.split(/\s+/).filter(Boolean).length} words • {displayText.length} chars • {result.page_count ?? 1} page{(result.page_count ?? 1) > 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
