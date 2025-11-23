import { type Requirement, type RequirementStatus } from "@/services/api/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import React, { type MouseEvent, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import clsx from "clsx";
import { getStatusClasses } from "@/lib/utils.ts";
import { EVALUATION, EXCLUSION } from "@/constants/requirement-categories";
import { REQUIREMENT_STATUS } from "@/constants/requirement-status";

interface RequirementsTableViewProps {
  requirements: Requirement[];
  onRequirementDelete: (requirementId: string) => void;
  onRequirementDeletePermanent: (requirementId: string) => void;
  onRequirementRestore: (requirementId: string) => void;
  onRequirementDetail: (requirement: Requirement) => void;
  onStatusUpdate: (requirementId: string, status: RequirementStatus) => void;
  trashedView?: boolean;
  currentRequirement?: Requirement;
}

type SortField = "name" | "file" | "category" | "type" | "status";
type SortDirection = "asc" | "desc";

export default function RequirementsTableView({
  requirements,
  onRequirementDelete,
  onRequirementDeletePermanent,
  onRequirementRestore,
  onRequirementDetail,
  onStatusUpdate,
  trashedView = false,
  currentRequirement,
}: RequirementsTableViewProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filteredAndSortedRequirements = useMemo(() => {
    return [...requirements].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "file":
          aValue = a.file;
          bValue = b.file;
          break;
        case "category":
          aValue = a.category || "";
          bValue = b.category || "";
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "status":
          aValue = a.status || "Nicht gesetzt";
          bValue = b.status || "Nicht gesetzt";
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [requirements, sortDirection, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleStatusChange = (
    requirementId: string,
    newStatus: RequirementStatus,
    event: MouseEvent
  ) => {
    event.stopPropagation();
    onStatusUpdate(requirementId, newStatus);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case EXCLUSION:
        return "bg-destructive/10 text-destructive";
      case EVALUATION:
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4" />
      )}
    </Button>
  );

  const ActionButtons = ({ requirement }: { requirement: Requirement }) => {
    return trashedView ? (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onRequirementRestore?.(requirement.id);
          }}
        >
          <RotateCcw size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRequirementDeletePermanent?.(requirement.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
          onClick={(e) => {
            onRequirementDetail(requirement);
            e.stopPropagation();
          }}
        >
          <Info size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRequirementDelete?.(requirement.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full w-full overflow-auto">
      <div className="min-w-full">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[30%]">
                <SortButton field="name">Name</SortButton>
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[12%]">
                <SortButton field="category">Kategorie</SortButton>
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[12%]">
                <SortButton field="type">Typ</SortButton>
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[13%]">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[15%]">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAndSortedRequirements.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Keine Anforderungen gefunden
                </td>
              </tr>
            ) : (
              filteredAndSortedRequirements.map((requirement) => {
                const isSelected = currentRequirement?.id === requirement.id;
                return (
                  <tr
                    key={requirement.id}
                    className={clsx(
                      "cursor-pointer transition-colors",
                      isSelected && "ring-2 ring-primary ring-inset"
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? "hsl(var(--muted))"
                        : undefined,
                    }}
                    onClick={() => onRequirementDetail(requirement)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-lg">
                        <div className="font-medium truncate">
                          {requirement.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {requirement.category && (
                        <Badge
                          variant="secondary"
                          className={getCategoryColor(requirement.category)}
                        >
                          {requirement.category}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {requirement.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge
                            className={clsx(
                              "transition-colors cursor-pointer",
                              getStatusClasses(
                                requirement.status ?? "Nicht gesetzt"
                              )
                            )}
                          >
                            {requirement.status ?? "Nicht gesetzt"}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {REQUIREMENT_STATUS.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              className="flex items-center gap-2 cursor-pointer py-1.5"
                              onClick={(e) =>
                                handleStatusChange(
                                  requirement.id,
                                  status as RequirementStatus,
                                  e
                                )
                              }
                            >
                              <Badge
                                className={getStatusClasses(
                                  status as RequirementStatus
                                )}
                              >
                                {status}
                              </Badge>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3 text-sm pr-3">
                      <ActionButtons requirement={requirement} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
