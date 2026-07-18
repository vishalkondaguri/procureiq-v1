import { apiClient as axios } from '@/core/api/client';

// ── Public (no auth) ─────────────────────────────────────────────────────────

export const registerAccessRequest = (payload: {
  email: string;
  full_name: string;
  company: string;
}) => axios.post('/auth/register', payload).then(r => r.data as { message: string; status: string });

// ── Settings ──────────────────────────────────────────────────────────────────

export const fetchAllSettings = () =>
  axios.get('/settings/').then(r => r.data as Record<string, Record<string, string>>);

export const fetchSettingsCategory = (category: string) =>
  axios.get(`/settings/${category}`).then(r => r.data as Record<string, string>);

export const updateSettings = (category: string, updates: Record<string, string>) =>
  axios.put(`/settings/${category}`, { updates }).then(r => r.data as Record<string, string>);

// ── Users / RBAC ──────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  status: string;       // 'active' | 'pending' | 'rejected'
  created_at: string | null;
}

export const fetchUsers = () =>
  axios.get('/settings/users/list').then(r => r.data as ApiUser[]);

export const fetchPendingUsers = () =>
  axios.get('/settings/users/pending').then(r => r.data as ApiUser[]);

export const approveUser = (userId: string) =>
  axios.post(`/settings/users/${userId}/approve`).then(r => r.data);

export const rejectUser = (userId: string, reason?: string) =>
  axios.post(`/settings/users/${userId}/reject`, { reason }).then(r => r.data);

export const createUser = (payload: {
  email: string;
  full_name: string;
  role: string;
  password: string;
}) => axios.post('/settings/users/create', payload).then(r => r.data);

export const updateUserRole = (userId: string, role: string) =>
  axios.patch(`/settings/users/${userId}/role`, { role }).then(r => r.data);

export const toggleUserActive = (userId: string, is_active: boolean) =>
  axios.patch(`/settings/users/${userId}/active`, { is_active }).then(r => r.data);

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_email: string | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  ip_address: string | null;
  created_at: string | null;
}

export const fetchAuditLogs = (params?: {
  page?: number;
  page_size?: number;
  method?: string;
  user_email?: string;
}) => axios.get('/settings/audit/logs', { params }).then(r => r.data as {
  data: AuditLogEntry[];
  meta: { total: number; page: number; page_size: number; total_pages: number };
});

export const fetchAuditSummary = () =>
  axios.get('/settings/audit/summary').then(r => r.data as {
    total_events: number;
    error_events: number;
    unique_users: number;
    error_rate_percent: number;
  });

// ── System ────────────────────────────────────────────────────────────────────

export const fetchSystemHealth = () =>
  axios.get('/system/health').then(r => r.data);

export const fetchSystemVersion = () =>
  axios.get('/system/version').then(r => r.data);
