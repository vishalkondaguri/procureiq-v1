/**
 * useDatasetStatus — polls /ide/dataset-status to determine if the tenant
 * has uploaded any procurement data.  Used by DatasetGate.
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export interface DatasetStatus {
  has_dataset: boolean;
  sheets_loaded: string[];
  last_upload: string | null;
  last_filename: string | null;
  last_health_score: number | null;
  record_counts: {
    spend_transactions: number;
    suppliers: number;
    contracts: number;
    risk_scores: number;
    savings_opportunities: number;
  };
}

export function useDatasetStatus() {
  return useQuery<DatasetStatus>({
    queryKey: ['ide-dataset-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<DatasetStatus>('/ide/dataset-status');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
