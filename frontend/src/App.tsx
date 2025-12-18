import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Tenders } from "@/pages/tenders";
import { Settings } from "@/pages/settings";
import { TenderDetail } from "@/pages/tender-details";
import { TenderView } from "@/pages/tender-view";
import { RequirementsExtraction } from "@/pages/requirements-extraction";
import { Chat } from "@/pages/chat";
import { AgentTraces } from "@/pages/agent-traces";
import { NormalLayout } from "@/components/layout/NormalLayout";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeMode } from "./lib/types";
import { HotkeysProvider } from "react-hotkeys-hook";
import { ApiProvider } from "./contexts/api-context";

function AppContent() {
  return (
    <ThemeProvider initialTheme={ThemeMode.LIGHT}>
      <div className="h-screen flex flex-col bg-background">
        <Routes>
          <Route element={<NormalLayout />}>
            <Route
              path="/projects/:projectId/tasks"
              element={<Tenders />}
            />
            <Route
              path="/projects/:projectId/tasks/:taskId"
              element={<TenderDetail />}
            />
            <Route path="/" element={<Tenders />} />
            <Route path="/tasks/:taskId" element={<TenderDetail />} />
            <Route path="/tenders/:tenderId" element={<TenderDetail />} />
            <Route path="/tenders/:tenderId/view" element={<TenderView />} />
            <Route path="/tenders/:tenderId/requirements" element={<RequirementsExtraction />} />
            <Route path="/tenders/:tenderId/traces" element={<AgentTraces />} />
            <Route path="/projects/:projectId/tenders/:tenderId" element={<TenderDetail />} />
            <Route path="/projects/:projectId/tenders/:tenderId/view" element={<TenderView />} />
            <Route path="/projects/:projectId/tenders/:tenderId/requirements" element={<RequirementsExtraction />} />
            <Route path="/projects/:projectId/tenders/:tenderId/traces" element={<AgentTraces />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/projects" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </ThemeProvider>
  );
}

function App() {
  return (
      <BrowserRouter>
        <HotkeysProvider initiallyActiveScopes={["*", "global", "kanban"]}>
          <ApiProvider>
            <AppContent />
          </ApiProvider>
        </HotkeysProvider>
      </BrowserRouter>
  );
}

export default App;
