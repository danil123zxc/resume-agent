import { useAuthStore } from "./store";
import { supabase } from "./supabase";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
  retries?: number;
  retryDelayMs?: number;
};

export class ApiRequestError extends Error {
  status: number;
  rawMessage: string;

  constructor(message: string, status: number, rawMessage: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.rawMessage = rawMessage;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(text: string, status: number): string {
  if (!text.trim()) return `Request failed: ${status}`;
  try {
    const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
  } catch {
    return text;
  }
  return text;
}

function toFriendlyMessage(message: string, status: number): string {
  const normalized = message.toLowerCase();
  if (/ai service is not configured|api key required|google_api_key|gemini_api_key|invalid api key|model not found/.test(normalized)) {
    return "AI service is not configured on the backend. Add GOOGLE_API_KEY and restart the backend server.";
  }
  if (/quota|resource_exhausted|rate limit|too many requests|429|gemini/.test(normalized)) {
    return "AI service quota is currently exhausted. Please try again in a few minutes.";
  }
  if (/service unavailable|temporarily unavailable|timed out|timeout|deadline exceeded|overloaded/.test(normalized)) {
    return "AI provider is temporarily unavailable. Please try again shortly.";
  }
  if (status === 503) {
    return "Service is temporarily unavailable. Please try again shortly.";
  }
  if (status === 429) {
    return "Too many requests right now. Please wait a moment and retry.";
  }
  if (status >= 500) {
    return "Server error occurred. Please try again shortly.";
  }
  return message;
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

async function handleUnauthorizedResponse(): Promise<never> {
  await supabase.auth.signOut();
  throw new ApiRequestError("Session expired. Please sign in again.", 401, "Unauthorized");
}

function resolveBaseUrl(): string {
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    return "";
  }
  return "http://localhost:8000";
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = resolveBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export async function apiRequest<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = buildApiUrl(path);
  const headers: Record<string, string> = {
    ...(opts.headers || {}),
  };

  if (opts.auth) {
    const token = useAuthStore.getState().session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof FormData !== "undefined" && opts.body instanceof FormData) {
      body = opts.body;
    } else if (typeof opts.body === "string") {
      body = opts.body;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const retries = Math.max(0, opts.retries ?? 0);
  const retryDelayMs = Math.max(200, opts.retryDelayMs ?? 600);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers,
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        const message = extractErrorMessage(text, res.status);
        if (res.status === 401) {
          await handleUnauthorizedResponse();
        }
        if (attempt < retries && shouldRetryStatus(res.status)) {
          await wait(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new ApiRequestError(toFriendlyMessage(message, res.status), res.status, message);
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        return (await res.json()) as T;
      }
      return (await res.blob()) as unknown as T;
    } catch (error) {
      if (error instanceof ApiRequestError) throw error;
      if (error instanceof Error && /API base URL is not configured/.test(error.message)) throw error;
      if (attempt < retries) {
        await wait(retryDelayMs * (attempt + 1));
        continue;
      }
      let apiOrigin = "the server";
      if (/^https?:\/\//.test(url)) {
        apiOrigin = new URL(url).origin;
      } else if (typeof window !== "undefined") {
        apiOrigin = window.location.origin;
      }
      throw new Error(`Network issue while contacting ${apiOrigin}. Check server availability and API proxy configuration.`);
    }
  }
  throw new Error("Request failed");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
