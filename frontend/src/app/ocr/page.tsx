"use client";

import { useState } from "react";
import { ScanText, Upload, Image as ImageIcon, Copy, Check, AlertCircle, Sparkles } from "lucide-react";
import { extractTextFromImage, OCRResponse } from "@/lib/api";

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await extractTextFromImage(file);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to extract text from image");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (result?.extracted_text) {
      navigator.clipboard.writeText(result.extracted_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 mb-3">
            <ScanText className="h-3.5 w-3.5" /> Feature 5 of 5
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            Optical Character Recognition (OCR)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Extract text from scanned documents, screenshots, and camera photos.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-zinc-400">Endpoint: POST /api/v1/ocr/extract</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/20 text-xs sm:text-sm text-rose-900 dark:text-rose-200 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Feature Implementation Status:</span> Scheduled after Question Answering.
        </div>
      </div>

      {/* Image Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Box */}
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 dark:hover:border-rose-500 transition p-8 text-center bg-white dark:bg-zinc-900">
            <input
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.bmp"
              id="image-upload"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {file ? file.name : "Click to select or drop an image"}
              </div>
              <p className="text-xs text-zinc-500">
                PNG, JPG, WEBP, or BMP
              </p>
            </label>
          </div>

          <button
            onClick={handleExtract}
            disabled={loading || !file}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm py-3 transition shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Processing Image OCR...
              </span>
            ) : (
              <>
                <ScanText className="h-4 w-4" />
                Extract Text
              </>
            )}
          </button>
        </div>

        {/* Image Preview */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col items-center justify-center min-h-[220px]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-64 rounded-lg object-contain w-full"
            />
          ) : (
            <div className="text-center text-zinc-400 space-y-2">
              <ImageIcon className="h-10 w-10 mx-auto stroke-1" />
              <p className="text-xs">Image preview will appear here</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Extracted Text Result */}
      {result && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Extracted OCR Text
            </span>
            <div className="flex items-center gap-3">
              {result.confidence && (
                <span className="text-xs font-mono text-zinc-400">
                  Confidence: {(result.confidence * 100).toFixed(0)}%
                </span>
              )}
              <button
                onClick={copyText}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
            {result.extracted_text}
          </pre>
        </div>
      )}
    </div>
  );
}
