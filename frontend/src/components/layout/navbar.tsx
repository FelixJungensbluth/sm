import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Plus,
  Table,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react';

import { SearchBar } from '@/components/search-bar';
import { useSearch } from '@/contexts/search-context';
import { JobStatusView } from '@/components/jobs/JobStatusView';


export function Navbar() {
  const { query, setQuery, active, clear, registerInputRef } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isTasksPage = location.pathname.includes('/tasks') || location.pathname === '/';

  const setSearchBarRef = useCallback(
    (node: HTMLInputElement | null) => {
      registerInputRef(node);
    },
    [registerInputRef]
  );

  const handleCreateTask = useCallback(() => {
    const isTendersPage = location.pathname.includes('/tasks') || 
                          location.pathname.includes('/tenders') || 
                          location.pathname === '/';
    const eventName = isTendersPage 
      ? 'open-create-tender-dialog' 
      : 'open-create-task-dialog';
    window.dispatchEvent(new CustomEvent(eventName));
  }, [location.pathname]);

  const currentView = searchParams.get('viewType') || 'kanban';
  const handleToggleView = useCallback(() => {
    const newView = currentView === 'kanban' ? 'table' : 'kanban';
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('viewType', newView);
    setSearchParams(newSearchParams, { replace: true });
  }, [currentView, searchParams, setSearchParams]);

  return (
    <div className="border-b bg-background">
      <div className="w-full px-2">
        <div className="flex items-center h-10 py-1">
          <div className="flex-1 flex items-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <LayoutGrid className="h-5 w-5 border rounded p-1" />
            </Link>
          </div>
          
          <div className="flex-1 flex justify-center">
            <SearchBar
              ref={setSearchBarRef}
              className="hidden sm:flex"
              value={query}
              onChange={setQuery}
              disabled={!active}
              onClear={clear}
            />
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
