import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Plus,
  Table,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react';

import { JobStatusView } from '@/components/jobs/JobStatusView';


export function Navbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isTasksPage = location.pathname.includes('/tasks') || location.pathname === '/';

  const handleCreateTask = () => {
    const isTendersPage = location.pathname.includes('/tasks') || 
                          location.pathname.includes('/tenders') || 
                          location.pathname === '/';
    const eventName = isTendersPage 
      ? 'open-create-tender-dialog' 
      : 'open-create-task-dialog';
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const currentView = searchParams.get('viewType') || 'kanban';
  const handleToggleView = () => {
    const newView = currentView === 'kanban' ? 'table' : 'kanban';
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('viewType', newView);
    setSearchParams(newSearchParams, { replace: true });
  };

  return (
    <div className="border-b bg-background">
      <div className="w-full px-2">
        <div className="flex items-center h-10 py-1">
          <div className="flex-1 flex items-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <LayoutGrid className="h-5 w-5 border rounded p-1" />
            </Link>
          </div>
          
          <div className="flex-1 flex justify-end">
            {isTasksPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleView}
                aria-label={currentView === 'kanban' ? 'Switch to table view' : 'Switch to kanban view'}
              >
                {currentView === 'kanban' ? (
                  <Table className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>
            )}
            <JobStatusView />
            <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateTask}
                aria-label="Create new task"
              >
                <Plus className="h-4 w-4" />
              </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Chat">
              <Link to="/chat">
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Settings">
              <Link to="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
