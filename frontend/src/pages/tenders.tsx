import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelGroup, Panel } from "react-resizable-panels";
import TenderKanbanBoard from "@/components/tenders/TenderKanbanBoard";
import TenderTableView from "@/components/tenders/TenderTableView";
import { TenderSidecard } from "@/components/tenders/TenderSidecard";
import type { DragEndEvent } from "@/components/ui/shadcn-io/kanban";
import { CreateTenderDialog } from "@/components/tenders/CreateTenderDialog";
import { useSearch } from "@/contexts/search-context";
import { useTenders, useUpdateTender, useCreateTender, useDeleteTender } from "@/hooks/use-tenders";
import type { Tender } from "@/services/api/api";
import type { FileWithPath } from "@/hooks/use-file-drop";
import { TENDER_STATUSES } from "@/lib/types";
import ResizeHandler from "@/components/panels/resize-handler";


export function Tenders() {
  const [searchParams] = useSearchParams();
  const viewType = searchParams.get('viewType') || 'kanban';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | undefined>(undefined);

  const { data: tenders = [] } = useTenders();
  
  const { query: searchQuery } = useSearch();
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

  // Filter tenders based on search query
  const filteredTenders = useMemo(() => {
    if (!tenders || tenders.length === 0) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return tenders;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return tenders.filter((tender: Tender) => {
      const titleMatch = tender.title.toLowerCase().includes(query);
      const descriptionMatch = tender.description?.toLowerCase().includes(query) ?? false;
      return titleMatch || descriptionMatch;
    });
  }, [tenders, searchQuery]);

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
    
    // Sort each group by order (or created_at as fallback)
    Object.keys(groups).forEach((status) => {
      groups[status].sort((a, b) => {
        const aOrder = ('order' in a && typeof a.order === 'number') ? a.order : new Date(a.created_at).getTime();
        const bOrder = ('order' in b && typeof b.order === 'number') ? b.order : new Date(b.created_at).getTime();
        return bOrder - aOrder; // Higher order first (newer/more recent first)
      });
    });
    
    return groups;
  }, [filteredTenders]);

  const sortedTenders = useMemo(() => {
    return [...filteredTenders].sort((a, b) => {
      // Type-safe access to order property if it exists
      const aOrder = ('order' in a && typeof a.order === 'number') ? a.order : new Date(a.created_at).getTime();
      const bOrder = ('order' in b && typeof b.order === 'number') ? b.order : new Date(b.created_at).getTime();
      return bOrder - aOrder;
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
      const oldIndex = active.data.current.index as number;
      
      // Determine the new status - could be a status (column) or a tender ID (card)
      const overId = over.id as string;
      const isStatusColumn = TENDER_STATUSES.includes(overId as Tender["status"]);
      
      let newStatus: Tender["status"];
      let targetTenderId: string | null = null;
      
      if (isStatusColumn) {
        // Dropped on a column
        newStatus = overId as Tender["status"];
      } else {
        // Dropped on a card - find which status that card belongs to
        targetTenderId = overId;
        const targetTender = tendersById[overId];
        if (targetTender) {
          newStatus = targetTender.status;
        } else {
          // Fallback to old status if target not found
          newStatus = oldStatus;
        }
      }

      // Handle status change (moving between columns)
      if (oldStatus !== newStatus) {
        updateTender.mutate({
          id: draggedTenderId,
          data: { status: newStatus },
        });
        return;
      }

      // Handle reordering within the same column
      if (oldStatus === newStatus) {
        const currentGroup = [...(groupedTenders[oldStatus] || [])];
        const draggedIndex = currentGroup.findIndex((t) => t.id === draggedTenderId);
        
        if (draggedIndex === -1) return;

        let newIndex = draggedIndex;
        
        // If dropped on another card, calculate position relative to that card
        if (targetTenderId && targetTenderId !== draggedTenderId) {
          const targetIndex = currentGroup.findIndex((t) => t.id === targetTenderId);
          if (targetIndex !== -1) {
            // Remove dragged item from array temporarily
            const [draggedItem] = currentGroup.splice(draggedIndex, 1);
            
            // Calculate new position
            if (draggedIndex < targetIndex) {
              // Dragging down - place after target
              newIndex = targetIndex; // After removing dragged item, target index is now targetIndex
            } else {
              // Dragging up - place before target
              newIndex = targetIndex;
            }
            
            // Insert at new position
            currentGroup.splice(newIndex, 0, draggedItem);
          }
        }
        // If dropped on column (not a card), maintain current position (no reordering needed)

        // Only update if position actually changed
        if (newIndex === draggedIndex) return;

        // Calculate new order value
        // Get orders of surrounding cards to calculate a new order
        const getOrder = (t: Tender) => {
          return ('order' in t && typeof t.order === 'number') 
            ? t.order 
            : new Date(t.created_at).getTime();
        };

        let newOrder: number;
        
        if (newIndex === 0) {
          // Moving to the top - set order higher than the current top
          const topOrder = currentGroup.length > 1 ? getOrder(currentGroup[1]) : Date.now();
          newOrder = topOrder + 1000;
        } else if (newIndex >= currentGroup.length - 1) {
          // Moving to the bottom - set order lower than the current bottom
          const bottomIndex = currentGroup.length - 2;
          const bottomOrder = bottomIndex >= 0 
            ? getOrder(currentGroup[bottomIndex]) 
            : Date.now();
          newOrder = Math.max(0, bottomOrder - 1000);
        } else {
          // Moving to middle - calculate order between adjacent cards
          const prevOrder = getOrder(currentGroup[newIndex - 1]);
          const nextOrder = getOrder(currentGroup[newIndex + 1]);
          newOrder = (prevOrder + nextOrder) / 2;
        }

        // Update the tender with new order
        // Note: This will work with optimistic updates even if backend doesn't support order
        updateTender.mutate({
          id: draggedTenderId,
          data: { 
            // @ts-expect-error - order might not be in TenderUpdate type, but we'll try to send it
            order: newOrder 
          },
        });
      }
    },
    [tendersById, updateTender, groupedTenders],
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
        <PanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Main View (Kanban or Table) */}
          <Panel
            id="main-view"
            defaultSize={50}
            minSize={50}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            {renderMainView()}
          </Panel>

          <ResizeHandler id="handle-main-sidecard" />

          {/* Tender Sidecard */}
          <Panel
            id="sidecard"
            defaultSize={50}
            minSize={25}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            <TenderSidecard
              tender={selectedTender}
              onClose={() => setSelectedTender(undefined)}
            />
          </Panel>
        </PanelGroup>
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
