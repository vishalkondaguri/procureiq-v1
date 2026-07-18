import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useForecast(periodsAhead = 6) {
  return useQuery({
    queryKey: ['forecast', periodsAhead],
    queryFn: async () => {
      const { data } = await apiClient.get('/forecast', { params: { periods_ahead: periodsAhead } });
      return data;
    },
  });
}

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

export async function generateReport(config: Record<string, unknown>) {
  const { data } = await apiClient.post('/reports/generate', config);
  return data;
}
