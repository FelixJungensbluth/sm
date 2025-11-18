import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  BookOpen,
  MessageCircleQuestion,
  Menu,
  Plus,
  Table,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { SearchBar } from '@/components/search-bar';
import { useSearch } from '@/contexts/search-context';
import { useProject } from '@/contexts/project-context';

const EXTERNAL_LINKS = [
  {
    label: 'Docs',
    icon: BookOpen,
    href: 'https://vibekanban.com/docs',
  },
  {
    label: 'Support',
    icon: MessageCircleQuestion,
    href: 'https://github.com/BloopAI/vibe-kanban/issues',
  },
];

export function Navbar() {
  const { projectId, project } = useProject();
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
    // Dispatch custom event to trigger create task dialog
    window.dispatchEvent(new CustomEvent('open-create-task-dialog'));
  }, []);

  const currentView = searchParams.get('viewType') || 'kanban';
  const handleToggleView = useCallback(() => {
    const newView = currentView === 'kanban' ? 'table' : 'kanban';
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('viewType', newView);
    setSearchParams(newSearchParams, { replace: true });
  }, [currentView, searchParams, setSearchParams]);

  return (
    <div className="border-b bg-background">
      <div className="w-full px-3">
        <div className="flex items-center h-12 py-2">
          <div className="flex-1 flex items-center">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <SearchBar
            ref={setSearchBarRef}
            className="hidden sm:flex"
            value={query}
            onChange={setQuery}
            disabled={!active}
            onClear={clear}
            project={project || null}
          />

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
              <Link
                to={
                  projectId
                    ? `/settings/projects?projectId=${projectId}`
                    : '/settings'
                }
              >
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Main navigation"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {EXTERNAL_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </a>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
