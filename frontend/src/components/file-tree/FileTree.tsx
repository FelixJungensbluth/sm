import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document } from '@/services/api/api';

interface FileTreeProps {
  documents: Document[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

export function FileTree({ documents, selectedFileId, onSelectFile }: FileTreeProps) {
  if (documents.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground italic text-center">
        No documents available
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
        Files
      </div>
      <div className="space-y-0.5">
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelectFile(doc.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left transition-colors',
              'hover:bg-accent',
              selectedFileId === doc.id
                ? 'bg-accent text-foreground font-medium'
                : 'text-muted-foreground'
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1" title={doc.name}>
              {doc.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

