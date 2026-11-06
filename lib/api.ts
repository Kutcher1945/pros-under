'use client';

/* JWT client for prosecutor-backend — same flow as prosecutor_dtp_next/lib/api-client.ts:
   /api/v1/auth/login/ issues access+refresh, 401 triggers one shared refresh. */

// Local development talks to the backend's `runserver` on :8000 unless told otherwise.
const DEV_BACKEND_URL = 'http://localhost:8000';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || (process.env.NODE_ENV === 'development' ? DEV_BACKEND_URL : '');

const ACCESS_KEY = 'opeka_access';
const REFRESH_KEY = 'opeka_refresh';
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiAuthError extends Error {}

/** Non-2xx answer; `status` lets callers tell «no Опека profile» (403) apart. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function url(path: string): string {
  return `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeTokens(access: string, refresh?: string) {
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Storage blocked: nothing stored.
  }
}

export function hasSession(): boolean {
  return Boolean(read(REFRESH_KEY));
}

/** DRF error bodies: {error}, {detail}, {non_field_errors: [...]} or {field: [...]}. */
export function errorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body)) return body.length ? body.join(' ') : null;
  const parts = Object.entries(body as Record<string, unknown>).map(([key, value]) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value);
    return key === 'detail' || key === 'error' || key === 'non_field_errors' ? text : `${key}: ${text}`;
  });
  return parts.length ? parts.join('; ') : null;
}

export async function login(username: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url('/api/v1/auth/login/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new ApiAuthError('Сервер недоступен. Попробуйте позже.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The platform auth answers in English; show the Russian wording users expect.
    throw new ApiAuthError(response.status === 401 ? 'Неверное имя пользователя или пароль.' : errorMessage(data) || 'Не удалось войти');
  }
  storeTokens(data.tokens.access, data.tokens.refresh);
}

/** Revokes the refresh token on the server first, then forgets the local tokens
 * (also when the server is unreachable — the user still leaves this device). */
export async function logout(): Promise<void> {
  const access = read(ACCESS_KEY);
  const refresh = read(REFRESH_KEY);
  try {
    if (access && refresh) {
      await fetch(url('/api/v1/auth/logout/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ refresh }),
      });
    }
  } catch {
    // Server unreachable: the token expires on its own; local sign-out still happens.
  } finally {
    clearTokens();
  }
}

async function doRefresh(): Promise<string | null> {
  const refresh = read(REFRESH_KEY);
  if (!refresh) return null;
  const response = await fetch(url('/api/v1/auth/token/refresh/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  }).catch(() => null);
  if (!response?.ok) {
    clearTokens();
    return null;
  }
  const data: { access: string; refresh?: string } = await response.json();
  storeTokens(data.access, data.refresh);
  return data.access;
}

// Refresh tokens are single-use (ROTATE + BLACKLIST): concurrent 401s share one refresh.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Authenticated fetch with one refresh-and-retry on 401. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const access = read(ACCESS_KEY);
  if (!access) throw new ApiAuthError('Не авторизован');

  const send = (token: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(url(path), { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, signal: controller.signal })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') throw new Error('Сервер не ответил вовремя. Попробуйте ещё раз.');
        throw new Error('Сервер недоступен. Проверьте подключение.');
      })
      .finally(() => clearTimeout(timer));
  };

  let response = await send(access);
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw new ApiAuthError('Сессия истекла, войдите снова');
    response = await send(refreshed);
  }
  return response;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessage(body) || `Ошибка сервера (${response.status})`, response.status);
  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await apiFetch(path));
}

/** POST/PATCH with a JSON body, or multipart when given FormData (file uploads). */
export async function apiSend<T>(method: 'POST' | 'PATCH', path: string, body?: Record<string, unknown> | FormData): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await apiFetch(path, {
    method,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body ?? {}),
  });
  return parse<T>(response);
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await apiFetch(path);
  if (!response.ok) throw new ApiError(errorMessage(await response.json().catch(() => null)) || 'Не удалось получить файл.', response.status);
  return response.blob();
}
