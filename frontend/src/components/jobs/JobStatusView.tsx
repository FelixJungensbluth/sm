import { useState } from 'react';
import { Loader2, X, RotateCcw, AlertCircle, CheckCircle2, Clock, Play, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useJobs, useCancelJob, useRestartJob } from '@/hooks/use-jobs';
import type { TenderJob } from '@/services/api/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-3 w-3 animate-spin" />;
    case 'queued':
      return <Clock className="h-3 w-3" />;
    case 'error':
      return <AlertCircle className="h-3 w-3" />;
    case 'done':
      return <CheckCircle2 className="h-3 w-3" />;
    case 'cancelled':
      return <X className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'processing':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'queued':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'done':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'cancelled':
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const formatJobId = (jobId: string | null | undefined) => {
  if (!jobId) return 'Unknown';
  return jobId.substring(0, 8);
};

export function JobStatusView() {
  const [open, setOpen] = useState(false);
  // Fetch jobs once on mount for badge count, and when dialog is open
  const { data: jobs, isLoading, refetch } = useJobs(true);
  const cancelJob = useCancelJob();
  const restartJob = useRestartJob();

  const activeJobs = jobs?.filter(
    (job) => job.status === 'queued' || job.status === 'processing'
  ) || [];
  const errorJobs = jobs?.filter((job) => job.status === 'error') || [];
  const allActiveJobs = [...activeJobs, ...errorJobs];

  // Refetch when dialog opens to get fresh data
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      refetch();
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob.mutateAsync(jobId);
      toast.success('Job cancelled');
    } catch (error) {
      toast.error('Failed to cancel job');
      throw error;
    }
  };

  const handleRestart = async (jobId: string, stepIndex: number = 0) => {
    try {
      await restartJob.mutateAsync({ jobId, stepIndex });
      toast.success('Job restarted');
    } catch (error) {
      toast.error('Failed to restart job');
      throw error;
    }
  };

  const getCurrentStep = (job: TenderJob) => {
    if (job.step_status && job.current_step_index < job.step_status.length) {
      return job.step_status[job.current_step_index];
    }
    return null;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Job status"
        onClick={() => setOpen(true)}
      >
        {allActiveJobs.length > 0 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Activity className="h-4 w-4" />
        )}
        {allActiveJobs.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 text-xs text-white">
            {allActiveJobs.length}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange} className="max-w-2xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job Status</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-12rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allActiveJobs.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                No active jobs
              </div>
            ) : (
              <div className="space-y-3">
                {allActiveJobs.map((job) => {
                  const currentStep = getCurrentStep(job);
                  const jobId = job._id || '';
                  return (
                    <div
                      key={jobId}
                      className="border p-4 space-y-3 bg-background"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(job.status)}
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getStatusColor(job.status))}
                          >
                            {job.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            Job ID: {formatJobId(jobId)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Tender: {job.tender_id.substring(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {job.status !== 'cancelled' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRestart(jobId, 0)}
                                disabled={restartJob.isPending || cancelJob.isPending}
                                title="Restart from beginning"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCancel(jobId)}
                                disabled={cancelJob.isPending || restartJob.isPending}
                                title="Cancel job"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {currentStep && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <span>Current Step:</span>
                            <span className="font-medium">{currentStep.name}</span>
                            {currentStep.status === 'error' && currentStep.last_error && (
                              <span className="text-red-500 text-xs">({currentStep.last_error})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Progress:</span>
                            <span>
                              {job.current_step_index + 1} / {job.pipeline.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Attempts:</span>
                            <span>
                              {job.attempts} / {job.max_attempts}
                            </span>
                          </div>
                        </div>
                      )}
                      {job.status === 'error' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleRestart(jobId, job.current_step_index)}
                          disabled={restartJob.isPending || cancelJob.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Retry from current step
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

