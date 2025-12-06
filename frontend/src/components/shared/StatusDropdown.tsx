import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

interface StatusDropdownProps {
  value: string;
  onChange: (status: string) => void;
  statuses: readonly string[];
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  className?: string;
}

export function StatusDropdown({
  value,
  onChange,
  statuses,
  statusLabels,
  statusColors,
  className,
}: StatusDropdownProps) {
  const statusColor = statusColors[value];
  const statusLabel = statusLabels[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex-1 justify-start gap-2 h-8 text-sm ${className || ""}`}
        >
          <div
            className="h-2.5 w-2.5 flex-shrink-0"
            style={{ backgroundColor: `hsl(var(${statusColor}))` }}
          />
          <span className="flex-1 text-left">{statusLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="flex items-center gap-2"
          >
            <div
              className="h-2.5 w-2.5 flex-shrink-0"
              style={{
                backgroundColor: `hsl(var(${statusColors[s]}))`,
              }}
            />
            <span>{statusLabels[s]}</span>
            {value === s && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
