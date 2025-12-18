import { useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { KanbanCard } from '@/components/ui/shadcn-io/kanban';
import { Calendar, Tag } from 'lucide-react';
import type { Tender } from '@/services/api/api';
import type { ExtractedData } from '@/services/api/api';

interface TenderCardProps {
  tender: Tender;
  index: number;
  status: string;
  onViewDetails: (tender: Tender) => void;
  isOpen?: boolean;
  projectId: string;
  baseInformation?: ExtractedData[];
}

export const TenderCard = memo(function TenderCard({
  tender,
  index,
  status,
  onViewDetails,
  isOpen,
  baseInformation,
}: TenderCardProps) {
  const handleClick = useCallback(() => {
    onViewDetails(tender);
  }, [tender, onViewDetails]);

  const localRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !localRef.current) return;
    const el = localRef.current;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
    });
  }, [isOpen]);

  const baseInfoFields = useMemo(() => {
    const info = tender.base_information || baseInformation || [];
    
    if (!info || info.length === 0) {
      return {
        type: null,
        submissionDeadline: null,
        questionsDeadline: null,
      };
    }

    const findField = (fieldName: string): string | null => {
      const field = info.find(
        (inf) => inf.field_name === fieldName && inf.value
      );
      return field?.value || null;
    };

    return {
      type: findField('type'),
      submissionDeadline: findField('submission_deadline'),
      questionsDeadline: findField('questions_deadline'),
    };
  }, [tender.base_information, baseInformation]);

  return (
    <KanbanCard
      key={tender.id}
      id={tender.id}
      name={tender.title}
      index={index}
      parent={status}
      onClick={handleClick}
      isOpen={isOpen}
      forwardedRef={localRef}
      className="h-[140px]"
    >
      <div className="flex flex-col h-full">
        {/* Title */}
        <div className="flex gap-2 items-center min-w-0 mb-2">
          <h4 className="flex-1 min-w-0 line-clamp-2 font-medium text-sm">
            {tender.title}
          </h4>
        </div>
        
        {/* Type and Deadlines */}
        <div className="flex flex-col gap-1 mt-auto pt-2">
          <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
            <Tag className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              <span className="font-medium">Type:</span>{' '}
              {baseInfoFields.type || '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              <span className="font-medium">Questions:</span>{' '}
              {baseInfoFields.questionsDeadline || '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              <span className="font-medium">Submission:</span>{' '}
              {baseInfoFields.submissionDeadline || '-'}
            </span>
          </div>
        </div>
      </div>
    </KanbanCard>
  );
});

