import { useState, useEffect } from "react";
import { X, ExternalLink, Save, Edit2, Check, X as XIcon, Eye, FileText, ClipboardList, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import { useUpdateTender, useDeleteTender } from "@/hooks/use-tenders";
import { statusLabels, statusBoardColors } from "@/utils/status-labels";
import type { Tender, TenderReviewStatus, BaseInformation } from "@/services/api/api";
import { cn } from "@/lib/utils";
import { TENDER_STATUSES } from "@/lib/types";

interface TenderSidecardProps {
  tender: Tender;
  onClose: () => void;
}

export function TenderSidecard({ tender, onClose }: TenderSidecardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const updateTender = useUpdateTender();
  const deleteTender = useDeleteTender();

  // Form state
  const [title, setTitle] = useState(tender.title);
  const [description, setDescription] = useState(tender.description);
  const [status, setStatus] = useState<TenderReviewStatus>(tender.status);
  const [baseInformation, setBaseInformation] = useState<BaseInformation[]>(
    tender.base_information || []
  );

  // Edit mode state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingBaseInfo, setIsEditingBaseInfo] = useState(false);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Update local state when tender prop changes
  useEffect(() => {
    setTitle(tender.title);
    setDescription(tender.description);
    setStatus(tender.status);
    setBaseInformation(tender.base_information || []);
    setHasChanges(false);
  }, [tender]);

  // Check for changes
  useEffect(() => {
    const hasTitleChange = title !== tender.title;
    const hasDescriptionChange = description !== tender.description;
    const hasStatusChange = status !== tender.status;
    const hasBaseInfoChange = JSON.stringify(baseInformation) !== JSON.stringify(tender.base_information || []);
    
    setHasChanges(hasTitleChange || hasDescriptionChange || hasStatusChange || hasBaseInfoChange);
  }, [title, description, status, baseInformation, tender]);

  const handleOpenDetailPage = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tender.id}`);
    } else {
      navigate(`/tenders/${tender.id}`);
    }
  };

  const handleOpenView = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tender.id}/view`);
    } else {
      navigate(`/tenders/${tender.id}/view`);
    }
  };

  const handleOpenRequirements = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tender.id}/requirements`);
    } else {
      navigate(`/tenders/${tender.id}/requirements`);
    }
  };

  const handleOpenBaseInfoReview = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tender.id}/view`);
    } else {
      navigate(`/tenders/${tender.id}/view`);
    }
  };

  const handleDelete = () => {
    deleteTender.mutate(tender.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTender.mutateAsync({
        id: tender.id,
        data: {
          title: title !== tender.title ? title : undefined,
          description: description !== tender.description ? description : undefined,
          status: status !== tender.status ? status : undefined,
          base_information: JSON.stringify(baseInformation) !== JSON.stringify(tender.base_information || [])
            ? baseInformation
            : undefined,
        },
      });
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setIsEditingBaseInfo(false);
    } catch (error) {
      console.error("Failed to save tender:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(tender.title);
    setDescription(tender.description);
    setStatus(tender.status);
    setBaseInformation(tender.base_information || []);
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setIsEditingBaseInfo(false);
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
        field_name: "",
        value: null,
        source_file: null,
        source_file_id: null,
        exact_text: null,
        approved: null,
        note: null,
        fulfillable: null,
      },
    ]);
    setIsEditingBaseInfo(true);
  };

  const statusColor = statusBoardColors[status];
  const statusLabel = statusLabels[status];

  // Central fields that should be displayed as header
  const CENTRAL_FIELDS = ['type', 'client', 'questions_deadline', 'submission_deadline'];
  
  const isCentralField = (fieldName: string | null) => {
    if (!fieldName) return false;
    return CENTRAL_FIELDS.some(central => 
      fieldName.toLowerCase().includes(central.toLowerCase())
    );
  };

  const getCentralFields = () => {
    return baseInformation.filter(info => isCentralField(info.field_name));
  };

  const getOtherFields = () => {
    return baseInformation.filter(info => !isCentralField(info.field_name));
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsEditingTitle(false);
                  }
                  if (e.key === "Escape") {
                    setTitle(tender.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="flex-1 h-8 text-sm font-semibold"
                autoFocus
              />
            </div>
          ) : (
            <h2
              className="text-lg font-semibold truncate flex-1 cursor-text hover:bg-muted/50 px-2 py-1 -mx-2 -my-1"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
            >
              {title || "Untitled Tender"}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasChanges && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 w-8 flex-shrink-0"
              aria-label="Save changes"
              title="Save changes"
            >
              <Save className={cn("h-4 w-4", isSaving && "animate-spin")} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenView}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Open tender view"
            title="Open view"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenRequirements}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Open requirements"
            title="Open requirements"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenDetailPage}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Open tender detail page"
            title="Open in full page"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive"
            aria-label="Delete tender"
            title="Delete tender"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 flex-shrink-0"
            aria-label="Close sidecard"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-8 text-sm"
                >
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(${statusColor}))` }}
                  />
                  <span className="flex-1 text-left">{statusLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] bg-popover">
                {TENDER_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={async () => {
                      if (s !== tender.status) {
                        setStatus(s);
                        try {
                          await updateTender.mutateAsync({
                            id: tender.id,
                            data: { status: s },
                          });
                        } catch (error) {
                          console.error("Failed to update status:", error);
                          // Revert on error
                          setStatus(tender.status);
                        }
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="h-2.5 w-2.5 flex-shrink-0"
                      style={{
                        backgroundColor: `hsl(var(${statusBoardColors[s]}))`,
                      }}
                    />
                    <span>{statusLabels[s]}</span>
                    {status === s && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </Label>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDescription(true)}
                  className="h-6 px-2 text-xs"
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
                  className="min-h-[80px] resize-none text-sm"
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
                className="text-sm text-foreground whitespace-pre-wrap break-words p-2 border border-transparent hover:border-border cursor-text min-h-[40px]"
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

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Base Information */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Base Information
              </Label>
              <div className="flex items-center gap-1">
                {!isEditingBaseInfo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingBaseInfo(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {isEditingBaseInfo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddBaseInfo}
                    className="h-6 px-2 text-xs"
                  >
                    + Add
                  </Button>
                )}
              </div>
            </div>
            {baseInformation.length === 0 ? (
              <div className="text-xs text-muted-foreground italic p-2 border border-dashed">
                No base information. Click "Edit" to add a field.
              </div>
            ) : isEditingBaseInfo ? (
              <div className="space-y-4">
                {/* Central Fields in Edit Mode */}
                {getCentralFields().length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Central Information
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {getCentralFields().map((info) => {
                        const originalIndex = baseInformation.findIndex(
                          item => item === info
                        );
                        return (
                          <div
                            key={originalIndex}
                            className="p-3 border border-primary bg-muted/30 space-y-2"
                          >
                            <div className="space-y-1">
                              <Label className="text-xs">Field Name</Label>
                              <Input
                                value={info.field_name || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "field_name",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., submission_deadline"
                                className="h-7 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={info.value || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "value",
                                    e.target.value || null
                                  )
                                }
                                placeholder="Enter value..."
                                className="h-7 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Textarea
                                value={info.note || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "note",
                                    e.target.value || null
                                  )
                                }
                                placeholder="Add a note..."
                                className="min-h-[50px] resize-none text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={info.approved === true}
                                  onChange={(e) =>
                                    handleBaseInfoFieldChange(
                                      originalIndex,
                                      "approved",
                                      e.target.checked ? true : null
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                Approved
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={info.fulfillable === true}
                                  onChange={(e) =>
                                    handleBaseInfoFieldChange(
                                      originalIndex,
                                      "fulfillable",
                                      e.target.checked ? true : null
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                Fulfillable
                              </label>
                            </div>
                            {info.exact_text && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Exact Text (read-only)
                                </Label>
                                <div className="text-xs text-muted-foreground p-1.5 bg-muted border">
                                  {info.exact_text}
                                </div>
                              </div>
                            )}
                            {info.source_file && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Source File (read-only)
                                </Label>
                                <div className="text-xs text-muted-foreground p-1.5 bg-muted border">
                                  {info.source_file}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-end pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setBaseInformation(baseInformation.filter((_, i) => i !== originalIndex));
                                }}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                <XIcon className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Separator between central and other fields in edit mode */}
                {getCentralFields().length > 0 && getOtherFields().length > 0 && (
                  <div className="border-t border-border" />
                )}

                {/* Other Fields in Edit Mode */}
                {getOtherFields().length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Additional Information
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {getOtherFields().map((info) => {
                        const originalIndex = baseInformation.findIndex(
                          item => item === info
                        );
                        return (
                          <div
                            key={originalIndex}
                            className="p-3 border border-border bg-card space-y-2"
                          >
                            <div className="space-y-1">
                              <Label className="text-xs">Field Name</Label>
                              <Input
                                value={info.field_name || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "field_name",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., submission_deadline"
                                className="h-7 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={info.value || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "value",
                                    e.target.value || null
                                  )
                                }
                                placeholder="Enter value..."
                                className="h-7 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Textarea
                                value={info.note || ""}
                                onChange={(e) =>
                                  handleBaseInfoFieldChange(
                                    originalIndex,
                                    "note",
                                    e.target.value || null
                                  )
                                }
                                placeholder="Add a note..."
                                className="min-h-[50px] resize-none text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={info.approved === true}
                                  onChange={(e) =>
                                    handleBaseInfoFieldChange(
                                      originalIndex,
                                      "approved",
                                      e.target.checked ? true : null
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                Approved
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={info.fulfillable === true}
                                  onChange={(e) =>
                                    handleBaseInfoFieldChange(
                                      originalIndex,
                                      "fulfillable",
                                      e.target.checked ? true : null
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                Fulfillable
                              </label>
                            </div>
                            {info.exact_text && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Exact Text (read-only)
                                </Label>
                                <div className="text-xs text-muted-foreground p-1.5 bg-muted border">
                                  {info.exact_text}
                                </div>
                              </div>
                            )}
                            {info.source_file && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Source File (read-only)
                                </Label>
                                <div className="text-xs text-muted-foreground p-1.5 bg-muted border">
                                  {info.source_file}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-end pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setBaseInformation(baseInformation.filter((_, i) => i !== originalIndex));
                                }}
                                className="h-7 text-xs text-destructive hover:text-destructive"
                              >
                                <XIcon className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    onClick={() => setIsEditingBaseInfo(false)}
                    className="h-7 text-xs"
                  >
                    Done Editing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Central Fields Header */}
                {getCentralFields().length > 0 && (
                  <div className="grid grid-cols-2 border border-border">
                    {getCentralFields().map((info, idx) => {
                      const originalIndex = baseInformation.findIndex(
                        item => item === info
                      );
                      const isRightColumn = idx % 2 === 1; // odd indices are right column
                      const totalItems = getCentralFields().length;
                      const hasItemBelow = idx + 2 < totalItems;
                      return (
                        <div
                          key={originalIndex}
                          className={cn(
                            "p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors border-r border-b border-border",
                            isRightColumn && "border-r-0",
                            !hasItemBelow && "border-b-0"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {info.field_name || "Unnamed Field"}
                            </div>
                            {info.value && (
                              <div className="text-base font-semibold text-foreground">
                                {info.value}
                              </div>
                            )}
                            {!info.value && (
                              <div className="text-sm text-muted-foreground italic">
                                No value
                              </div>
                            )}
                            {info.note && (
                              <div className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                {info.note}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              {info.approved && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
                                  ✓ Approved
                                </span>
                              )}
                              {info.fulfillable && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium">
                                  ⚡ Fulfillable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Separator between central and other fields */}
                {getCentralFields().length > 0 && getOtherFields().length > 0 && (
                  <div className="border-t border-border" />
                )}

                {/* Other Fields Grid */}
                {getOtherFields().length > 0 && (
                  <div className="grid grid-cols-2 border border-border">
                    {getOtherFields().map((info, idx) => {
                      const originalIndex = baseInformation.findIndex(
                        item => item === info
                      );
                      const isRightColumn = idx % 2 === 1; // odd indices are right column
                      const totalItems = getOtherFields().length;
                      const hasItemBelow = idx + 2 < totalItems;
                      return (
                        <div
                          key={originalIndex}
                          className={cn(
                            "p-2.5 bg-card hover:bg-muted/50 transition-colors border-r border-b border-border",
                            isRightColumn && "border-r-0",
                            !hasItemBelow && "border-b-0"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-foreground">
                              {info.field_name || "Unnamed Field"}
                            </div>
                            {info.value && (
                              <div className="text-sm text-foreground break-words font-medium">
                                {info.value}
                              </div>
                            )}
                            {info.note && (
                              <div className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
                                {info.note}
                              </div>
                            )}
                            {info.source_file && (
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                Source: {info.source_file}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              {info.approved && (
                                <span className="text-xs px-1 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400">
                                  ✓
                                </span>
                              )}
                              {info.fulfillable && (
                                <span className="text-xs px-1 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                  ⚡
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {baseInformation.length === 0 && (
                  <div className="text-xs text-muted-foreground italic p-2 border border-dashed">
                    No base information. Click "Edit" to add a field.
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenBaseInfoReview}
                className="flex-1 justify-center gap-2 h-8 text-xs bg-black text-white hover:bg-black/80"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Review Base Information
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenRequirements}
                className="flex-1 justify-center gap-2 h-8 text-xs bg-black text-white hover:bg-black/80"
              >
                <Search className="h-3.5 w-3.5" />
                Extract Requirements
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Save/Cancel footer when there are changes */}
      {hasChanges && (
        <div className="flex-shrink-0 border-t px-3 py-2 flex items-center justify-end gap-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 text-xs"
          >
            {isSaving ? (
              <>
                <Save className="h-3 w-3 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tender</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{tender.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteTender.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTender.isPending}
            >
              {deleteTender.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
