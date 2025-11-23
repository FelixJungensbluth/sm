import { Badge } from '@/components/ui/badge';
import { EXCLUSION } from '@/constants/requirement-categories';
import { type Requirement } from '@/services/api/api.ts';

interface RequirementHoverOverlayProps {
  requirement: Requirement;
  x: number;
  y: number;
}

export function RequirementHoverOverlay({ requirement, x, y }: RequirementHoverOverlayProps) {
  return (
    <div
      className="absolute z-50 bg-popover border border-gray-400 shadow-lg max-w-xs pointer-events-auto"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translateX(-50%) translateY(-100%)'
      }}
    >
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-popover-foreground leading-tight line-clamp-2">
          {requirement.name}
        </h4>
        <p className="text-xs break-words text-muted-foreground">{requirement.note}</p>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={requirement.category === EXCLUSION ? 'destructive' : 'secondary'}
            className="text-xs px-2 py-0.5"
          >
            {requirement.category}
          </Badge>
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {requirement.type}
          </Badge>
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {requirement.status}
          </Badge>
        </div>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-400" />
        <div
          className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-popover" />
      </div>
    </div>
  );
}
