import { memo, useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { TaskWithAttemptStatus, TaskStatus } from '@/lib/types';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { statusLabels, statusBoardColors } from '@/utils/status-labels';
import { cn } from '@/lib/utils';

type Task = TaskWithAttemptStatus;

interface TaskTableViewProps {
  tasks: Task[];
  onViewTaskDetails: (task: Task) => void;
  selectedTask?: Task;
  onCreateTask?: () => void;
  projectId: string;
}

function TaskTableView({
  tasks,
  onViewTaskDetails,
  selectedTask,
  onCreateTask,
  projectId,
}: TaskTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status as TaskStatus;
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
          const task = row.original;
          return (
            <div className="flex flex-col gap-1">
              <h4 className="font-light text-sm">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-secondary-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'executor',
        header: 'Executor',
        cell: ({ row }) => {
          const executor = row.original.executor;
          return (
            <span className="text-sm text-secondary-foreground">
              {executor || '-'}
            </span>
          );
        },
      },
      {
        id: 'indicators',
        header: '',
        cell: ({ row }) => {
          const task = row.original;
          return (
            <div className="flex items-center gap-1">
              {task.has_in_progress_attempt && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {task.has_merged_attempt && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {task.last_attempt_failed &&
                !task.has_merged_attempt && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tasks,
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
                  No tasks found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const task = row.original;
                const isSelected = selectedTask?.id === task.id;
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
                    onClick={() => onViewTaskDetails(task)}
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

export default memo(TaskTableView);

