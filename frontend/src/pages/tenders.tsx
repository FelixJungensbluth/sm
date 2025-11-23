import { useCallback, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelGroup, Panel } from "react-resizable-panels";
import TenderKanbanBoard from "@/components/tenders/TenderKanbanBoard";
import TenderTableView from "@/components/tenders/TenderTableView";
import { TenderSidecard } from "@/components/tenders/TenderSidecard";
import type { DragEndEvent } from "@/components/ui/shadcn-io/kanban";
import { CreateTenderDialog } from "@/components/tenders/CreateTenderDialog";
import { CommandMenu } from "@/components/command-menu";
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
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const { data: tenders = [] } = useTenders();
  console.log(tenders);
  
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
    return groups;
  }, [filteredTenders]);

  const sortedTenders = useMemo(() => {
    return [...filteredTenders].sort((a, b) => {
      const aOrder = (a as any).order ?? new Date(a.created_at).getTime();
      const bOrder = (b as any).order ?? new Date(b.created_at).getTime();
      return bOrder - aOrder;
    });
  }, [filteredTenders]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !active.data.current) return;

      const draggedTenderId = active.id as string;
      const newStatus = over.id as Tender["status"];
      const tender = tendersById[draggedTenderId];
      if (!tender) return;

      const oldStatus = active.data.current.parent as Tender["status"];

      // Only update if status changed
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
    console.log('handleCreateNewTender called');
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

      <CommandMenu
        open={isCommandMenuOpen}
        onOpenChange={setIsCommandMenuOpen}
        onCreateTender={handleCreateNewTender}
        onDeleteTender={handleDeleteTender}
        selectedTender={selectedTender}
        tenders={filteredTenders}
      />
    </div>
  );
}
