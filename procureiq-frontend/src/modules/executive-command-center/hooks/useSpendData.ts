import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

// The API returns snake_case; define the raw shape here
interface SpendKPIsRaw {
  total_spend: number;
  total_spend_delta: number;
  active_suppliers: number;
  active_contracts_count: number;
  tail_spend_percent: number;
  contracted_spend_percent: number;
  savings_identified: number;
  procurement_health_score: number;
}

interface CategorySpend {
  category: string;
  total_spend: number;
  percent: number;
}

const QUERY_CONFIG = {
  staleTime: 30_000,         // 30s — treat as fresh
  refetchInterval: 60_000,   // auto-refresh every 60s
  refetchOnWindowFocus: true,
};

export function useSpendKPIs(periodStart?: string, periodEnd?: string) {
  return useQuery<SpendKPIsRaw>({
    queryKey: ['spend-kpis', periodStart, periodEnd],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (periodStart) params.period_start = periodStart;
      if (periodEnd)   params.period_end   = periodEnd;
      const { data } = await apiClient.get<SpendKPIsRaw>('/spend/summary', { params });
      return data;
    },
    ...QUERY_CONFIG,
  });
}

export function useMonthlyTrend() {
  return useQuery<{ month: string; total_spend: number }[]>({
    queryKey: ['spend-monthly-trend'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ trend: { month: string; total_spend: number }[] }>('/spend/monthly-trend');
      // Filter out any rows with invalid month strings (e.g. "None")
      return (data.trend ?? []).filter(r => /^\d{4}-\d{2}$/.test(r.month));
    },
    ...QUERY_CONFIG,
  });
}

export function useTopSuppliers(limit = 10) {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['top-suppliers', limit],
    queryFn: async () => {
      const { data } = await apiClient.get<{ suppliers: Record<string, unknown>[] }>(
        '/spend/top-suppliers', { params: { limit } }
      );
      return data.suppliers;
    },
    ...QUERY_CONFIG,
  });
}

export function useCategorySpend() {
  return useQuery<CategorySpend[]>({
    queryKey: ['spend-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ categories: CategorySpend[] }>('/spend/categories');
      return data.categories;
    },
    ...QUERY_CONFIG,
  });
}

export function useSpendTransactions(params: {
  page: number; page_size: number; supplier_id?: string; cost_center?: string;
}) {
  return useQuery({
    queryKey: ['spend-transactions', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/spend/transactions', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export interface DataStatus {
  has_real_data: boolean;
  is_demo_only: boolean;
  total_records: number;
  real_uploaded_records: number;
  demo_records: number;
  last_ingestion: string | null;
  ingestion_run_count: number;
  message: string;
}

export function useDataStatus() {
  return useQuery<DataStatus>({
    queryKey: ['spend-data-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<DataStatus>('/spend/data-status');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useTailSpend(threshold = 80) {
  return useQuery({
    queryKey: ['tail-spend', threshold],
    queryFn: async () => {
      const { data } = await apiClient.get('/spend/tail-spend', { params: { threshold_percent: threshold } });
      return data;
    },
    ...QUERY_CONFIG,
  });
}

export function usePareto() {
  return useQuery({
    queryKey: ['pareto'],
    queryFn: async () => {
      const { data } = await apiClient.get('/spend/pareto');
      return data;
    },
    ...QUERY_CONFIG,
  });
}
