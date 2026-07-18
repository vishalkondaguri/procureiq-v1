import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllSettings, updateSettings, fetchUsers, createUser,
  updateUserRole, toggleUserActive, fetchAuditLogs, fetchAuditSummary,
  fetchSystemHealth, fetchSystemVersion,
  fetchPendingUsers, approveUser, rejectUser,
} from '../api/settingsApi';

export const useAllSettings = () =>
  useQuery({ queryKey: ['settings', 'all'], queryFn: fetchAllSettings, staleTime: 30_000 });

export const useUpdateSettings = (category: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, string>) => updateSettings(category, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
};

export const useUsers = () =>
  useQuery({ queryKey: ['settings', 'users'], queryFn: fetchUsers });

export const usePendingUsers = () =>
  useQuery({ queryKey: ['settings', 'users', 'pending'], queryFn: fetchPendingUsers });

export const useApproveUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

export const useRejectUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => rejectUser(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'users'] }),
  });
};

export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'users'] }),
  });
};

export const useToggleUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, is_active }: { userId: string; is_active: boolean }) =>
      toggleUserActive(userId, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'users'] }),
  });
};

export const useAuditLogs = (params?: { page?: number; page_size?: number; method?: string; user_email?: string }) =>
  useQuery({
    queryKey: ['settings', 'audit', params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 15_000,
  });

export const useAuditSummary = () =>
  useQuery({ queryKey: ['settings', 'audit', 'summary'], queryFn: fetchAuditSummary, staleTime: 30_000 });

export const useSystemHealth = () =>
  useQuery({ queryKey: ['system', 'health'], queryFn: fetchSystemHealth, staleTime: 60_000, refetchInterval: 60_000 });

export const useSystemVersion = () =>
  useQuery({ queryKey: ['system', 'version'], queryFn: fetchSystemVersion, staleTime: Infinity });
