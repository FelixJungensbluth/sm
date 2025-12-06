import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

export function BackButton({ onClick, className, label = "Back" }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn("h-8 text-sm", className)}
    >
      <ArrowLeft className="h-3 w-3 mr-1.5" />
      {label}
    </Button>
  );
}
