import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';

export const useJobs = (enabled: boolean = true) => {
  const api = useApi();

  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.jobs.getJobsNotDone().then((res) => res.data ?? []),
    enabled,
    refetchInterval: 10000,
    staleTime: 0,
  });
};

export function useCancelJob() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => api.jobs.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useRestartJob() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, stepIndex = 0 }: { jobId: string; stepIndex?: number }) =>
      api.jobs.restartJob(jobId, { step_index: stepIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

