import { useAuthStore } from "./store";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    ...(opts.headers || {}),
  };

  if (opts.auth) {
    const token = useAuthStore.getState().session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.blob()) as unknown as T;
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

