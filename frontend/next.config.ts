import type { NextConfig } from "next";

function resolveBackendBaseUrl(): string {
  const raw = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  const normalized = raw.replace(/\/+$/, "");
  const isVercelDeployment = process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production";

  if (!normalized) {
    if (isVercelDeployment) {
      throw new Error("Missing API_BASE_URL for production deployment. Set API_BASE_URL to your backend https URL.");
    }
    return "http://localhost:8000";
  }

  if (isVercelDeployment && !/^https:\/\//.test(normalized)) {
    throw new Error("Invalid API_BASE_URL for production deployment. Use an https backend URL.");
  }

  return normalized;
}

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBaseUrl = resolveBackendBaseUrl();
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendBaseUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
