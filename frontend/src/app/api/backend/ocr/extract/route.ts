import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"]);
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB limit
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || "K81145082488957";
const OCR_SPACE_API_URL = "https://api.ocr.space/parse/image";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const language = (formData.get("language") as string) || "eng";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { detail: "No valid file uploaded. Please select an image or PDF." },
        { status: 400 }
      );
    }

    const filename = file.name || "uploaded_file";
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          detail: `Unsupported file format '.${ext}'. Supported formats are: ${Array.from(
            SUPPORTED_EXTENSIONS
          ).join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          detail: `File exceeds maximum allowed size of 1 MB (uploaded size: ${sizeMb} MB). Please choose a smaller file.`,
        },
        { status: 400 }
      );
    }

    // Call OCR.space API
    const ocrFormData = new FormData();
    ocrFormData.append("apikey", OCR_SPACE_API_KEY);
    ocrFormData.append("language", language);
    ocrFormData.append("isOverlayRequired", "false");
    ocrFormData.append("detectOrientation", "true");
    ocrFormData.append("scale", "true");
    ocrFormData.append("OCREngine", "1");
    ocrFormData.append("file", file, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const upstreamRes = await fetch(OCR_SPACE_API_URL, {
      method: "POST",
      body: ocrFormData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { detail: `OCR.space service error (HTTP ${upstreamRes.status}).` },
        { status: 502 }
      );
    }

    const data = await upstreamRes.json();

    if (data.IsErroredOnProcessing) {
      let errorMsg = "OCR processing failed";
      if (Array.isArray(data.ErrorMessage)) {
        errorMsg = data.ErrorMessage.join("; ");
      } else if (typeof data.ErrorMessage === "string") {
        errorMsg = data.ErrorMessage;
      }
      const errorDetails = data.ErrorDetails ? ` ${data.ErrorDetails}` : "";
      return NextResponse.json(
        { detail: `OCR processing failed: ${errorMsg}${errorDetails}` },
        { status: 400 }
      );
    }

    const parsedResults = Array.isArray(data.ParsedResults) ? data.ParsedResults : [];
    const pagesBreakdown: Array<{
      page_number: number;
      parsed_text: string;
      word_count: number;
      character_count: number;
    }> = [];
    const extractedTextChunks: string[] = [];

    parsedResults.forEach((item: { ParsedText?: string }, idx: number) => {
      const pageText = (item.ParsedText || "").trim();
      const normalized = pageText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (normalized) {
        extractedTextChunks.push(normalized);
      }
      const words = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
      pagesBreakdown.push({
        page_number: idx + 1,
        parsed_text: normalized,
        word_count: words,
        character_count: normalized.length,
      });
    });

    const fullText =
      extractedTextChunks.length > 1
        ? extractedTextChunks.join("\n\n--- Page Break ---\n\n")
        : extractedTextChunks[0] || "";

    const processingMs =
      typeof data.ProcessingTimeInMilliseconds === "number" || typeof data.ProcessingTimeInMilliseconds === "string"
        ? parseInt(String(data.ProcessingTimeInMilliseconds), 10)
        : null;

    return NextResponse.json({
      extracted_text: fullText,
      filename,
      file_type: ext,
      file_size_bytes: file.size,
      page_count: pagesBreakdown.length || 1,
      pages: pagesBreakdown,
      processing_time_ms: Number.isNaN(processingMs) ? null : processingMs,
      provider: "OCR.space",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { detail: "OCR extraction timed out. Please try again with a smaller or higher contrast file." },
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { detail: `OCR extraction encountered an unexpected error: ${message}` },
      { status: 500 }
    );
  }
}
