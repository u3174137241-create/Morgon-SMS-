import { getApiBaseUrl, getAppPassword } from "./storage";
import type {
  Category,
  HealthStatus,
  Lead,
  LeadStats,
  LeadStatus,
  LocationConfig,
  NotificationRecord,
  SearchRun,
  Settings,
  SourceRecord,
} from "./types";

export class NotConnectedError extends Error {
  constructor() {
    super("Ingen server konfigurerad ännu.");
    this.name = "NotConnectedError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Fel lösenord.");
    this.name = "UnauthorizedError";
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = await getApiBaseUrl();
  if (!base) throw new NotConnectedError();
  const password = await getAppPassword();

  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as any) };
  if (password) headers["x-app-password"] = password;

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...opts, headers });
  } catch (err) {
    throw new Error(`Kunde inte nå servern på ${base}. Kontrollera att den körs och att telefonen är på samma nätverk.`);
  }

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`${res.status}: ${await res.text().catch(() => res.statusText)}`);
  if (res.status === 204) return null as T;
  return res.json();
}

/** Verifies a candidate server URL + password combo works, without touching stored settings. */
export async function testConnection(baseUrl: string, password: string): Promise<HealthStatus> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (password) headers["x-app-password"] = password;
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/health`, { headers });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Servern svarade ${res.status}`);
  return res.json();
}

export const api = {
  health: () => request<HealthStatus>("/api/health"),
  stats: () => request<LeadStats>("/api/stats"),

  leads: (filter: { status?: string; category?: string; location?: string; minScore?: number } = {}) => {
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.category) params.set("category", filter.category);
    if (filter.location) params.set("location", filter.location);
    if (filter.minScore !== undefined) params.set("minScore", String(filter.minScore));
    return request<Lead[]>(`/api/leads?${params.toString()}`);
  },
  lead: (id: string) => request<Lead>(`/api/leads/${id}`),
  updateLeadStatus: (id: string, status: LeadStatus) =>
    request<Lead>(`/api/leads/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),

  notifications: (limit = 50) => request<NotificationRecord[]>(`/api/notifications?limit=${limit}`),

  settings: () => request<Settings>("/api/settings"),
  updateSettings: (patch: Partial<Settings>) => request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),

  categories: () => request<Category[]>("/api/categories"),
  setCategoryEnabled: (id: string, enabled: boolean) =>
    request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),

  locations: () => request<LocationConfig[]>("/api/locations"),
  setLocationEnabled: (id: string, enabled: boolean) =>
    request(`/api/locations/${id}`, { method: "PUT", body: JSON.stringify({ enabled }) }),

  sources: () => request<SourceRecord[]>("/api/sources"),
  searchRuns: () => request<SearchRun[]>("/api/search-runs"),
  triggerSearch: () => request<{ ok: boolean; message: string }>("/api/search-runs/trigger", { method: "POST" }),
};
