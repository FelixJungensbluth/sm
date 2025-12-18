import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TenderKanbanBoard from "@/components/tenders/TenderKanbanBoard";
import TenderTableView from "@/components/tenders/TenderTableView";
import { TenderSidecard } from "@/components/tenders/TenderSidecard";
import type { DragEndEvent } from "@/components/ui/shadcn-io/kanban";
import { CreateTenderDialog } from "@/components/tenders/CreateTenderDialog";
import { useTenders, useUpdateTender, useCreateTender, useDeleteTender } from "@/hooks/use-tenders";
import type { Tender } from "@/services/api/api";
import type { FileWithPath } from "@/hooks/use-file-drop";
import { TENDER_STATUSES } from "@/lib/types";


export function Tenders() {
  const [searchParams] = useSearchParams();
  const viewType = searchParams.get('viewType') || 'kanban';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | undefined>(undefined);

  const { data: tenders = [] } = useTenders();
  const updateTender = useUpdateTender();
  const createTender = useCreateTender();
  const deleteTender = useDeleteTender();

  const tendersById = useMemo(() => {
    const map: Record<string, Tender> = {};
    if (!tenders || tenders.length === 0) return map;

    tenders.forEach((tender) => {
      map[tender.id] = tender;
    });
    return map;
  }, [tenders]);

  // Use all tenders (no filtering)
  const filteredTenders = useMemo(() => {
    return tenders || [];
  }, [tenders]);

  const groupedTenders = useMemo(() => {
    const groups: Record<string, Tender[]> = {};
    TENDER_STATUSES.forEach((status) => {
      groups[status] = [];
    });
    filteredTenders.forEach((tender: Tender) => {
      if (groups[tender.status]) {
        groups[tender.status].push(tender);
      } else {
        groups[TENDER_STATUSES[0]].push(tender);
      }
    });
    
    // Sort each group by created_at (newest first)
    Object.keys(groups).forEach((status) => {
      groups[status].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
    
    return groups;
  }, [filteredTenders]);

  const sortedTenders = useMemo(() => {
    return [...filteredTenders].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredTenders]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current) return;

      const draggedTenderId = active.id as string;
      const tender = tendersById[draggedTenderId];
      if (!tender) return;

      const oldStatus = active.data.current.parent as Tender["status"];
      
      // Determine the new status - could be a status (column) or a tender ID (card)
      const overId = over.id as string;
      const isStatusColumn = TENDER_STATUSES.includes(overId as Tender["status"]);
      
      let newStatus: Tender["status"];
      
      if (isStatusColumn) {
        // Dropped on a column
        newStatus = overId as Tender["status"];
      } else {
        // Dropped on a card - find which status that card belongs to
        const targetTender = tendersById[overId];
        if (targetTender) {
          newStatus = targetTender.status;
        } else {
          // Fallback to old status if target not found
          return;
        }
      }

      // Only update if status changed (moving between columns)
      if (oldStatus !== newStatus) {
        updateTender.mutate({
          id: draggedTenderId,
          data: { status: newStatus },
        });
      }
    },
    [tendersById, updateTender],
  );

  const handleViewTenderDetails = useCallback((tender: Tender) => {
    setSelectedTender(tender);
  }, []);

  const handleCreateNewTender = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleDeleteTender = useCallback(
    (tenderId: string) => {
      deleteTender.mutate(tenderId, {
        onSuccess: () => {
          if (selectedTender?.id === tenderId) {
            setSelectedTender(undefined);
          }
        },
      });
    },
    [selectedTender, deleteTender]
  );

  const handleCreateTender = useCallback(
    (data: { title: string; files: FileWithPath[] }) => {
      setIsCreating(true);
      
      createTender.mutate(
        {
          name: data.title,
          files: data.files,
        },
        {
          onSuccess: () => {
            setIsCreating(false);
            setIsCreateDialogOpen(false);
          },
          onError: () => {
            setIsCreating(false);
          },
        }
      );
    },
    [createTender]
  );

  // Listen for custom event from navbar to open create tender dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setIsCreateDialogOpen(true);
    };

    window.addEventListener('open-create-tender-dialog', handleOpenDialog);
    return () => {
      window.removeEventListener('open-create-tender-dialog', handleOpenDialog);
    };
  }, []);

  const renderMainView = () => {
    if (viewType === 'table') {
      return (
        <div className="flex-1 min-h-0 w-full h-full">
          <TenderTableView
            tenders={sortedTenders}
            onViewTenderDetails={handleViewTenderDetails}
            onCreateTender={handleCreateNewTender}
            selectedTender={selectedTender}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 w-full h-full overflow-x-auto overflow-y-auto overscroll-x-contain touch-pan-y">
        <TenderKanbanBoard
          groupedTenders={groupedTenders}
          onDragEnd={handleDragEnd}
          onViewTenderDetails={handleViewTenderDetails}
          onCreateTender={handleCreateNewTender}
          projectId=""
          selectedTender={selectedTender || undefined}
        />
      </div>
    );
  };

  return (
    <div className="min-h-full h-full flex flex-col">
      {selectedTender ? (
        <div className="flex-1 min-h-0 flex">
          {/* Main View (Kanban or Table) */}
          <div className="w-1/2 min-w-0 min-h-0 overflow-hidden">
            {renderMainView()}
          </div>

          {/* Tender Sidecard */}
          <div className="w-1/2 min-w-0 min-h-0 overflow-hidden">
            <TenderSidecard
              tender={selectedTender}
              onClose={() => setSelectedTender(undefined)}
            />
          </div>
        </div>
      ) : (
        renderMainView()
      )}

      <CreateTenderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          projectId={null}
          onCreateTender={handleCreateTender}
          isLoading={isCreating}
        />
    </div>
  );
}
