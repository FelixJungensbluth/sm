import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { type FileWithPath } from '@/hooks/use-file-drop';

interface CreateTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  onCreateTender: (data: { title: string; files: File[] }) => void;
  isLoading?: boolean;
}

export function CreateTenderDialog({
  open,
  onOpenChange,
  onCreateTender,
  isLoading = false,
}: CreateTenderDialogProps) {
  const [title, setTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTender({
      title: title.trim(),
      files: selectedFiles,
    });

    // Reset form
    setTitle('');
    setSelectedFiles([]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTitle('');
    setSelectedFiles([]);
    onOpenChange(false);
  };

  const handleFilesSelected = (files: FileWithPath[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Tender</DialogTitle>
            <DialogDescription>
              Add a new tender to your kanban board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter tender title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Attachments</Label>
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Tender'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

