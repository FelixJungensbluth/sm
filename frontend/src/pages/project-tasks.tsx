import { useCallback, useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import TaskKanbanBoard from "@/components/tasks/TaskKanbanBoard";
import TaskTableView from "@/components/tasks/TaskTableView";
import { TaskSidecard } from "@/components/tasks/TaskSidecard";
import type { TaskWithAttemptStatus } from "@/lib/types";
import type { DragEndEvent } from "@/components/ui/shadcn-io/kanban";
import { useProjectTasksLocal, updateLocalTasks } from "@/hooks/useProjectTasksLocal";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { CommandMenu } from "@/components/command-menu";
import { cn } from "@/lib/utils";
import { useSearch } from "@/contexts/search-context";

type Task = TaskWithAttemptStatus;

const TASK_STATUSES = [
  "todo",
  "inprogress",
  "inreview",
  "done",
  "cancelled",
] as const;

export function ProjectTasks() {
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const [searchParams] = useSearchParams();
  const viewType = searchParams.get('viewType') || 'kanban';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  // Normalize empty string to null/undefined for "no project" case
  const normalizedProjectId = projectId && projectId.trim() ? projectId : null;

  const {
    tasks,
    tasksById,
  } = useProjectTasksLocal(normalizedProjectId);
  const { query: searchQuery } = useSearch();

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter((task: Task) => {
      const titleMatch = task.title.toLowerCase().includes(query);
      const descriptionMatch = task.description?.toLowerCase().includes(query) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [tasks, searchQuery]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    TASK_STATUSES.forEach((status) => {
      groups[status] = [];
    });
    filteredTasks.forEach((task: Task) => {
      const normalizedStatus = task.status.toLowerCase();
      if (groups[normalizedStatus]) {
        groups[normalizedStatus].push(task);
      } else {
        groups["todo"].push(task);
      }
    });
    return groups;
  }, [filteredTasks]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aOrder = (a as any).order ?? new Date(a.created_at).getTime();
      const bOrder = (b as any).order ?? new Date(b.created_at).getTime();
      return bOrder - aOrder; // Most recent first
    });
  }, [filteredTasks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current) return;

      const draggedTaskId = active.id as string;
      const newStatus = over.id as Task["status"];
      const task = tasksById[draggedTaskId];
      if (!task) return;

      const oldStatus = active.data.current.parent as Task["status"];

      updateLocalTasks(normalizedProjectId, (tasks: Record<string, Task>) => {
        const updated = { ...tasks };
        const draggedTask = updated[draggedTaskId];
        if (!draggedTask) return updated;

        // If moving to a different column, just update status
        if (oldStatus !== newStatus) {
          updated[draggedTaskId] = {
            ...draggedTask,
            status: newStatus,
            // Set order to current timestamp to put it at the end of the new column
            order: Date.now(),
          };
          return updated;
        }

        // Same column - reorder tasks
        const tasksInColumn = Object.values(updated)
          .filter((t) => t.status === newStatus)
          .sort((a, b) => {
            const aOrder = (a as any).order ?? new Date(a.created_at).getTime();
            const bOrder = (b as any).order ?? new Date(b.created_at).getTime();
            return aOrder - bOrder;
          });

        // Find current index of dragged task
        const currentIndex = tasksInColumn.findIndex((t) => t.id === draggedTaskId);
        if (currentIndex === -1) return updated;

        // Check if we're dropping on another task (over.id might be a task ID)
        const targetTaskId = over.id as string;
        const isDroppingOnTask = updated[targetTaskId] && targetTaskId !== draggedTaskId;
        
        let newIndex = currentIndex;
        
        if (isDroppingOnTask) {
          // Dropping on another task - swap positions with that task
          const targetIndex = tasksInColumn.findIndex((t) => t.id === targetTaskId);
          if (targetIndex !== -1) {
            newIndex = targetIndex;
          }
        } else {
          // Dropping on the column itself - use a simple heuristic
          // Try to detect direction from the drag event's delta if available
          const delta = (event as any).delta;
          if (delta && Math.abs(delta.y) > 20) {
            // Moved significantly - estimate new position based on delta
            if (delta.y > 0) {
              // Moved down
              newIndex = Math.min(currentIndex + 1, tasksInColumn.length - 1);
            } else {
              // Moved up
              newIndex = Math.max(currentIndex - 1, 0);
            }
          } else {
            // Default: move to end of column
            newIndex = tasksInColumn.length - 1;
          }
        }

        // If already at the target position, no change needed
        if (newIndex === currentIndex) return updated;

        // Reorder: remove from old position and insert at new position
        const reorderedTasks = [...tasksInColumn];
        const [movedTask] = reorderedTasks.splice(currentIndex, 1);
        reorderedTasks.splice(newIndex, 0, movedTask);

        // Update order values for all tasks in the column to maintain the new order
        reorderedTasks.forEach((t, idx) => {
          updated[t.id] = {
            ...t,
            order: idx * 1000, // Use increments of 1000 to allow inserting between items
          } as any;
        });

        return updated;
      });
    },
    [tasksById, normalizedProjectId],
  );

  const handleViewTaskDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCreateNewTask = useCallback(() => {
    console.log('handleCreateNewTask called');
    setIsCreateDialogOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      updateLocalTasks(normalizedProjectId, (tasks: Record<string, Task>) => {
        const updated = { ...tasks };
        delete updated[taskId];
        return updated;
      });
      // Clear selection if the deleted task was selected
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    },
    [normalizedProjectId, selectedTask]
  );

  const handleCreateTask = useCallback(
    (data: { title: string; description: string }) => {
      setIsCreating(true);
      
      // Create task locally - project_id can be null if no project
      const now = Date.now();
      const newTask: TaskWithAttemptStatus = {
        id: `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
        project_id: (normalizedProjectId || null) as any, // Allow null for tasks without projects
        title: data.title,
        description: data.description || null,
        status: 'todo',
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
        parent_task_attempt: null,
        has_in_progress_attempt: false,
        has_merged_attempt: false,
        last_attempt_failed: false,
        executor: '', // Default empty executor for local tasks
        order: now, // Use timestamp as initial order for sorting
      } as any;

      updateLocalTasks(normalizedProjectId, (tasks: Record<string, Task>) => {
        return {
          ...tasks,
          [newTask.id]: newTask,
        };
      });

      setIsCreating(false);
    },
    [normalizedProjectId]
  );

  // Listen for custom event from navbar to open create task dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setIsCreateDialogOpen(true);
    };

    window.addEventListener('open-create-task-dialog', handleOpenDialog);
    return () => {
      window.removeEventListener('open-create-task-dialog', handleOpenDialog);
    };
  }, []);

  const renderMainView = () => {
    if (viewType === 'table') {
      return (
        <div className="flex-1 min-h-0 w-full h-full">
          <TaskTableView
            tasks={sortedTasks}
            onViewTaskDetails={handleViewTaskDetails}
            onCreateTask={handleCreateNewTask}
            projectId={normalizedProjectId || ""}
            selectedTask={selectedTask}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 w-full h-full overflow-x-auto overflow-y-auto overscroll-x-contain touch-pan-y">
        <TaskKanbanBoard
          groupedTasks={groupedTasks}
          onDragEnd={handleDragEnd}
          onViewTaskDetails={handleViewTaskDetails}
          onCreateTask={handleCreateNewTask}
          projectId={normalizedProjectId || ""}
          selectedTask={selectedTask}
        />
      </div>
    );
  };

  return (
    <div className="min-h-full h-full flex flex-col">
      {selectedTask ? (
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Main View (Kanban or Table) */}
          <Panel
            id="main-view"
            defaultSize={50}
            minSize={20}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            {renderMainView()}
          </Panel>

          <PanelResizeHandle
            id="handle-main-sidecard"
            className={cn(
              'relative z-30 bg-border cursor-col-resize group touch-none',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              'focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              'transition-all w-1'
            )}
            aria-label="Resize panels"
            role="separator"
            aria-orientation="vertical"
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 bg-muted/90 border border-border rounded-full px-1.5 py-3 opacity-70 group-hover:opacity-100 group-focus:opacity-100 transition-opacity shadow-sm">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            </div>
          </PanelResizeHandle>

          {/* Task Sidecard */}
          <Panel
            id="sidecard"
            defaultSize={50}
            minSize={20}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            <TaskSidecard
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </Panel>
        </PanelGroup>
      ) : (
        renderMainView()
      )}

      <CreateTaskDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          projectId={normalizedProjectId}
          onCreateTask={handleCreateTask}
          isLoading={isCreating}
        />

      <CommandMenu
        open={isCommandMenuOpen}
        onOpenChange={setIsCommandMenuOpen}
        onCreateTask={handleCreateNewTask}
        onDeleteTask={handleDeleteTask}
        selectedTask={selectedTask}
        tasks={filteredTasks}
      />
    </div>
  );
}
