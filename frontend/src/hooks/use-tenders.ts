import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import type { TenderUpdate, BodyCreateTender, Tender } from '@/services/api/api';

export const useTenders = () => {
  const api = useApi();

  return useQuery({
    queryKey: ['tenders'],
    queryFn: () => api.tenders.getTenders().then((res) => res.data.tenders ?? []),
    staleTime: 5 * 60 * 1000,
  });
};

export function useTenderById(id?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['tender', id],
    queryFn: () => api.tenders.getTenderById(id!).then((res) => res.data.tender),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Helper function to filter out null/undefined values from update data
const getValidUpdates = (data: TenderUpdate & { order?: number }): Partial<Tender> => {
  const updates: Partial<Tender> = {};
  if (data.status != null) updates.status = data.status;
  if (data.title != null) updates.title = data.title;
  if (data.description != null) updates.description = data.description;
  if (data.base_information != null) updates.base_information = data.base_information;
  if (data.order != null && typeof data.order === 'number') {
    (updates as any).order = data.order;
  }
  return updates;
};

export function useUpdateTender() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenderUpdate }) => 
      api.tenders.updateTender(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tenders'] });
      await queryClient.cancelQueries({ queryKey: ['tender', id] });

      const previousTenders = queryClient.getQueryData<Tender[]>(['tenders']);
      const previousTender = queryClient.getQueryData<Tender>(['tender', id]);
      const updates = getValidUpdates(data);

      // Optimistically update the tenders list
      queryClient.setQueryData<Tender[]>(['tenders'], (old) =>
        old?.map((tender) => (tender.id === id ? { ...tender, ...updates } : tender))
      );

      // Optimistically update the single tender
      queryClient.setQueryData<Tender>(['tender', id], (old) =>
        old ? { ...old, ...updates } : old
      );

      return { previousTenders, previousTender };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousTenders) {
        queryClient.setQueryData(['tenders'], context.previousTenders);
      }
      if (context?.previousTender) {
        queryClient.setQueryData(['tender', variables.id], context.previousTender);
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate both the single tender and the tenders list to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['tender', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

export function useCreateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BodyCreateTender) => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const formData = new FormData();
      
      formData.append('name', data.name);
      
      // Only append valid File objects
      if (data.files && Array.isArray(data.files)) {
        data.files
          .filter((file): file is File => file instanceof File)
          .forEach((file) => {
            formData.append('files', file);
          });
      }

      const response = await fetch(`${baseUrl}/tenders/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create tender' }));
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}

export function useDeleteTender() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenderId: string) => api.tenders.deleteTender(tenderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
  });
}
