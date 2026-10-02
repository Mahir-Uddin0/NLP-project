import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "active",
    provider: "OCR.space",
    max_file_size_mb: 1.0,
    max_pdf_pages: 3,
    supported_formats: ["bmp", "gif", "jpeg", "jpg", "pdf", "png", "tiff", "webp"],
  });
}
