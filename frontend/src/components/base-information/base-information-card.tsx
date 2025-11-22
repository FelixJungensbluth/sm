import type { BaseInformation } from "@/services/api/api";
import { cn } from "@/lib/utils";

interface BaseInformationCardProps {
  baseInformation: BaseInformation;
  index: number;
  onSelect: (index: number) => void;
  isSelected?: boolean;
}

export default function BaseInformationCard({
  baseInformation,
  index,
  onSelect,
  isSelected = false,
}: BaseInformationCardProps) {
  return (
    <div
      className={cn(
        "py-3 cursor-pointer transition-colors border-b border-border/50",
        isSelected ? "bg-blue-50" : "bg-muted/30 hover:bg-muted/50",
      )}
      onClick={() => onSelect(index)}
    >
      <div className="space-y-1 p-4">
        <div className="text-sm font-semibold text-foreground">
          {baseInformation.field_name}
        </div>
        {baseInformation.value && (
          <div className="text-xs text-muted-foreground break-words">
            {baseInformation.value}
          </div>
        )}
      </div>
    </div>
  );
}
