import { useApi } from '@/hooks/use-api';
import { useQuery } from '@tanstack/react-query';


export function useRequirementsForTender(tenderId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['requirementsForTender', tenderId],
    queryFn: () => api.requirements.getRequirements(tenderId).then((res) => res.data),
    enabled: !!tenderId,
    staleTime: 5 * 60 * 1000,
  });
}