import { useState, useCallback, useEffect } from 'react';
import type { TaskWithAttemptStatus } from '@/lib/types';

type TasksState = {
  tasks: Record<string, TaskWithAttemptStatus>;
};

interface UseProjectTasksResult {
  tasks: TaskWithAttemptStatus[];
  tasksById: Record<string, TaskWithAttemptStatus>;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

const STORAGE_KEY = 'kanban-tasks';
const NO_PROJECT_KEY = 'no-project';

// Get storage key for projectId (use default key if no project)
const getStorageKey = (projectId?: string | null): string => {
  // Treat empty string as "no project"
  if (!projectId || projectId.trim() === '') {
    return `${STORAGE_KEY}-${NO_PROJECT_KEY}`;
  }
  return `${STORAGE_KEY}-${projectId}`;
};

// Load tasks from localStorage
const loadTasksFromStorage = (projectId?: string | null): TasksState => {
  try {
    const key = getStorageKey(projectId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return { tasks: JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load tasks from storage:', e);
  }
  return { tasks: {} };
};

// Save tasks to localStorage
const saveTasksToStorage = (projectId: string | null | undefined, tasks: Record<string, TaskWithAttemptStatus>) => {
  try {
    const key = getStorageKey(projectId);
    localStorage.setItem(key, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to storage:', e);
  }
};

/**
 * Local state version of useProjectTasks - no backend required
 * projectId is optional - if not provided, tasks are stored under a default key
 */
export const useProjectTasksLocal = (projectId?: string | null): UseProjectTasksResult => {
  const [data, setData] = useState<TasksState>(() => {
    return loadTasksFromStorage(projectId);
  });

  // Load from storage when projectId changes
  useEffect(() => {
    const loaded = loadTasksFromStorage(projectId);
    setData(loaded);
  }, [projectId]);

  // Listen for updates
  useEffect(() => {
    const handleUpdate = () => {
      // Use functional update to ensure React detects the change
      setData(() => {
        const loaded = loadTasksFromStorage(projectId);
        return loaded;
      });
    };

    window.addEventListener('tasks-updated', handleUpdate);
    return () => {
      window.removeEventListener('tasks-updated', handleUpdate);
    };
  }, [projectId]);

  // Expose a method to update tasks (will be used by the component)
  const updateTasks = useCallback((updater: (tasks: Record<string, TaskWithAttemptStatus>) => Record<string, TaskWithAttemptStatus>) => {
    setData((prev) => {
      const updated = updater(prev.tasks);
      saveTasksToStorage(projectId, updated);
      return { tasks: updated };
    });
  }, [projectId]);

  // Store update function in a ref so components can access it
  (useProjectTasksLocal as any).updateTasks = updateTasks;

  const tasksById = data?.tasks ?? {};
  const tasks = Object.values(tasksById).sort((a, b) => {
    // First sort by status, then by order field (if exists), then by created_at
    if (a.status !== b.status) {
      // Keep status order as defined in TASK_STATUSES
      return 0; // Status grouping is handled elsewhere
    }
    // Within same status, use order field if available
    const aOrder = (a as any).order ?? new Date(a.created_at as unknown as string).getTime();
    const bOrder = (b as any).order ?? new Date(b.created_at as unknown as string).getTime();
    return aOrder - bOrder;
  });
  const isLoading = false; // No loading needed for local state
  const isConnected = true; // Always "connected" for local state
  const error = null;

  return { tasks, tasksById, isLoading, isConnected, error };
};

// Export update function
export const updateLocalTasks = (projectId: string | null | undefined, updater: (tasks: Record<string, TaskWithAttemptStatus>) => Record<string, TaskWithAttemptStatus>) => {
  const current = loadTasksFromStorage(projectId);
  const updated = updater(current.tasks);
  saveTasksToStorage(projectId, updated);
  // Dispatch event to notify listeners
  window.dispatchEvent(new CustomEvent('tasks-updated'));
};

