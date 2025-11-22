import { memo, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { TenderStatus, Tender } from '@/lib/types';
import { Calendar } from 'lucide-react';
import { statusLabels, statusBoardColors } from '@/utils/status-labels';
import { cn } from '@/lib/utils';


interface TenderTableViewProps {
  tenders: Tender[];
  onViewTenderDetails: (tender: Tender) => void;
  selectedTender?: Tender;
  onCreateTender?: () => void;
}

function TenderTableView({
  tenders,
  onViewTenderDetails,
  selectedTender,
  onCreateTender,
}: TenderTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Tender>[]>(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status as TenderStatus;
          const color = statusBoardColors[status];
          const label = statusLabels[status];
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `hsl(var(${color}))` }}
              />
              <span className="text-sm">{label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => {
          const tender = row.original;
          const baseInfo = tender.base_information || [];
          
          // Extract description from base_information like TenderCard does
          const findField = (fieldName: string): string | null => {
            const field = baseInfo.find(
              (inf) => inf.field_name === fieldName && inf.value
            );
            return field?.value || null;
          };
          
          const description = findField('compact_description') || 
                             findField('description') || 
                             tender.description;
          
          return (
            <div className="flex flex-col gap-1">
              <h4 className="font-light text-sm">{tender.title}</h4>
              {description && (
                <p className="text-xs text-secondary-foreground line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'questions_deadline',
        header: 'Questions Deadline',
        cell: ({ row }) => {
          const tender = row.original;
          const baseInfo = tender.base_information || [];
          const findField = (fieldName: string): string | null => {
            const field = baseInfo.find(
              (inf) => inf.field_name === fieldName && inf.value
            );
            return field?.value || null;
          };
          const questionsDeadline = findField('questions_deadline');
          
          if (!questionsDeadline) {
            return <span className="text-sm text-secondary-foreground">-</span>;
          }
          
          return (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-secondary-foreground flex-shrink-0" />
              <span className="text-sm text-secondary-foreground">
                {questionsDeadline}
              </span>
            </div>
          );
        },
      },
      {
        id: 'submission_deadline',
        header: 'Submission Deadline',
        cell: ({ row }) => {
          const tender = row.original;
          const baseInfo = tender.base_information || [];
          const findField = (fieldName: string): string | null => {
            const field = baseInfo.find(
              (inf) => inf.field_name === fieldName && inf.value
            );
            return field?.value || null;
          };
          const submissionDeadline = findField('submission_deadline');
          
          if (!submissionDeadline) {
            return <span className="text-sm text-secondary-foreground">-</span>;
          }
          
          return (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-secondary-foreground flex-shrink-0" />
              <span className="text-sm text-secondary-foreground">
                {submissionDeadline}
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tenders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="h-full w-full overflow-auto">
      <div className="min-w-full">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-secondary-foreground uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted/50'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() && (
                        <span className="text-xs">
                          {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-secondary-foreground"
                >
                  No tenders found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const tender = row.original;
                const isSelected = selectedTender?.id === tender.id;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'cursor-pointer',
                      isSelected && 'ring-2 ring-secondary-foreground ring-inset'
                    )}
                    style={{
                      backgroundColor: 'hsl(var(--muted))',
                    }}
                    onClick={() => onViewTenderDetails(tender)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-sm"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
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

export default memo(TenderTableView);

