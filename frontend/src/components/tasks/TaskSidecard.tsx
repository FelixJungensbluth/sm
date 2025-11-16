import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import type { TaskWithAttemptStatus } from "@/lib/types";

interface TaskSidecardProps {
  task: TaskWithAttemptStatus;
  onClose: () => void;
}

export function TaskSidecard({ task, onClose }: TaskSidecardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();

  const handleOpenDetailPage = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tasks/${task.id}`);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold truncate flex-1">
          {task.title}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenDetailPage}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Open task detail page"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Close sidecard"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
          {/* Description */}
          {task.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
              {task.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

