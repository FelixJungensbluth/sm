import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';

export function useTenderDocuments(id?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['tenderDocuments', id],
    queryFn: () => api.tenders.getTenderDocuments(id!).then(res => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });
}