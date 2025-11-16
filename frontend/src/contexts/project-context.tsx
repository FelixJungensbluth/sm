import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { Project } from '@/lib/types';

interface ProjectContextValue {
  projectId: string | undefined;
  project: Project | undefined;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const location = useLocation();

  // Extract projectId from current route path
  const projectId = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    return match ? match[1] : undefined;
  }, [location.pathname]);

  // Create a mock project for local use
  const mockProject: Project | undefined = projectId ? {
    id: projectId,
    name: 'Local Project',
    path: '/local',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : undefined;

  const value = useMemo(
    () => ({
      projectId,
      project: mockProject,
      isLoading: false,
      error: null,
      isError: false,
    }),
    [projectId, mockProject]
  );

  // Centralized page title management
  useEffect(() => {
    if (mockProject) {
      document.title = `${mockProject.name} | vibe-kanban`;
    } else {
      document.title = 'vibe-kanban';
    }
  }, [mockProject]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
