import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import type { TenderUpdate, BodyCreateTender, Tender } from '@/services/api/api';

export const useTenders = () => {
  const api = useApi();

  return useQuery({
    queryKey: ['tenders'],
    queryFn: () => api.tenders.getTenders().then((res) => res.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
};

export function useTenderById(id?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['tender', id],
    queryFn: () => api.tenders.getTenderById(id!).then((res) => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Helper function to filter out null/undefined values from update data
const getValidUpdates = (data: TenderUpdate): Partial<Tender> => {
  const updates: Partial<Tender> = {};
  if (data.status != null) updates.status = data.status;
  if (data.title != null) updates.title = data.title;
  if (data.description != null) updates.description = data.description;
  if (data.base_information != null) updates.base_information = data.base_information;
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
      // Only invalidate the single tender query to get the full updated data
      queryClient.invalidateQueries({ queryKey: ['tender', variables.id] });
    },
  });
}

export function useCreateTender() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BodyCreateTender) => api.tenders.createTender(data),
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
