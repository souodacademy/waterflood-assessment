import { supabase } from "@/integrations/supabase/client";

const apiBase = import.meta.env.VITE_DOTNET_API_URL || "http://127.0.0.1:5000";

export async function dotnetRequest<T = void>(path: string, init: RequestInit = {}): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.json().catch(() => undefined);
    throw new Error(detail?.detail ?? `API request failed (${response.status}).`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
