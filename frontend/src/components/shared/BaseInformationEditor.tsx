import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedData } from "@/services/api/api";
import { BaseInformationGrid } from "./BaseInformationGrid";

interface BaseInformationEditorProps {
  baseInformation: ExtractedData[];
  onChange: (baseInformation: ExtractedData[]) => void;
  onRemove?: (index: number) => void;
  editingIndex: number | null;
  onEditIndexChange: (index: number | null) => void;
  variant?: "full" | "compact";
  excludeFields?: string[];
  isEditingMode?: boolean;
  onEditingModeChange?: (editing: boolean) => void;
}

export function BaseInformationEditor({
  baseInformation,
  onChange,
  onRemove,
  editingIndex,
  onEditIndexChange,
  variant = "full",
  excludeFields = ["compact_description"],
  isEditingMode,
  onEditingModeChange,
}: BaseInformationEditorProps) {
  const getAllFields = () => {
    return baseInformation.filter(
      (info) => !excludeFields.includes(info.field_name || "")
    );
  };

  const handleFieldChange = (
    index: number,
    field: keyof ExtractedData,
    value: string | boolean | null
  ) => {
    const updated = [...baseInformation];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = baseInformation.filter((_, i) => i !== index);
    onChange(updated);
    if (editingIndex === index) {
      onEditIndexChange(null);
    }
    onRemove?.(index);
  };

  const fields = getAllFields();

  if (variant === "compact") {
    // Compact variant for sidecard - shows edit mode differently
    const isEditing = isEditingMode !== undefined ? isEditingMode : editingIndex !== null;
    
    if (fields.length === 0 && !isEditing) {
      return (
        <div className="text-xs text-muted-foreground italic p-2 border border-dashed">
          No base information. Click "Edit" to add a field.
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-4">
          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {fields.map((info) => {
                const originalIndex = baseInformation.findIndex(
                  (item) => item === info
                );
                return (
                  <div
                    key={originalIndex}
                    className="p-3 border border-border bg-card space-y-2"
                  >
                    <div className="pb-2 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">
                        {info.field_name || "Unnamed Field"}
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={info.value || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            originalIndex,
                            "value",
                            e.target.value || null
                          )
                        }
                        placeholder="Enter value..."
                        className="h-7 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Note</Label>
                      <Textarea
                        value={info.note || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            originalIndex,
                            "note",
                            e.target.value || null
                          )
                        }
                        placeholder="Add a note..."
                        className="min-h-[50px] resize-none text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={info.fulfillable === true}
                          onChange={(e) =>
                            handleFieldChange(
                              originalIndex,
                              "fulfillable",
                              e.target.checked ? true : null
                            )
                          }
                          className="h-4 w-4"
                        />
                        Fulfillable
                      </label>
                    </div>
                    <div className="flex items-center justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(originalIndex)}
                        className="h-7 text-xs text-destructive hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={() => {
                onEditIndexChange(null);
                onEditingModeChange?.(false);
              }}
              className="h-7 text-xs"
            >
              Done Editing
            </Button>
          </div>
        </div>
      );
    }

    // Display mode for compact variant
    return <BaseInformationGrid baseInformation={baseInformation} excludeFields={excludeFields} />;
  }

  // Full variant (for tender-details page)
  if (fields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-3 border border-dashed text-center">
        No base information. Click "Add Field" to add a field.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 border border-border">
        {fields.map((info, idx) => {
          const originalIndex = baseInformation.findIndex(
            (item) => item === info
          );
          const isRightColumn = idx % 2 === 1;
          const totalItems = fields.length;
          const hasItemBelow = idx + 2 < totalItems;
          const isEditing = editingIndex === originalIndex;

          return (
            <div
              key={originalIndex}
              className={cn(
                "p-2.5 border-r border-b border-border",
                isRightColumn && "border-r-0",
                !hasItemBelow && "border-b-0",
                isEditing
                  ? "bg-muted/30 border-primary"
                  : "bg-card hover:bg-muted/50 transition-colors"
              )}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="pb-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">
                      {info.field_name || "Unnamed Field"}
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={info.value || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          originalIndex,
                          "value",
                          e.target.value || null
                        )
                      }
                      placeholder="Enter value..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Note</Label>
                    <Textarea
                      value={info.note || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          originalIndex,
                          "note",
                          e.target.value || null
                        )
                      }
                      placeholder="Add a note..."
                      className="min-h-[60px] resize-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={info.fulfillable === true}
                        onChange={(e) =>
                          handleFieldChange(
                            originalIndex,
                            "fulfillable",
                            e.target.checked ? true : null
                          )
                        }
                        className="h-3.5 w-3.5"
                      />
                      Fulfillable
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => onEditIndexChange(null)}
                      className="h-7 text-xs"
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(originalIndex)}
                      className="h-7 text-xs text-destructive hover:text-destructive"
                    >
                      <XIcon className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="space-y-1 cursor-pointer"
                  onClick={() => onEditIndexChange(originalIndex)}
                >
                  <div className="text-xs font-semibold text-foreground">
                    {info.field_name || "Unnamed Field"}
                  </div>
                  {info.value && (
                    <div className="text-sm text-foreground break-words font-medium">
                      {info.value}
                    </div>
                  )}
                  {!info.value && (
                    <div className="text-sm text-muted-foreground italic">
                      No value
                    </div>
                  )}
                  {info.note && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
                      {info.note}
                    </div>
                  )}
                  {info.source_file && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      Source: {info.source_file}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {info.fulfillable && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium">
                        ⚡ Fulfillable
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
