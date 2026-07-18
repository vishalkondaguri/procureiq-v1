import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useSavingsOpportunities(params: {
  page: number; page_size: number; type?: string; status?: string; min_value?: number;
}) {
  return useQuery({
    queryKey: ['savings-opportunities', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/savings', { params });
      return data;
    },
  });
}
