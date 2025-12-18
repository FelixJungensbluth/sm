import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FolderTree, Table, FileText } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { useTenderById } from "@/hooks/use-tenders";
import { useTenderDocuments } from "@/hooks/use-documents";
import { useRequirementsForTender } from "@/hooks/use-requirements";
import RequirementsViewer from "@/components/requirements/requirements-viewer/requirements-viewer";
import RequirementsTableView from "@/components/requirements/requirements-table";
import type { Requirement } from "@/services/api/api";
import { FileTree } from "@/components/file-tree/FileTree";
import RequirementCard from "@/components/requirements/requirement-card";

export function RequirementsExtraction() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const { data: tender } = useTenderById(tenderId);
  const { data: documents = [] } = useTenderDocuments(tenderId);
  const { data: requirements = [] } = useRequirementsForTender(tenderId || "");

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentRequirement, setCurrentRequirement] = useState<Requirement>();
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"markdown" | "table">("markdown");

  useEffect(() => {
    if (documents.length > 0 && !selectedFileId) {
      setSelectedFileId(documents[0].id);
    }
  }, [documents, selectedFileId]);

  useEffect(() => {
    if (currentRequirement && documents.length > 0) {
      const requirementFile = documents.find(
        (doc) => doc.name === currentRequirement.file
      );
      if (requirementFile && requirementFile.id !== selectedFileId) {
        setSelectedFileId(requirementFile.id);
      }
    }
  }, [currentRequirement, documents, selectedFileId]);

  if (!tender) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Tender not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-lg font-semibold">{tender.title}</h1>
        </div>

        <div className="flex items-center gap-2 px-5">
        {viewMode === "markdown" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFileTreeOpen(!isFileTreeOpen)}
              className="h-8 w-8"
              aria-label="Toggle file tree"
            >
              <FolderTree className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === "markdown" ? "table" : "markdown")}
            aria-label={viewMode === "markdown" ? "Switch to table view" : "Switch to requirements viewer"}
          >
            {viewMode === "markdown" ? (
              <Table className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex">
        {viewMode === "markdown" && (
          <div className="w-[35%] min-w-0 min-h-0 overflow-hidden">
            <div className="h-full border-r bg-muted/30 overflow-y-auto">
              <div className="space-y-3">
                <div>
                  {(() => {
                    const selectedIndex = currentRequirement
                      ? requirements.findIndex(
                          (req) => req.id === currentRequirement.id
                        )
                      : -1;
                    return requirements.map((requirement, index) => (
                      <RequirementCard
                        key={requirement.id}
                        requirement={requirement}
                        index={index}
                        onSelect={(index) =>
                          setCurrentRequirement(requirements[index])
                        }
                        isSelected={selectedIndex === index}
                      />
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`${viewMode === "table" ? "flex-1" : isFileTreeOpen ? "w-[50%]" : "w-[65%]"} min-w-0 min-h-0 overflow-hidden`}>
          <div className="h-full overflow-hidden bg-background">
            {viewMode === "table" ? (
              <div className="h-full overflow-auto">
                <RequirementsTableView
                  requirements={requirements}
                  currentRequirement={currentRequirement}
                  onRequirementDelete={(id) => {
                    // TODO: Implement delete functionality
                  }}
                  onRequirementDeletePermanent={(id) => {
                    // TODO: Implement permanent delete functionality
                  }}
                  onRequirementRestore={(id) => {
                    // TODO: Implement restore functionality
                  }}
                  onRequirementDetail={(requirement) => {
                    setCurrentRequirement(requirement);
                  }}
                  onStatusUpdate={(id, status) => {
                    // TODO: Implement status update functionality
                  }}
                />
              </div>
            ) : (
              (() => {
                if (!selectedFileId || documents.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-muted-foreground">
                        {documents.length === 0
                          ? "No documents available"
                          : "Select a document"}
                      </div>
                    </div>
                  );
                }
                const selectedFile = documents.find(
                  (doc) => doc.id === selectedFileId
                );
                return selectedFile ? (
                  <RequirementsViewer
                    key={selectedFileId}
                    document={selectedFile}
                    requirements={requirements}
                    selectedRequirement={currentRequirement}
                    onRequirementSelect={(requirement) => setCurrentRequirement(requirement)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-muted-foreground">
                      Document not found
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {viewMode === "markdown" && isFileTreeOpen && (
          <div className="w-[15%] min-w-0 min-h-0 overflow-hidden">
            <div className="h-full border-l bg-muted/30 overflow-y-auto">
              <FileTree
                documents={documents}
                selectedFileId={selectedFileId}
                onSelectFile={setSelectedFileId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

