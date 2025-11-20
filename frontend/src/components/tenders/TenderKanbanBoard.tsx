import { memo } from 'react';
import {
  type DragEndEvent,
  KanbanBoard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/shadcn-io/kanban';
import { TenderCard } from './TenderCard';
import type { BaseInformation, Tender, TenderStatus } from '@/services/api/api';

import { statusBoardColors, statusLabels } from '@/utils/status-labels';


interface TenderKanbanBoardProps {
  groupedTenders: Record<TenderStatus, Tender[]>;
  onDragEnd: (event: DragEndEvent) => void;
  onViewTenderDetails: (tender: Tender) => void;
  selectedTender?: Tender;
  onCreateTender?: () => void;
  projectId: string;
  baseInformationMap?: Record<string, BaseInformation[]>;
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
      {Object.entries(groupedTenders).map(([status, statusTenders]) => (
        <KanbanBoard key={status} id={status as TenderStatus}>
          <KanbanHeader
            name={statusLabels[status as TenderStatus]}
            color={statusBoardColors[status as TenderStatus]}
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
      ))}
    </KanbanProvider>
  );
}

export default memo(TenderKanbanBoard);

