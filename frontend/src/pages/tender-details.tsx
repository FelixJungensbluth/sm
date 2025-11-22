import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, Edit2, Check, X as XIcon, Eye } from 'lucide-react';
import { statusLabels, statusBoardColors } from '@/utils/status-labels';
import { useTenderById, useUpdateTender } from '@/hooks/use-tenders';
import type { TenderStatus, BaseInformation } from '@/services/api/api';
import { cn } from '@/lib/utils';
import { TENDER_STATUSES } from '@/lib/types';



export function TenderDetail() {
  const { taskId, tenderId, projectId } = useParams<{
    taskId?: string;
    tenderId?: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const id = taskId || tenderId;
  
  const { data: tender, isLoading } = useTenderById(id);
  const updateTender = useUpdateTender();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TenderStatus>('In Prüfung');
  const [baseInformation, setBaseInformation] = useState<BaseInformation[]>([]);

  // Edit mode state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingBaseInfoIndex, setEditingBaseInfoIndex] = useState<number | null>(null);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when tender data loads
  useEffect(() => {
    if (tender) {
      setTitle(tender.title);
      setDescription(tender.description);
      setStatus(tender.status);
      setBaseInformation(tender.base_information || []);
      setHasChanges(false);
    }
  }, [tender]);

  // Check for changes
  useEffect(() => {
    if (!tender) return;
    
    const hasTitleChange = title !== tender.title;
    const hasDescriptionChange = description !== tender.description;
    const hasStatusChange = status !== tender.status;
    const hasBaseInfoChange =
      JSON.stringify(baseInformation) !==
      JSON.stringify(tender.base_information || []);

    setHasChanges(
      hasTitleChange ||
        hasDescriptionChange ||
        hasStatusChange ||
        hasBaseInfoChange
    );
  }, [title, description, status, baseInformation, tender]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenView = () => {
    if (!tender) return;
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tender.id}/view`);
    } else {
      navigate(`/tenders/${tender.id}/view`);
    }
  };

  const handleSave = async () => {
    if (!tender) return;
    
    setIsSaving(true);
    try {
      await updateTender.mutateAsync({
        id: tender.id,
        data: {
          title: title !== tender.title ? title : undefined,
          description:
            description !== tender.description ? description : undefined,
          status: status !== tender.status ? status : undefined,
          base_information:
            JSON.stringify(baseInformation) !==
            JSON.stringify(tender.base_information || [])
              ? baseInformation
              : undefined,
        },
      });
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setEditingBaseInfoIndex(null);
    } catch (error) {
      console.error('Failed to save tender:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!tender) return;
    
    setTitle(tender.title);
    setDescription(tender.description);
    setStatus(tender.status);
    setBaseInformation(tender.base_information || []);
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setEditingBaseInfoIndex(null);
  };

  const handleBaseInfoFieldChange = (
    index: number,
    field: keyof BaseInformation,
    value: string | boolean | null
  ) => {
    const updated = [...baseInformation];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setBaseInformation(updated);
  };

  const handleAddBaseInfo = () => {
    setBaseInformation([
      ...baseInformation,
      {
        field_name: '',
        value: null,
        source_file: null,
        source_file_id: null,
        exact_text: null,
        approved: null,
        note: null,
        fulfillable: null,
      },
    ]);
    setEditingBaseInfoIndex(baseInformation.length);
  };

  const handleRemoveBaseInfo = (index: number) => {
    setBaseInformation(baseInformation.filter((_, i) => i !== index));
    if (editingBaseInfoIndex === index) {
      setEditingBaseInfoIndex(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-4 px-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4 h-8 text-sm">
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back
        </Button>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto max-w-4xl py-4 px-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4 h-8 text-sm">
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back
        </Button>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tender not found</p>
        </Card>
      </div>
    );
  }

  const statusColor = statusBoardColors[status];
  const statusLabel = statusLabels[status];

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-4xl py-4 px-4">
        {/* Header with Back and Save */}
        <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={handleBack} className="h-8 text-sm">
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleOpenView} className="h-8 text-sm">
            <Eye className="h-3 w-3 mr-1.5" />
            View
          </Button>
          {hasChanges && (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-8 text-sm">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="h-8 text-sm">
                {isSaving ? (
                  <>
                    <Save className="h-3 w-3 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Header Card */}
        <Card className="p-4">
          <div className="space-y-3">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Title
              </Label>
              {isEditingTitle ? (
                <div className="space-y-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTitle(false);
                      }
                      if (e.key === 'Escape') {
                        setTitle(tender.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="text-xl font-semibold h-9"
                    autoFocus
                  />
                </div>
              ) : (
                <h1
                  className="text-xl font-semibold cursor-text hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit"
                >
                  {title || 'Untitled Tender'}
                </h1>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto justify-start gap-2 h-8 text-sm">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `hsl(var(${statusColor}))` }}
                    />
                    <span className="flex-1 text-left">{statusLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {TENDER_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setStatus(s)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: `hsl(var(${statusBoardColors[s]}))`,
                        }}
                      />
                      <span>{statusLabels[s]}</span>
                      {status === s && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </Label>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDescription(true)}
                  className="h-7 px-2 text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="min-h-[120px] resize-none text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsEditingDescription(false)}
                    className="h-7 text-xs"
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDescription(tender.description);
                      setIsEditingDescription(false);
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-foreground whitespace-pre-wrap break-words p-3 rounded-md border border-transparent hover:border-border cursor-text min-h-[60px] transition-colors"
                onClick={() => setIsEditingDescription(true)}
              >
                {description || (
                  <span className="text-muted-foreground italic">
                    No description. Click to add one.
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Base Information */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Base Information
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddBaseInfo}
                className="h-7 px-2 text-xs"
              >
                + Add Field
              </Button>
            </div>
            {baseInformation.length === 0 ? (
              <div className="text-sm text-muted-foreground italic p-3 rounded-md border border-dashed text-center">
                No base information. Click "Add Field" to add a field.
              </div>
            ) : (
              <div className="space-y-3">
                {baseInformation.map((info, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-md border',
                      editingBaseInfoIndex === index
                        ? 'border-primary bg-muted/30'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {editingBaseInfoIndex === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Field Name</Label>
                            <Input
                              value={info.field_name || ''}
                              onChange={(e) =>
                                handleBaseInfoFieldChange(
                                  index,
                                  'field_name',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., submission_deadline"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Value</Label>
                            <Input
                              value={info.value || ''}
                              onChange={(e) =>
                                handleBaseInfoFieldChange(
                                  index,
                                  'value',
                                  e.target.value || null
                                )
                              }
                              placeholder="Enter value..."
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Note</Label>
                          <Textarea
                            value={info.note || ''}
                            onChange={(e) =>
                              handleBaseInfoFieldChange(
                                index,
                                'note',
                                e.target.value || null
                              )
                            }
                            placeholder="Add a note..."
                            className="min-h-[60px] resize-none text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={info.approved === true}
                              onChange={(e) =>
                                handleBaseInfoFieldChange(
                                  index,
                                  'approved',
                                  e.target.checked ? true : null
                                )
                              }
                              className="h-3.5 w-3.5"
                            />
                            Approved
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={info.fulfillable === true}
                              onChange={(e) =>
                                handleBaseInfoFieldChange(
                                  index,
                                  'fulfillable',
                                  e.target.checked ? true : null
                                )
                              }
                              className="h-3.5 w-3.5"
                            />
                            Fulfillable
                          </label>
                        </div>
                        {info.exact_text && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Exact Text (read-only)
                            </Label>
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded border">
                              {info.exact_text}
                            </div>
                          </div>
                        )}
                        {info.source_file && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Source File (read-only)
                            </Label>
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded border">
                              {info.source_file}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            onClick={() => setEditingBaseInfoIndex(null)}
                            className="h-7 text-xs"
                          >
                            Done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveBaseInfo(index)}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                          >
                            <XIcon className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="space-y-2 cursor-pointer"
                        onClick={() => setEditingBaseInfoIndex(index)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground mb-1">
                              {info.field_name || 'Unnamed Field'}
                            </div>
                            {info.value && (
                              <div className="text-sm text-foreground break-words mb-1">
                                {info.value}
                              </div>
                            )}
                            {info.note && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                Note: {info.note}
                              </div>
                            )}
                            {info.exact_text && (
                              <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded border">
                                "{info.exact_text}"
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {info.approved && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
                                Approved
                              </span>
                            )}
                            {info.fulfillable && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium">
                                Fulfillable
                              </span>
                            )}
                          </div>
                        </div>
                        {info.source_file && (
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            Source: {info.source_file}
                          </div>
                        )}
                        <div className="pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBaseInfoIndex(index);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Metadata (read-only) */}
        <Card className="p-4">
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </Label>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Tender ID: </span>
                <span className="font-mono text-xs">{tender.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Created: </span>
                <span>{new Date(tender.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Updated: </span>
                <span>{new Date(tender.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
