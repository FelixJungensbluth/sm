import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TenderWithAttemptStatus } from '@/lib/types';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTender?: () => void;
  onDeleteTender?: (tenderId: string) => void;
  selectedTender?: TenderWithAttemptStatus | null;
  tenders?: TenderWithAttemptStatus[];
}

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export function CommandMenu({
  open,
  onOpenChange,
  onCreateTender,
  onDeleteTender,
  selectedTender,
  tenders = [],
}: CommandMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Register Cmd+F / Ctrl+F shortcut
  useHotkeys(
    'mod+f',
    (e) => {
      e.preventDefault();
      onOpenChange(true);
    },
    { enableOnFormTags: true }
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Build commands list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];

    // Create tender command
    if (onCreateTender) {
      cmds.push({
        id: 'create-tender',
        label: 'Create Tender',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateTender();
          onOpenChange(false);
        },
        keywords: ['create', 'add', 'new', 'tender'],
      });
    }

    // Delete selected tender command
    if (onDeleteTender && selectedTender) {
      cmds.push({
        id: 'delete-tender',
        label: `Delete Tender: ${selectedTender.title}`,
        icon: <Trash2 className="h-4 w-4" />,
        action: () => {
          onDeleteTender(selectedTender.id);
          onOpenChange(false);
        },
        keywords: ['delete', 'remove', 'tender'],
      });
    }

    return cmds;
  }, [onCreateTender, onDeleteTender, selectedTender, onOpenChange]);

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

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  );

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col w-full max-w-lg" onKeyDown={handleKeyDown}>
        <div className="flex items-center border-b px-3 mb-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={command.action}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground outline-none',
                    index === selectedIndex && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="text-muted-foreground">{command.icon}</span>
                  <span>{command.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

