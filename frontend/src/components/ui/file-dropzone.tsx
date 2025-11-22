import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFileDrop, type FileWithPath } from '@/hooks/use-file-drop';
import { Upload, File, Folder, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { allowedFileFormats } from '@/constants/file-formats';

interface FileDropzoneProps {
  onFilesSelected?: (files: (FileWithPath | File)[]) => void;
  selectedFiles?: FileWithPath[];
  onRemoveFile?: (index: number) => void;
  showFileList?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  onFilesSelected,
  selectedFiles: controlledFiles,
  onRemoveFile,
  showFileList = true,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [internalFiles, setInternalFiles] = useState<FileWithPath[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  
  // Use controlled files if provided, otherwise use internal state
  const selectedFiles = controlledFiles ?? internalFiles;
  const setSelectedFiles = controlledFiles ? undefined : setInternalFiles;

  const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  };

  const isFileAllowed = (file: FileWithPath): boolean => {
    const extension = getFileExtension(file.name);
    return allowedFileFormats.includes(extension);
  };

  const { isDragging, isProcessing, handlers } = useFileDrop({
    onFilesSelected: (files) => {
      const validFiles: FileWithPath[] = [];
      const rejected: string[] = [];

      files.forEach((file) => {
        if (isFileAllowed(file)) {
          validFiles.push(file);
        } else {
          rejected.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        if (setSelectedFiles) {
          setSelectedFiles((prev) => [...prev, ...validFiles]);
        }
        onFilesSelected?.(validFiles);
      }

      if (rejected.length > 0) {
        setRejectedFiles((prev) => [...prev, ...rejected]);
        // Clear rejected files after 5 seconds
        setTimeout(() => {
          setRejectedFiles((prev) => prev.filter((name) => !rejected.includes(name)));
        }, 5000);
      }
    },
  });

  const handleRemoveFile = (index: number) => {
    if (setSelectedFiles) {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }
    onRemoveFile?.(index);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Card
        {...handlers}
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25',
          (isProcessing || disabled) && 'opacity-50 pointer-events-none',
          disabled && 'cursor-not-allowed'
        )}
      >
        <div className="flex flex-col items-center justify-center p-6 gap-2 min-h-[120px]">
          {isProcessing ? (
            <>
              <Upload className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Processing files...
              </p>
            </>
          ) : (
            <>
              <Upload
                className={cn(
                  'h-8 w-8',
                  isDragging && !disabled
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragging && !disabled
                    ? 'Drop files here'
                    : 'Drag and drop files or folders here'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allowed formats: {allowedFileFormats.join(', ')}
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
      {showFileList && selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}-${file.size}`}
              className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
            >
              {file.fullPath?.includes('/') ? (
                <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span
                className="flex-1 truncate"
                title={file.fullPath || file.name}
              >
                {file.fullPath || file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(file.size)}
              </span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {rejectedFiles.length > 0 && (
        <div className="space-y-1">
          {rejectedFiles.map((fileName, index) => (
            <div
              key={`rejected-${index}-${fileName}`}
              className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate" title={fileName}>
                {fileName}
              </span>
              <span className="text-xs">Invalid format</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

