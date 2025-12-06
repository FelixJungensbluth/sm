import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  originalValue?: string;
  onCancel?: () => void;
  minHeight?: string;
  showLabel?: boolean;
  isEditing?: boolean;
  onEditChange?: (editing: boolean) => void;
}

export function EditableDescription({
  value,
  onChange,
  placeholder = "Enter description...",
  label = "Description",
  originalValue,
  onCancel,
  minHeight = "120px",
  showLabel = true,
  isEditing: controlledIsEditing,
  onEditChange,
}: EditableDescriptionProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalIsEditing;
  const setIsEditing = onEditChange || setInternalIsEditing;

  const handleDone = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (originalValue !== undefined) {
      onChange(originalValue);
    }
    setIsEditing(false);
    onCancel?.();
  };

  return (
    <div className="space-y-3">
      {showLabel && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </Label>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 px-2 text-xs"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn("resize-none text-sm")}
            style={{ minHeight }}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleDone} className="h-7 text-xs">
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "text-sm text-foreground whitespace-pre-wrap break-words p-3 border border-transparent hover:border-border cursor-text transition-colors"
          )}
          style={{ minHeight: "60px" }}
          onClick={() => setIsEditing(true)}
        >
          {value || (
            <span className="text-muted-foreground italic">
              No description. Click to add one.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
