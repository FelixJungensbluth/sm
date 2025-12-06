import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, MessageSquare, FileText, Eye, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenders, useDeleteTender } from '@/hooks/use-tenders';
import { useCommandMenu } from '@/contexts/command-menu-context';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group?: string;
}

export function CommandMenu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { isOpen, closeCommandMenu, openCommandMenu } = useCommandMenu();
  const { data: tenders = [] } = useTenders();
  const deleteTender = useDeleteTender();

  // Get current tender from URL if on a tender page
  const currentTenderId = useMemo(() => {
    const match = location.pathname.match(/\/tenders\/([^\/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const currentTender = useMemo(() => {
    return currentTenderId ? tenders.find((t) => t.id === currentTenderId) : null;
  }, [currentTenderId, tenders]);

  // Register Cmd+K / Ctrl+K shortcut (standard for command palettes)
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      if (isOpen) {
        closeCommandMenu();
      } else {
        openCommandMenu();
      }
    },
    { enableOnFormTags: true }
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Build commands list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Create tender command
    cmds.push({
      id: 'create-tender',
      label: 'Create Tender',
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        // Navigate to tenders page - user can create there
        if (projectId) {
          navigate(`/projects/${projectId}/tasks`);
        } else {
          navigate('/');
        }
        closeCommandMenu();
      },
      keywords: ['create', 'add', 'new', 'tender'],
      group: 'Actions',
    });

    // Tender selection commands (show up to 20 tenders, filtering will happen in filteredCommands)
    if (tenders.length > 0) {
      tenders.slice(0, 20).forEach((tender) => {
        cmds.push({
          id: `select-tender-${tender.id}`,
          label: tender.title,
          icon: <FolderOpen className="h-4 w-4" />,
          action: () => {
            if (projectId) {
              navigate(`/projects/${projectId}/tenders/${tender.id}`);
            } else {
              navigate(`/tenders/${tender.id}`);
            }
            closeCommandMenu();
          },
          keywords: [tender.title.toLowerCase(), tender.description?.toLowerCase() || '', tender.id],
          group: 'Tenders',
        });
      });
    }

    // Tender-specific commands (only show when on a tender page)
    if (currentTender) {
      // Chat with context command
      cmds.push({
        id: 'chat-with-context',
        label: `Chat with Context: ${currentTender.title}`,
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => {
          navigate(`/chat?tenderId=${currentTender.id}`);
          closeCommandMenu();
        },
        keywords: ['chat', 'message', 'conversation', 'context', currentTender.title.toLowerCase()],
        group: 'Tender Actions',
      });

      // Requirements view command
      cmds.push({
        id: 'requirements-view',
        label: `View Requirements: ${currentTender.title}`,
        icon: <FileText className="h-4 w-4" />,
        action: () => {
          if (projectId) {
            navigate(`/projects/${projectId}/tenders/${currentTender.id}/requirements`);
          } else {
            navigate(`/tenders/${currentTender.id}/requirements`);
          }
          closeCommandMenu();
        },
        keywords: ['requirements', 'requirements view', 'view requirements', 'extract', currentTender.title.toLowerCase()],
        group: 'Tender Actions',
      });

      // Detail view command
      cmds.push({
        id: 'detail-view',
        label: `View Details: ${currentTender.title}`,
        icon: <Eye className="h-4 w-4" />,
        action: () => {
          if (projectId) {
            navigate(`/projects/${projectId}/tenders/${currentTender.id}`);
          } else {
            navigate(`/tenders/${currentTender.id}`);
          }
          closeCommandMenu();
        },
        keywords: ['details', 'detail view', 'view details', 'tender details', currentTender.title.toLowerCase()],
        group: 'Tender Actions',
      });

      // Delete tender command
      cmds.push({
        id: 'delete-tender',
        label: `Delete Tender: ${currentTender.title}`,
        icon: <Trash2 className="h-4 w-4" />,
        action: () => {
          deleteTender.mutate(currentTender.id, {
            onSuccess: () => {
              navigate(projectId ? `/projects/${projectId}/tasks` : '/');
              closeCommandMenu();
            },
          });
        },
        keywords: ['delete', 'remove', 'tender'],
        group: 'Tender Actions',
      });
    }

    return cmds;
  }, [tenders, currentTender, navigate, projectId, closeCommandMenu, deleteTender]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase().trim();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(query)
      );
      return labelMatch || keywordMatch;
    });
  }, [commands, searchQuery]);

  // Group commands by group
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      const group = cmd.group || 'Other';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flatten grouped commands for display
  const displayCommands = useMemo(() => {
    const flat: Array<{ command: Command; index: number; isGroupHeader?: boolean; groupName?: string }> = [];
    let globalIndex = 0;
    
    Object.entries(groupedCommands).forEach(([groupName, groupCommands]) => {
      if (Object.keys(groupedCommands).length > 1) {
        flat.push({
          command: {
            id: `group-${groupName}`,
            label: groupName,
            icon: null,
            action: () => {},
          },
          index: globalIndex++,
          isGroupHeader: true,
          groupName,
        });
      }
      groupCommands.forEach((cmd) => {
        flat.push({ command: cmd, index: globalIndex++ });
      });
    });
    
    return flat;
  }, [groupedCommands]);

  // Get only actionable commands (not group headers) for navigation
  const actionableCommands = useMemo(() => {
    return displayCommands.filter((item) => !item.isGroupHeader);
  }, [displayCommands]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < actionableCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (actionableCommands[selectedIndex]) {
          actionableCommands[selectedIndex].command.action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandMenu();
      }
    },
    [actionableCommands, selectedIndex, closeCommandMenu]
  );

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [actionableCommands.length]);

  return (
    <Dialog open={isOpen} onOpenChange={closeCommandMenu}>
      <div className="flex flex-col w-full max-w-lg" onKeyDown={handleKeyDown}>
        <div className="flex items-center border-b px-3 mb-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search tenders..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {displayCommands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            <div className="space-y-1">
              {displayCommands.map(({ command, isGroupHeader }) => {
                if (isGroupHeader) {
                  return (
                    <div
                      key={command.id}
                      className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {command.label}
                    </div>
                  );
                }
                const actionableIndex = actionableCommands.findIndex((ac) => ac.command.id === command.id);
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={command.action}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground outline-none',
                      actionableIndex === selectedIndex && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span className="text-muted-foreground">{command.icon}</span>
                    <span>{command.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

