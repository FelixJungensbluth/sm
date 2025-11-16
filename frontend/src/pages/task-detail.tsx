import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useProjectTasksLocal } from '@/hooks/useProjectTasksLocal';
import { statusLabels, statusBoardColors } from '@/utils/status-labels';
import type { TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TaskDetail() {
  const { taskId, projectId } = useParams<{
    taskId: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();

  // Normalize empty string to null/undefined for "no project" case
  const normalizedProjectId = projectId && projectId.trim() ? projectId : null;

  const { tasksById } = useProjectTasksLocal(normalizedProjectId);

  const task = useMemo(() => {
    if (!taskId) return null;
    return tasksById[taskId] || null;
  }, [taskId, tasksById]);

  const handleBack = () => {
    if (normalizedProjectId) {
      navigate(`/projects/${normalizedProjectId}/tasks`);
    } else {
      navigate('/');
    }
  };

  if (!task) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="p-6">
          <p className="text-muted-foreground">Task not found</p>
        </Card>
      </div>
    );
  }

  const status = task.status as TaskStatus;
  const statusColor = statusBoardColors[status];
  const statusLabel = statusLabels[status];

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Button variant="ghost" onClick={handleBack} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-2">{task.title}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: `hsl(var(${statusColor}))` }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {task.has_in_progress_attempt && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {task.has_merged_attempt && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {task.last_attempt_failed &&
                    !task.has_merged_attempt && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">Description</h2>
          {task.description ? (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {task.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description provided
            </p>
          )}
        </Card>

        {/* Task Details */}
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Task ID
              </label>
              <p className="text-sm mt-1 font-mono">{task.id}</p>
            </div>
            {task.executor && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Executor
                </label>
                <p className="text-sm mt-1">{task.executor}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created At
              </label>
              <p className="text-sm mt-1">
                {new Date(task.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Updated At
              </label>
              <p className="text-sm mt-1">
                {new Date(task.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

