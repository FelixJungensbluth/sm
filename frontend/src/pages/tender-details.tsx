import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, Trash2 } from "lucide-react";
import { statusLabels, statusBoardColors } from "@/utils/status-labels";
import { useTenderById, useUpdateTender, useDeleteTender } from "@/hooks/use-tenders";
import type { ExtractedData } from "@/services/api/api";
import { TENDER_STATUSES, type TenderStatus } from "@/lib/types";
import { BackButton } from "@/components/shared/BackButton";
import { StatusDropdown } from "@/components/shared/StatusDropdown";
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog";
import { EditableTitle } from "@/components/shared/EditableTitle";
import { EditableDescription } from "@/components/shared/EditableDescription";
import { BaseInformationEditor } from "@/components/shared/BaseInformationEditor";
import { BaseInformationCardList } from "@/components/shared/BaseInformationCardList";
import { BaseInformationGrid } from "@/components/shared/BaseInformationGrid";
import { TenderActionButtons } from "@/components/shared/TenderActionButtons";

export function TenderDetail() {
  const { tenderId } = useParams<{
    tenderId?: string;
  }>();
  const navigate = useNavigate();

  const { data: tender, isLoading } = useTenderById(tenderId);
  const updateTender = useUpdateTender();
  const deleteTender = useDeleteTender();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TenderStatus>("In Prüfung");
  const [baseInformation, setBaseInformation] = useState<ExtractedData[]>([]);
  const [exclusionCriteria, setExclusionCriteria] = useState<ExtractedData[]>([]);

  // Edit mode state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingBaseInfoIndex, setEditingBaseInfoIndex] = useState<
    number | null
  >(null);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Update local state when tender data loads
  useEffect(() => {
    if (tender) {
      setTitle(tender.title);
      setDescription(tender.description);
      setStatus(tender.status);
      setBaseInformation(tender.base_information || []);
      setExclusionCriteria(tender.exclusion_criteria || []);
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
    const hasExclusionCriteriaChange =
      JSON.stringify(exclusionCriteria) !==
      JSON.stringify(tender.exclusion_criteria || []);

    setHasChanges(
      hasTitleChange ||
        hasDescriptionChange ||
        hasStatusChange ||
        hasBaseInfoChange ||
        hasExclusionCriteriaChange
    );
  }, [title, description, status, baseInformation, tender]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenView = () => {
    if (!tender) return;
    navigate(`/tenders/${tender.id}/view`);
  };

  const handleDelete = () => {
    if (!tender) return;
    deleteTender.mutate(tender.id, {
      onSuccess: () => {
        navigate("/tenders");
      },
    });
  };

  const handleOpenRequirements = () => {
    if (!tender) return;
    navigate(`/tenders/${tender.id}/requirements`);
  };

  const handleOpenBaseInfoReview = () => {
    if (!tender) return;
    navigate(`/tenders/${tender.id}/view`);
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
          exclusion_criteria:
            JSON.stringify(exclusionCriteria) !==
            JSON.stringify(tender.exclusion_criteria || [])
              ? exclusionCriteria
              : undefined,
        },
      });
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setEditingBaseInfoIndex(null);
      toast.success('Tender saved successfully');
    } catch (error) {
      toast.error("Failed to save tender");
      throw error;
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
    setExclusionCriteria(tender.exclusion_criteria || []);
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setEditingBaseInfoIndex(null);
  };

  const handleAddBaseInfo = () => {
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
    setEditingBaseInfoIndex(baseInformation.length);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-4 px-4">
        <BackButton onClick={handleBack} className="mb-4" />
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="container mx-auto max-w-4xl py-4 px-4">
        <BackButton onClick={handleBack} className="mb-4" />
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tender not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-4xl py-4 px-4">
        {/* Header with Back and Save */}
        <div className="flex items-center justify-between mb-4">
          <BackButton onClick={handleBack} />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleOpenView}
              className="h-8 text-sm"
            >
              <Eye className="h-3 w-3 mr-1.5" />
              View
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 text-sm text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Delete
            </Button>
            {hasChanges && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-8 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8 text-sm"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
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
                <EditableTitle
                  value={title}
                  onChange={setTitle}
                  placeholder="Untitled Tender"
                  originalValue={tender.title}
                  isEditing={isEditingTitle}
                  onEditChange={setIsEditingTitle}
                />
              </div>

              {/* Status and Action Buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <div className="flex items-center gap-2">
                  <StatusDropdown
                    value={status}
                    onChange={(newStatus) => setStatus(newStatus as TenderStatus)}
                    statuses={TENDER_STATUSES}
                    statusLabels={statusLabels}
                    statusColors={statusBoardColors}
                  />
                  <TenderActionButtons
                    tenderId={tender.id}
                    onReviewBaseInfo={handleOpenBaseInfoReview}
                    onExtractRequirements={handleOpenRequirements}
                    variant="full"
                  />
                </div>
              </div>
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
              {editingBaseInfoIndex === null ? (
                <BaseInformationCardList
                  baseInformation={baseInformation}
                  excludeFields={["compact_description"]}
                />
              ) : (
                <BaseInformationEditor
                  baseInformation={baseInformation}
                  onChange={setBaseInformation}
                  editingIndex={editingBaseInfoIndex}
                  onEditIndexChange={setEditingBaseInfoIndex}
                  variant="full"
                />
              )}
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4">
            <EditableDescription
              value={description}
              onChange={setDescription}
              originalValue={tender.description}
              isEditing={isEditingDescription}
              onEditChange={setIsEditingDescription}
            />
          </Card>

          {/* Exclusion Criteria */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Exclusion Criteria
              </Label>
              <BaseInformationGrid
                baseInformation={exclusionCriteria}
                emptyMessage="No exclusion criteria available."
              />
            </div>
          </Card>
        </div>
      </div>

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
