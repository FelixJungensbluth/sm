import { useState, useEffect } from "react";
import { X, ExternalLink, Save, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUpdateTender, useDeleteTender } from "@/hooks/use-tenders";
import { statusLabels, statusBoardColors } from "@/utils/status-labels";
import type { Tender, TenderReviewStatus, ExtractedData } from "@/services/api/api";
import { TENDER_STATUSES } from "@/lib/types";
import { useTenderNavigation } from "@/lib/navigation-helpers";
import { toast } from "sonner";
import { StatusDropdown } from "@/components/shared/StatusDropdown";
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog";
import { EditableTitle } from "@/components/shared/EditableTitle";
import { EditableDescription } from "@/components/shared/EditableDescription";
import { BaseInformationEditor } from "@/components/shared/BaseInformationEditor";
import { BaseInformationCardList } from "@/components/shared/BaseInformationCardList";
import { BaseInformationGrid } from "@/components/shared/BaseInformationGrid";
import { TenderActionButtons } from "@/components/shared/TenderActionButtons";
import { SaveCancelFooter } from "@/components/shared/SaveCancelFooter";

interface TenderSidecardProps {
  tender: Tender;
  onClose: () => void;
}

export function TenderSidecard({ tender, onClose }: TenderSidecardProps) {
  const updateTender = useUpdateTender();
  const deleteTender = useDeleteTender();
  const { navigateToTenderDetail, navigateToTenderView, navigateToTenderRequirements } = useTenderNavigation();

  // Form state
  const [title, setTitle] = useState(tender.title);
  const [description, setDescription] = useState(tender.description);
  const [status, setStatus] = useState<TenderReviewStatus>(tender.status);
  const [baseInformation, setBaseInformation] = useState<ExtractedData[]>(
    tender.base_information || []
  );
  const [exclusionCriteria, setExclusionCriteria] = useState<ExtractedData[]>(
    tender.exclusion_criteria || []
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
    setExclusionCriteria(tender.exclusion_criteria || []);
    setHasChanges(false);
  }, [tender]);

  // Check for changes
  useEffect(() => {
    const hasTitleChange = title !== tender.title;
    const hasDescriptionChange = description !== tender.description;
    const hasStatusChange = status !== tender.status;
    const hasBaseInfoChange = JSON.stringify(baseInformation) !== JSON.stringify(tender.base_information || []);
    const hasExclusionCriteriaChange = JSON.stringify(exclusionCriteria) !== JSON.stringify(tender.exclusion_criteria || []);
    
    setHasChanges(hasTitleChange || hasDescriptionChange || hasStatusChange || hasBaseInfoChange || hasExclusionCriteriaChange);
  }, [title, description, status, baseInformation, tender]);

  const handleOpenDetailPage = () => {
    navigateToTenderDetail(tender.id);
  };

  const handleOpenRequirements = () => {
    navigateToTenderRequirements(tender.id);
  };

  const handleOpenBaseInfoReview = () => {
    navigateToTenderView(tender.id);
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
          exclusion_criteria: JSON.stringify(exclusionCriteria) !== JSON.stringify(tender.exclusion_criteria || [])
            ? exclusionCriteria
            : undefined,
        },
      });
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setIsEditingBaseInfo(false);
      toast.success('Tender saved successfully');
    } catch (error) {
      toast.error("Failed to save tender");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(tender.title);
    setDescription(tender.description);
    setStatus(tender.status);
    setBaseInformation(tender.base_information || []);
    setExclusionCriteria(tender.exclusion_criteria || []);
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setIsEditingBaseInfo(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus !== tender.status) {
      setStatus(newStatus as TenderReviewStatus);
      try {
        await updateTender.mutateAsync({
          id: tender.id,
          data: { status: newStatus as TenderReviewStatus },
        });
        toast.success('Status updated');
      } catch (error) {
        toast.error("Failed to update status");
        // Revert on error
        setStatus(tender.status);
        throw error;
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <EditableTitle
            value={title}
            onChange={setTitle}
            placeholder="Untitled Tender"
            originalValue={tender.title}
            isEditing={isEditingTitle}
            onEditChange={setIsEditingTitle}
            className="text-lg font-semibold truncate flex-1"
          />
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
          {/* Status and Action Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </Label>
            <div className="flex items-center gap-2">
              <StatusDropdown
                value={status}
                onChange={handleStatusChange}
                statuses={TENDER_STATUSES}
                statusLabels={statusLabels}
                statusColors={statusBoardColors}
                className="bg-popover"
              />
              <TenderActionButtons
                tenderId={tender.id}
                onReviewBaseInfo={handleOpenBaseInfoReview}
                onExtractRequirements={handleOpenRequirements}
                variant="full"
              />
            </div>
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
                    onClick={() => {
                      const newField: ExtractedData = {
                        field_name: "",
                        value: null,
                        source_file: null,
                        source_file_id: null,
                        exact_text: null,
                        note: null,
                        fulfillable: null,
                        status: "pending",
                      };
                      setBaseInformation([...baseInformation, newField]);
                      setIsEditingBaseInfo(true);
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    + Add
                  </Button>
                )}
              </div>
            </div>
            {!isEditingBaseInfo ? (
              <BaseInformationCardList
                baseInformation={baseInformation}
                excludeFields={["compact_description"]}
              />
            ) : (
              <BaseInformationEditor
                baseInformation={baseInformation}
                onChange={setBaseInformation}
                editingIndex={null}
                onEditIndexChange={() => {}}
                variant="compact"
                isEditingMode={isEditingBaseInfo}
                onEditingModeChange={setIsEditingBaseInfo}
              />
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Description */}
          <EditableDescription
            value={description}
            onChange={setDescription}
            originalValue={tender.description}
            isEditing={isEditingDescription}
            onEditChange={setIsEditingDescription}
            minHeight="80px"
          />

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Exclusion Criteria */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Exclusion Criteria
            </Label>
            <BaseInformationGrid
              baseInformation={exclusionCriteria}
              emptyMessage="No exclusion criteria available."
            />
          </div>
        </div>
      </div>

      {/* Save/Cancel footer when there are changes */}
      <SaveCancelFooter
        hasChanges={hasChanges}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Tender"
        description={`Are you sure you want to delete "${tender.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isPending={deleteTender.isPending}
      />
    </div>
  );
}
