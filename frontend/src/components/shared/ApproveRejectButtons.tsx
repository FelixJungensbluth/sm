import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApproveRejectButtonsProps {
  currentStatus?: "approved" | "rejected" | null;
  onApprove: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
  isPending?: boolean;
  size?: "xs" | "sm" | "default";
  className?: string;
}

export function ApproveRejectButtons({
  currentStatus,
  onApprove,
  onReject,
  isPending = false,
  size = "xs",
  className,
}: ApproveRejectButtonsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant={currentStatus === "approved" ? "default" : "outline"}
        size={size}
        onClick={onApprove}
        disabled={isPending || currentStatus === "approved"}
        className={cn(
          size === "xs" ? "h-6 px-2 py-1 text-xs" : "h-7 text-xs",
          currentStatus === "approved" &&
            "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
        )}
      >
        <Check className={cn(size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3", "mr-1")} />
        Approve
      </Button>
      <Button
        variant={currentStatus === "rejected" ? "default" : "outline"}
        size={size}
        onClick={onReject}
        disabled={isPending || currentStatus === "rejected"}
        className={cn(
          size === "xs" ? "h-6 px-2 py-1 text-xs" : "h-7 text-xs",
          currentStatus === "rejected" &&
            "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
        )}
      >
        <X className={cn(size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3", "mr-1")} />
        Reject
      </Button>
    </div>
  );
}
