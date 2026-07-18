// Shared hook file for What-if analysis data fetching
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useWhatIfPresets() {
  return useQuery({
    queryKey: ['whatif-presets'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ presets: any[] }>('/whatif/presets');
      return data.presets;
    },
  });
}

export async function simulateScenario(scenario: Record<string, unknown>) {
  const { data } = await apiClient.post('/whatif/simulate', scenario);
  return data;
}
