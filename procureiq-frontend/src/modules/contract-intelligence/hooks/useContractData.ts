import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useContracts(params: {
  page: number; page_size: number;
  status?: string; supplier_id?: string;
  search?: string; expiring_within_days?: number;
}) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/contracts', { params });
      return data;
    },
  });
}

export function useContractKPIs() {
  return useQuery({
    queryKey: ['contract-kpis'],
    queryFn: async () => {
      const { data } = await apiClient.get('/contracts/kpis');
      return data;
    },
  });
}

export function useContractExpiryTimeline() {
  return useQuery({
    queryKey: ['contract-expiry-timeline'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ timeline: any[] }>('/contracts/expiry-timeline');
      return Array.isArray(data?.timeline) ? data.timeline : [];
    },
  });
}
