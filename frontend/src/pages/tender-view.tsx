import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FolderTree } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { PanelGroup, Panel } from "react-resizable-panels";
import { useTenderById } from "@/hooks/use-tenders";
import { useTenderDocuments } from "@/hooks/use-documents";
import BaseInformationViewer from "@/components/base-information/base-information-viewer";
import type { BaseInformation } from "@/services/api/api";
import { FileTree } from "@/components/file-tree/FileTree";
import BaseInformationCard from "@/components/base-information/base-information-card";
import ResizeHandler from "@/components/panels/resize-handler";

export function TenderView() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const { data: tender } = useTenderById(tenderId);
  const { data: documents = [] } = useTenderDocuments(tenderId);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentBaseInfo, setCurrentBaseInfo] = useState<BaseInformation>();
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);

  useEffect(() => {
    if (documents.length > 0 && !selectedFileId) {
      setSelectedFileId(documents[0].id);
    }
  }, [documents, selectedFileId]);

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

        <div className="flex items-center gap-2 px-6">
          <FolderTree
            className="h-4 w-4"
            onClick={() => setIsFileTreeOpen(!isFileTreeOpen)}
          />
        </div>
      </div>

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel
          id="base-information"
          defaultSize={35}
          minSize={15}
          className="min-w-0 min-h-0 overflow-hidden"
        >
          <div className="h-full border-r bg-muted/30 overflow-y-auto">
            <div className="space-y-3">
              <h2 className="p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
                Base Information
              </h2>
              <div>
                {(() => {
                  const selectedIndex = currentBaseInfo
                    ? tender.base_information.findIndex(
                        (bi) =>
                          bi.field_name === currentBaseInfo.field_name &&
                          bi.value === currentBaseInfo.value
                      )
                    : -1;
                  return tender.base_information.map((info, index) => {
                    if (info.field_name === "compact_description") {
                      return null;
                    }

                    return (
                      <BaseInformationCard
                        key={index}
                        baseInformation={info}
                        index={index}
                        onSelect={(index) =>
                          setCurrentBaseInfo(tender.base_information[index])
                        }
                        isSelected={selectedIndex === index}
                        tenderId={tender.id}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </Panel>

        <ResizeHandler id="handle-base-markdown" />

        {/* Center - Markdown Viewer */}
        <Panel
          id="markdown-viewer"
          defaultSize={isFileTreeOpen ? 50 : 75}
          minSize={50}
          className="min-w-0 min-h-0 overflow-hidden"
        >
          <div className="h-full overflow-hidden bg-background">
            {(() => {
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
                <BaseInformationViewer
                  key={selectedFileId}
                  document={selectedFile}
                  searchQuery={currentBaseInfo?.exact_text ?? null}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-muted-foreground">
                    Document not found
                  </div>
                </div>
              );
            })()}
          </div>
        </Panel>

        {isFileTreeOpen && (
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
