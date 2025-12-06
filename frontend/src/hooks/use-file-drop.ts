import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface FileWithPath extends File {
  fullPath?: string;
}

interface UseFileDropProps {
  onFilesSelected?: (files: FileWithPath[] | File[]) => void;
}

export function useFileDrop({ onFilesSelected }: UseFileDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const traverse = useCallback(async function traverse(
    entry: FileSystemEntry | null,
    path = ''
  ): Promise<FileWithPath[]> {
    const files: FileWithPath[] = [];
    if (!entry) return files;

    if (entry.isFile) {
      return new Promise<FileWithPath[]>((resolve, reject) => {
        (entry as FileSystemFileEntry).file((file) => {
          const fileWithPath = file as FileWithPath;
          fileWithPath.fullPath = path + file.name;
          resolve([fileWithPath]);
        }, reject);
      });
    }

    if (entry.isDirectory) {
      const dir = entry as FileSystemDirectoryEntry;
      const reader = dir.createReader();
      const entries: FileSystemEntry[] = await new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const e of entries) {
        const childFiles = await traverse(e, path + dir.name + '/');
        files.push(...childFiles);
      }
    }

    return files;
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      setIsProcessing(true);
      try {
        const dt = event.dataTransfer;
        const collected: FileWithPath[] = [];
        if (dt.items && dt.items.length > 0) {
          const entries = Array.from(dt.items)
            .map((item) => item.webkitGetAsEntry?.())
            .filter(Boolean) as FileSystemEntry[];
          for (const entry of entries) {
            const entryFiles = await traverse(entry);
            collected.push(...entryFiles);
          }
        } else {
          collected.push(...Array.from(dt.files));
        }
        if (collected.length) {
          onFilesSelected?.(collected);
        }
      } catch (err) {
        toast.error('Error processing dropped files');
        throw err;
      } finally {
        setIsProcessing(false);
        event.dataTransfer.clearData();
      }
    },
    [onFilesSelected, traverse]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handlers = {
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave
  };

  return { isDragging, isProcessing, handlers };
}
