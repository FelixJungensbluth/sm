import type { BaseInformation } from "@/services/api/api";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ApproveRejectButtons } from "@/components/shared/ApproveRejectButtons";

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
        <div onClick={(e) => e.stopPropagation()}>
          <ApproveRejectButtons
            currentStatus={baseInformation.status}
            onApprove={handleApprove}
            onReject={handleReject}
            isPending={updateStatusMutation.isPending}
            size="xs"
          />
        </div>
      </div>
    </div>
  );
}
