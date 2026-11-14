import type { AuthResult } from './types';

/** RFC 7807 problem returned by the API, with the stable machine code the backend adds. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors?: Record<string, string[]>,
    public current?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get isConflict() { return this.status === 409; }
}

type Listener = (auth: AuthResult | null) => void;

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResult | null> | null = null;
const listeners = new Set<Listener>();

export const session = {
  get token() { return accessToken; },
  set(auth: AuthResult | null) {
    accessToken = auth?.accessToken ?? null;
    listeners.forEach((l) => l(auth));
  },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

async function toError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try { body = await res.json(); } catch { /* empty or non-JSON body */ }
  const message = (body.detail as string) || (body.title as string) || res.statusText || 'Request failed';
  return new ApiError(res.status, (body.code as string) ?? 'error', message, body.errors as Record<string, string[]> | undefined, body.current);
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request,
 * which matters because the server rotates the refresh token: two parallel refreshes would look like reuse.
 */
export function refreshSession(): Promise<AuthResult | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) { session.set(null); return null; }
      const auth = (await res.json()) as AuthResult;
      session.set(auth);
      return auth;
    } catch {
      session.set(null);
      return null;
    } finally {
      queueMicrotask(() => { refreshInFlight = null; });
    }
  })();
  return refreshInFlight;
}

export interface RequestOptions { method?: string; body?: unknown; signal?: AbortSignal; query?: Record<string, unknown> }

function buildUrl(path: string, query?: Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return `/api/v1${path}${s ? `?${s}` : ''}`;
}

export async function api<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
    signal: opts.signal,
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const auth = await refreshSession();
    if (auth) return api<T>(path, opts, true);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
