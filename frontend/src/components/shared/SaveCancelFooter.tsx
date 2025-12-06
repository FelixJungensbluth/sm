import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveCancelFooterProps {
  hasChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export function SaveCancelFooter({
  hasChanges,
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = "Save Changes",
  cancelLabel = "Cancel",
  className,
}: SaveCancelFooterProps) {
  if (!hasChanges) return null;

  return (
    <div
      className={cn(
        "flex-shrink-0 border-t px-3 py-2 flex items-center justify-end gap-2 bg-muted/30",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isSaving}
        className="h-7 text-xs"
      >
        {cancelLabel}
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-7 text-xs"
      >
        {isSaving ? (
          <>
            <Save className="h-3 w-3 mr-1 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-3 w-3 mr-1" />
            {saveLabel}
          </>
        )}
      </Button>
    </div>
  );
}
