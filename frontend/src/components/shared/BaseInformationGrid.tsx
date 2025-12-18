import type { ExtractedData } from "@/services/api/api";
import { cn } from "@/lib/utils";

interface BaseInformationGridProps {
  baseInformation: ExtractedData[];
  onItemClick?: (index: number) => void;
  selectedIndex?: number | null;
  excludeFields?: string[];
  emptyMessage?: string;
}

export function BaseInformationGrid({
  baseInformation,
  onItemClick,
  selectedIndex,
  excludeFields = ["compact_description"],
  emptyMessage = "No items available.",
}: BaseInformationGridProps) {
  const getAllFields = () => {
    return baseInformation.filter(
      (info) => !excludeFields.includes(info.field_name || "")
    );
  };

  const fields = getAllFields();

  if (fields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-3 border border-dashed text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 border border-border">
      {fields.map((info, idx) => {
        const originalIndex = baseInformation.findIndex(
          (item) => item === info
        );
        const isRightColumn = idx % 2 === 1;
        const totalItems = fields.length;
        const hasItemBelow = idx + 2 < totalItems;
        const isSelected = selectedIndex === originalIndex;

        return (
          <div
            key={originalIndex}
            className={cn(
              "p-2.5 border-r border-b border-border",
              isRightColumn && "border-r-0",
              !hasItemBelow && "border-b-0",
              isSelected
                ? "bg-muted/30 border-primary"
                : "bg-card hover:bg-muted/50 transition-colors",
              onItemClick && "cursor-pointer"
            )}
            onClick={() => onItemClick?.(originalIndex)}
          >
            <div className="space-y-1">
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
          </div>
        );
      })}
    </div>
  );
}
