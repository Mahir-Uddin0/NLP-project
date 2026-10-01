import type { NextConfig } from "next";

// Extract backend base URL dynamically from environment or default to local FastAPI dev port
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const backendBase = rawApiUrl
  ? rawApiUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "")
  : (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendBase}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${backendBase}/health`,
      },
    ];
  },
};

export default nextConfig;
