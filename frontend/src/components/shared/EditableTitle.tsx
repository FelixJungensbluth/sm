import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableTitleProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  originalValue?: string;
  isEditing?: boolean;
  onEditChange?: (editing: boolean) => void;
}

export function EditableTitle({
  value,
  onChange,
  placeholder = "Untitled",
  className,
  onBlur,
  originalValue,
  isEditing: controlledIsEditing,
  onEditChange,
}: EditableTitleProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalIsEditing;
  const setIsEditing = onEditChange || setInternalIsEditing;

  const handleBlur = () => {
    setIsEditing(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      onBlur?.();
    }
    if (e.key === "Escape") {
      if (originalValue !== undefined) {
        onChange(originalValue);
      }
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("text-xl font-semibold h-9", className)}
        autoFocus
      />
    );
  }

  return (
    <h1
      className={cn(
        "text-xl font-semibold cursor-text hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
    </h1>
  );
}
