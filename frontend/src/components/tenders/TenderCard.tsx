import { useCallback, useEffect, useRef, useMemo } from 'react';
import { KanbanCard } from '@/components/ui/shadcn-io/kanban';
import { Calendar } from 'lucide-react';
import type { Tender } from '@/services/api/api';
import type { BaseInformation } from '@/services/api/api';

interface TenderCardProps {
  tender: Tender;
  index: number;
  status: string;
  onViewDetails: (tender: Tender) => void;
  isOpen?: boolean;
  projectId: string;
  baseInformation?: BaseInformation[];
}

export function TenderCard({
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
        description: null,
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
      description: findField('compact_description') || findField('description'),
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
    >
      {/* Title */}
      <div className="flex flex-1 gap-2 items-center min-w-0">
        <h4 className="flex-1 min-w-0 line-clamp-2 font-medium text-sm ">
          {tender.title}
        </h4>
      </div>
      
      {(tender.description || baseInfoFields.description) && (
        <p className="flex-1 text-xs text-secondary-foreground break-words mt-1 font-light">
          {(() => {
            const desc = baseInfoFields.description || tender.description || '';
            return desc.length > 130 ? `${desc.substring(0, 130)}...` : desc;
          })()}
        </p>
      )}
      
      {/* Deadlines */}
      {(baseInfoFields.submissionDeadline || baseInfoFields.questionsDeadline) && (
        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border">
          {baseInfoFields.questionsDeadline && (
            <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                <span className="font-medium">Questions:</span>{' '}
                {baseInfoFields.questionsDeadline}
              </span>
            </div>
          )}
          {baseInfoFields.submissionDeadline && (
            <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                <span className="font-medium">Submission:</span>{' '}
                {baseInfoFields.submissionDeadline}
              </span>
            </div>
          )}
        </div>
      )}
    </KanbanCard>
  );
}

