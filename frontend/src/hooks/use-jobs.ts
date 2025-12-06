import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useApi } from '@/hooks/use-api';
import type { TenderJob } from '@/services/api/api';

export const useJobs = (enabled: boolean = true) => {
  const api = useApi();
  const queryClient = useQueryClient();
  const previousJobsRef = useRef<Array<{ _id?: string | null; status: string; tender_id: string }>>([]);

  const query = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.jobs.getJobsNotDone().then((res) => res.data.jobs ?? []),
    enabled,
    refetchInterval: 10000,
    staleTime: 0,
  });

  // Monitor job status changes and invalidate tenders when jobs complete
  useEffect(() => {
    if (!query.data) return;

    const currentJobs = query.data;
    const previousJobs = previousJobsRef.current;

    // Check if any jobs transitioned from active (queued/processing) to done
    const completedJobs = currentJobs.filter((currentJob) => {
      const previousJob = previousJobs.find((pj) => pj._id === currentJob._id);
      
      // Job is done and was previously active
      if (currentJob.status === 'done' && previousJob) {
        const wasActive = previousJob.status === 'queued' || previousJob.status === 'processing';
        return wasActive;
      }
      
      return false;
    });

    // If any jobs completed, invalidate tenders to trigger a refetch
    if (completedJobs.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    }

    // Update the ref with current jobs
    previousJobsRef.current = currentJobs.map((job) => ({
      _id: job._id,
      status: job.status,
      tender_id: job.tender_id,
    }));
  }, [query.data, queryClient]);

  return query;
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

