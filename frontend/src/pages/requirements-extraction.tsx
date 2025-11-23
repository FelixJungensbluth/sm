import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderTree, Table2, FileText } from "lucide-react";
import { PanelGroup, Panel } from "react-resizable-panels";
import { useTenderById } from "@/hooks/use-tenders";
import { useTenderDocuments } from "@/hooks/use-documents";
import { useRequirementsForTender } from "@/hooks/use-requirements";
import RequirementsViewer from "@/components/requirements/requirements-viewer/requirements-viewer";
import RequirementsTableView from "@/components/requirements/requirements-table";
import type { Requirement } from "@/services/api/api";
import { FileTree } from "@/components/file-tree/FileTree";
import RequirementCard from "@/components/requirements/requirement-card";
import ResizeHandler from "@/components/panels/resize-handler";

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
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-8 text-sm"
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Back
          </Button>
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
          <div className="flex items-center border">
            <Button
              variant={viewMode === "markdown" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("markdown")}
              className="h-8 w-8 border-r"
              aria-label="Markdown view"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("table")}
              className="h-8 w-8"
              aria-label="Table view"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
  
        </div>
      </div>

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {viewMode === "markdown" && (
          <>
            <Panel
              id="requirements"
              defaultSize={35}
              minSize={15}
              className="min-w-0 min-h-0 overflow-hidden"
            >
              <div className="h-full border-r bg-muted/30 overflow-y-auto">
                <div className="space-y-3">
                  <h2 className="p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
                    Requirements
                  </h2>
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
            </Panel>

            <ResizeHandler id="handle-requirements-markdown" />
          </>
        )}

        <Panel
          id="requirements-viewer"
          defaultSize={viewMode === "table" ? 100 : isFileTreeOpen ? 50 : 65}
          minSize={50}
          className="min-w-0 min-h-0 overflow-hidden"
        >
          <div className="h-full overflow-hidden bg-background">
            {viewMode === "table" ? (
              <div className="h-full overflow-auto">
                <RequirementsTableView
                  requirements={requirements}
                  currentRequirement={currentRequirement}
                  onRequirementDelete={(id) => {
                    // TODO: Implement delete functionality
                    console.log("Delete requirement:", id);
                  }}
                  onRequirementDeletePermanent={(id) => {
                    // TODO: Implement permanent delete functionality
                    console.log("Permanent delete requirement:", id);
                  }}
                  onRequirementRestore={(id) => {
                    // TODO: Implement restore functionality
                    console.log("Restore requirement:", id);
                  }}
                  onRequirementDetail={(requirement) => {
                    setCurrentRequirement(requirement);
                  }}
                  onStatusUpdate={(id, status) => {
                    // TODO: Implement status update functionality
                    console.log("Update requirement status:", id, status);
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
        </Panel>

        {viewMode === "markdown" && isFileTreeOpen && (
          <>
            <ResizeHandler id="handle-markdown-filetree" />
            <Panel
              id="file-tree"
              defaultSize={15}
              minSize={5}
              className="min-w-0 min-h-0 overflow-hidden"
            >
              <div className="h-full border-l bg-muted/30 overflow-y-auto">
                <FileTree
                  documents={documents}
                  selectedFileId={selectedFileId}
                  onSelectFile={setSelectedFileId}
                />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

