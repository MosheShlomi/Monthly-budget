import { supabase } from "./supabase";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

async function handleUnauthenticated(): Promise<never> {
  await supabase.auth.signOut();
  window.location.href = `${BASE_PATH}/login`;
  throw new Error("Not authenticated");
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const expiresAt = data.session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - now < 60) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  }

  return data.session.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = await getToken();

  const buildHeaders = (t: string | null): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  });

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(token),
  });

  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token ?? null;
    if (!token) return handleUnauthenticated();
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: buildHeaders(token),
    });
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {}
    if (detail === "Not authenticated") return handleUnauthenticated();
    throw new Error(detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  let token = await getToken();

  const buildHeaders = (t: string | null): Record<string, string> =>
    t ? { Authorization: `Bearer ${t}` } : {};

  let res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(token),
    body: formData,
  });

  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token ?? null;
    if (!token) return handleUnauthenticated();
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(token),
      body: formData,
    });
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {}
    if (detail === "Not authenticated") return handleUnauthenticated();
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}
