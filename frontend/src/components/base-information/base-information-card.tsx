import type { BaseInformation } from "@/services/api/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useCallback } from "react";

interface BaseInformationCardProps {
  baseInformation: BaseInformation;
  index: number;
  onSelect: (index: number) => void;
  isSelected?: boolean;
  tenderId: string;
}

export default function BaseInformationCard({
  baseInformation,
  index,
  onSelect,
  isSelected = false,
  tenderId,
}: BaseInformationCardProps) {
  const api = useApi();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      return api.tenders.updateTenderBaseInformationStatus(tenderId, {
        field_name: baseInformation.field_name,
        base_information_status: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
  });

  const handleApprove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateStatusMutation.mutate("approved");
    },
    [updateStatusMutation]
  );

  const handleReject = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateStatusMutation.mutate("rejected");
    },
    [updateStatusMutation]
  );

  return (
    <div
      className={cn(
        "py-3 cursor-pointer transition-colors border-b border-border/50",
        isSelected ? "bg-blue-50" : "bg-muted/30 hover:bg-muted/50",
      )}
      onClick={() => onSelect(index)}
    >
      <div className="space-y-2 p-4">
        <div className="text-sm font-semibold text-foreground">
          {baseInformation.field_name}
        </div>
        {baseInformation.value && (
          <div className="text-xs text-muted-foreground break-words">
            {baseInformation.value}
          </div>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={baseInformation.status === "approved" ? "default" : "outline"}
            size="xs"
            onClick={handleApprove}
            disabled={updateStatusMutation.isPending || baseInformation.status === "approved"}
            className={cn(
              "h-6 px-2 py-1 text-xs",
              baseInformation.status === "approved" && "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
            )}
          >
            <Check className="h-2.5 w-2.5 mr-1" />
            Approve
          </Button>
          <Button
            variant={baseInformation.status === "rejected" ? "default" : "outline"}
            size="xs"
            onClick={handleReject}
            disabled={updateStatusMutation.isPending || baseInformation.status === "rejected"}
            className={cn(
              "h-6 px-2 py-1 text-xs",
              baseInformation.status === "rejected" && "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
            )}
          >
            <X className="h-2.5 w-2.5 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
