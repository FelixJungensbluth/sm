import type { Requirement } from "@/services/api/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useCallback } from "react";
import { EXCLUSION, EVALUATION } from "@/constants/requirement-categories";

interface RequirementCardProps {
  requirement: Requirement;
  index: number;
  onSelect: (index: number) => void;
  isSelected?: boolean;
}

export default function RequirementCard({
  requirement,
  index,
  onSelect,
  isSelected = false,
}: RequirementCardProps) {
  const api = useApi();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      return api.requirements.updateRequirementStatus(requirement.id, {
        requirement_status: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirementsForTender", requirement.tender_id] });
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case EXCLUSION:
        return "bg-red-100 text-red-800";
      case EVALUATION:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className={cn(
        "py-3 cursor-pointer transition-colors border-b border-border/50",
        isSelected ? "bg-blue-50" : "bg-muted/30 hover:bg-muted/50",
      )}
      onClick={() => onSelect(index)}
    >
      <div className="space-y-2 p-4">
        <div className="text-sm font-semibold text-foreground line-clamp-2">
          {requirement.name}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {requirement.category && (
            <Badge
              variant="secondary"
              className={cn("text-xs", getCategoryColor(requirement.category))}
            >
              {requirement.category}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {requirement.type}
          </Badge>
          {requirement.status && (
            <Badge variant="outline" className="text-xs">
              {requirement.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={requirement.status === "approved" ? "default" : "outline"}
            size="xs"
            onClick={handleApprove}
            disabled={updateStatusMutation.isPending || requirement.status === "approved"}
            className={cn(
              "h-6 px-2 py-1 text-xs",
              requirement.status === "approved" && "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
            )}
          >
            <Check className="h-2.5 w-2.5 mr-1" />
            Approve
          </Button>
          <Button
            variant={requirement.status === "rejected" ? "default" : "outline"}
            size="xs"
            onClick={handleReject}
            disabled={updateStatusMutation.isPending || requirement.status === "rejected"}
            className={cn(
              "h-6 px-2 py-1 text-xs",
              requirement.status === "rejected" && "!bg-black !text-white hover:!bg-black disabled:!bg-black disabled:!text-white disabled:!opacity-100"
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

