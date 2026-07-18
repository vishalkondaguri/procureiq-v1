import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useHealthScore() {
  return useQuery({
    queryKey: ['health-score'],
    queryFn: async () => {
      const { data } = await apiClient.get('/health');
      return data;
    },
  });
}
