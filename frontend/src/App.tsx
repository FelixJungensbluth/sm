import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProjectTasks } from "@/pages/project-tasks";
import { Settings } from "@/pages/settings";
import { TaskDetail } from "@/pages/task-detail";
import { NormalLayout } from "@/components/layout/NormalLayout";
import {
  UserSystemProvider,
  useUserSystem,
} from "@/components/config-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SearchProvider } from "@/contexts/search-context";
import { ProjectProvider } from "@/contexts/project-context";
import { Loader } from "@/components/ui/loader";
import { ThemeMode } from "./lib/types";
import { HotkeysProvider } from "react-hotkeys-hook";

function AppContent() {
  const { config, loading } = useUserSystem();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader message="Loading..." size={32} />
      </div>
    );
  }

  return (
    <ThemeProvider initialTheme={config?.theme || ThemeMode.SYSTEM}>
      <SearchProvider>
        <div className="h-screen flex flex-col bg-background">
          <Routes>
            <Route element={<NormalLayout />}>
              <Route
                path="/projects/:projectId/tasks"
                element={<ProjectTasks />}
              />
              <Route
                path="/projects/:projectId/tasks/:taskId"
                element={<TaskDetail />}
              />
              <Route path="/" element={<ProjectTasks />} />
              <Route path="/tasks/:taskId" element={<TaskDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/projects" element={<Settings />} />
            </Route>
          </Routes>
        </div>
      </SearchProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <UserSystemProvider>
        <ProjectProvider>
          <HotkeysProvider initiallyActiveScopes={["*", "global", "kanban"]}>
            <AppContent />
          </HotkeysProvider>
        </ProjectProvider>
      </UserSystemProvider>
    </BrowserRouter>
  );
}

export default App;
