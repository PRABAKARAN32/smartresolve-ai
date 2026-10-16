const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}
