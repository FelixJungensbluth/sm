import { memo } from 'react';
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/shadcn-io/kanban';
import { TenderCard } from './TenderCard';
import type { ExtractedData, Tender } from '@/services/api/api';
import type { TenderStatus } from '@/lib/types';

import { statusBoardColors, statusLabels } from '@/utils/status-labels';
import { TENDER_STATUSES } from '@/lib/types';


interface TenderKanbanBoardProps {
  groupedTenders: Record<TenderStatus, Tender[]>;
  onDragEnd: (event: DragEndEvent) => void;
  onViewTenderDetails: (tender: Tender) => void;
  selectedTender?: Tender;
  onCreateTender?: () => void;
  projectId: string;
  baseInformationMap?: Record<string, ExtractedData[]>;
}

function TenderKanbanBoard({
  groupedTenders,
  onDragEnd,
  onViewTenderDetails,
  selectedTender,
  onCreateTender,
  projectId,
  baseInformationMap,
}: TenderKanbanBoardProps) {
  return (
    <KanbanProvider onDragEnd={onDragEnd}>
      {TENDER_STATUSES.map((status: TenderStatus) => {
        const statusTenders = groupedTenders[status] || [];
        return (
          <KanbanBoard key={status} id={status}>
            <KanbanHeader
              name={statusLabels[status]}
              color={statusBoardColors[status]}
            />
            <KanbanCards>
              {statusTenders.map((tender, index) => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  index={index}
                  status={status}
                  onViewDetails={onViewTenderDetails}
                  isOpen={selectedTender?.id === tender.id}
                  projectId={projectId}
                  baseInformation={baseInformationMap?.[tender.id]}
                />
              ))}
            </KanbanCards>
          </KanbanBoard>
        );
      })}
    </KanbanProvider>
  );
}

export default memo(TenderKanbanBoard);

