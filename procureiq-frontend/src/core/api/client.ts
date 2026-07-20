import axios from 'axios';
import { getAuthToken, refreshAuthToken } from '@/core/auth/tokenStore';

// In dev: Vite proxy rewrites /api → http://localhost:8000
// In production (Railway): set VITE_API_BASE_URL=https://your-backend.up.railway.app
// Do NOT include /api/v1 in the env var — it is appended here automatically.
const _base = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE = _base
  ? `${_base.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAuthToken();
      if (newToken) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  },
);
