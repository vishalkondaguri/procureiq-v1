import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

export function useSuppliers(params: { page: number; page_size: number; search?: string; category?: string; risk_level?: string }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/suppliers', { params });
      return data;
    },
  });
}

export function useSupplier360(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplier-360', supplierId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/suppliers/${supplierId}/360`);
      return data;
    },
    enabled: !!supplierId,
  });
}

export function useSupplierCategories() {
  return useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ categories: string[] }>('/suppliers/categories');
      return data.categories;
    },
  });
}
