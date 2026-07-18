// Auth token store — localStorage-backed with in-memory cache
let _token: string | null = null;
let _refreshToken: string | null = null;

const ACCESS_KEY  = 'piq_access_token';
const REFRESH_KEY = 'piq_refresh_token';

export function getAuthToken(): string | null {
  if (_token) return _token;
  _token = localStorage.getItem(ACCESS_KEY);
  return _token;
}

export function setAuthTokens(access: string, refresh: string): void {
  _token = access;
  _refreshToken = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearAuthTokens(): void {
  _token = null;
  _refreshToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function refreshAuthToken(): Promise<string | null> {
  const stored = _refreshToken ?? localStorage.getItem(REFRESH_KEY);
  if (!stored) return null;
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored }),
    });
    if (!res.ok) { clearAuthTokens(); return null; }
    const data = await res.json();
    setAuthTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearAuthTokens();
    return null;
  }
}
