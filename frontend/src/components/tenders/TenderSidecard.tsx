import { useState, useEffect } from "react";
import { X, ExternalLink, Save, Edit2, Check, X as XIcon } from "lucide-react";
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
import { useNavigate, useParams } from "react-router-dom";
import { useUpdateTender } from "@/hooks/tenders/use-tenders";
import { statusLabels, statusBoardColors } from "@/utils/status-labels";
import type { Tender, TenderStatus, BaseInformation } from "@/services/api/api";
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

  // Form state
  const [title, setTitle] = useState(tender.title);
  const [description, setDescription] = useState(tender.description);
  const [status, setStatus] = useState<TenderStatus>(tender.status);
  const [baseInformation, setBaseInformation] = useState<BaseInformation[]>(
    tender.base_information || []
  );

  // Edit mode state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingBaseInfoIndex, setEditingBaseInfoIndex] = useState<number | null>(null);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      setEditingBaseInfoIndex(null);
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
    setEditingBaseInfoIndex(baseInformation.length);
  };

  const handleRemoveBaseInfo = (index: number) => {
    setBaseInformation(baseInformation.filter((_, i) => i !== index));
    if (editingBaseInfoIndex === index) {
      setEditingBaseInfoIndex(null);
    }
  };

  const statusColor = statusBoardColors[status];
  const statusLabel = statusLabels[status];

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
              className="text-lg font-semibold truncate flex-1 cursor-text hover:bg-muted/50 px-2 py-1 -mx-2 -my-1 rounded"
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
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
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
                    {status === s && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
                className="text-sm text-foreground whitespace-pre-wrap break-words p-2 rounded-md border border-transparent hover:border-border cursor-text min-h-[40px]"
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

          {/* Base Information */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Base Information
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddBaseInfo}
                className="h-6 px-2 text-xs"
              >
                + Add
              </Button>
            </div>
            {baseInformation.length === 0 ? (
              <div className="text-xs text-muted-foreground italic p-2 rounded-md border border-dashed">
                No base information. Click "Add" to add a field.
              </div>
            ) : (
              <div className="space-y-2">
                {baseInformation.map((info, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded-md border",
                      editingBaseInfoIndex === index
                        ? "border-primary bg-muted/30"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {editingBaseInfoIndex === index ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Field Name</Label>
                          <Input
                            value={info.field_name || ""}
                            onChange={(e) =>
                              handleBaseInfoFieldChange(
                                index,
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
                                index,
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
                                index,
                                "note",
                                e.target.value || null
                              )
                            }
                            placeholder="Add a note..."
                            className="min-h-[50px] resize-none text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={info.approved === true}
                              onChange={(e) =>
                                handleBaseInfoFieldChange(
                                  index,
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
                                  index,
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
                            <div className="text-xs text-muted-foreground p-1.5 bg-muted rounded border">
                              {info.exact_text}
                            </div>
                          </div>
                        )}
                        {info.source_file && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Source File (read-only)
                            </Label>
                            <div className="text-xs text-muted-foreground p-1.5 bg-muted rounded border">
                              {info.source_file}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
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
                        className="space-y-1.5 cursor-pointer"
                        onClick={() => setEditingBaseInfoIndex(index)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-muted-foreground mb-0.5">
                              {info.field_name || "Unnamed Field"}
                            </div>
                            {info.value && (
                              <div className="text-sm text-foreground break-words">
                                {info.value}
                              </div>
                            )}
                            {info.note && (
                              <div className="text-xs text-muted-foreground mt-0.5 italic">
                                Note: {info.note}
                              </div>
                            )}
                            {info.exact_text && (
                              <div className="text-xs text-muted-foreground mt-0.5 p-1.5 bg-muted rounded border">
                                "{info.exact_text}"
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {info.approved && (
                              <span className="text-xs px-1 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400">
                                Approved
                              </span>
                            )}
                            {info.fulfillable && (
                              <span className="text-xs px-1 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                Fulfillable
                              </span>
                            )}
                          </div>
                        </div>
                        {info.source_file && (
                          <div className="text-xs text-muted-foreground">
                            Source: {info.source_file}
                          </div>
                        )}
                        <div className="pt-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBaseInfoIndex(index);
                            }}
                            className="h-6 px-2 text-xs"
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

          <div className="space-y-1.5 pt-3 border-t">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </Label>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono text-xs">{tender.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created: </span>
                <span>{new Date(tender.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Updated: </span>
                <span>{new Date(tender.updated_at).toLocaleString()}</span>
              </div>
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
    </div>
  );
}
