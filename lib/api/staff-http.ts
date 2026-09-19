import { toApiError, toNetworkError } from "./errors";
import type { AdminAccount, AdminRole, AdminSession } from "@/lib/admin-types";

/**
 * Bosqich 17 — staff (admin) HTTP qatlami. Marketplace `http.ts`dan ATAYLAB
 * ALOHIDA: butunlay boshqa cookie (`staff_refresh_token`), boshqa access
 * token, boshqa `/staff/*` endpoint oilasi — ikkalasi bir-biriga
 * ARALASHMASLIGI SHART (bo'lim 91-J, xodim va bozor sessiyasi mustaqil).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const SESSION_KEY = "bd_staff_session";

let accessToken: string | null = null;
export function setStaffAccessToken(token: string | null): void {
  accessToken = token;
}

function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (Date.parse(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
function writeSession(session: AdminSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
export const staffSessionStore = { read: readSession, write: writeSession, clear: clearSession };

const ACCOUNT_KEY = "bd_staff_account";
function readAccount(): AdminAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as AdminAccount) : null;
  } catch {
    return null;
  }
}
function writeAccount(account: AdminAccount): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}
function clearAccount(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_KEY);
}
export const staffAccountStore = { read: readAccount, write: writeAccount, clear: clearAccount };

export function roleToLower(role: string): AdminRole {
  return role.toLowerCase() as AdminRole;
}

function decodeJwtSub(token: string): string {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { sub?: string }).sub ?? "";
  } catch {
    return "";
  }
}
export { decodeJwtSub as decodeStaffJwtSub };

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/staff/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      clearSession();
      clearAccount();
      setStaffAccessToken(null);
      return null;
    }
    const body = (await res.json()) as { accessToken: string };
    setStaffAccessToken(body.accessToken);
    return body.accessToken;
  } catch {
    return null;
  }
}
function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function bootstrapStaffSession(): void {
  if (typeof window === "undefined") return;
  if (accessToken) return;
  if (!readSession()) return;
  void refreshOnce();
}

export interface StaffHttpInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Idempotency-Key header — moliyaviy mutatsiyalar uchun barqaror kalit */
  idempotencyKey?: string;
}

async function rawFetch(path: string, init: StaffHttpInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  if (init.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE}${path}`, { ...init, body, headers, credentials: "include" });
}

export async function staffHttp<T>(path: string, init: StaffHttpInit = {}, allowRetry = true): Promise<T> {
  let res: Response;
  try {
    res = await rawFetch(path, init);
  } catch (cause) {
    throw toNetworkError(cause);
  }
  if (res.status === 401 && allowRetry) {
    const token = await refreshOnce();
    if (token) return staffHttp<T>(path, init, false);
    throw await toApiError(res);
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function staffToQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
