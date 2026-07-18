import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useRiskScores(params: {
  page: number; page_size: number; risk_level?: string; category?: string;
}) {
  return useQuery({
    queryKey: ['risk-scores', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/risk/scores', { params });
      return data;
    },
  });
}

export function useRiskKPIs() {
  return useQuery({
    queryKey: ['risk-kpis'],
    queryFn: async () => {
      const { data } = await apiClient.get('/risk/kpis');
      return data;
    },
  });
}

export function useRiskHistory(supplierId: string | null) {
  return useQuery({
    queryKey: ['risk-history', supplierId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/risk/scores/${supplierId}/history`);
      return data.history;
    },
    enabled: !!supplierId,
  });
}

export function useRiskMap() {
  return useQuery({
    queryKey: ['risk-map'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ country_risk: any[] }>('/risk/map');
      return data.country_risk;
    },
  });
}
