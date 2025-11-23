import type { Requirement } from "@/services/api/api";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { FileTree } from "../file-tree/FileTree";
import { RequirementHoverOverlay } from "./requirements-viewer/requirements-overlay";
import RequirementsViewer from "./requirements-viewer/requirements-viewer";
import {type Document } from "@/services/api/api";

interface ReviewProps {
  shouldShowStart: boolean;
  requirements: Requirement[];
  documents: Document[];
  unprocessedFiles: Document[];
  showFileTree: boolean;
  showTrash: boolean;
}

interface HoverOverlayState {
  requirement: Requirement;
  x: number;
  y: number;
}

export default function RequirementsExtractionReview({
  shouldShowStart,
  requirements,
  documents,
  showFileTree,
  showTrash,
}: ReviewProps) {
  const [currentFile, setCurrentFile] = useState<Document | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showRequirementDetail, setShowRequirementDetail] = useState(false);
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [hoverOverlay, setHoverOverlay] = useState<HoverOverlayState | null>(
    null
  );

  const requirementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const requirementsListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setShowStart(shouldShowStart);

    if (documents.length && !currentFile) setCurrentFile(documents[0] as Document);
  }, [documents, currentFile, requirements.length, shouldShowStart]);

  const handleFileSelect = (fileName: string) => {
    const f = documents.find((file) => file.name === fileName);
    if (f) {
      setCurrentFile(f);
    }
  };

  const scrollToRequirement = (id: string) => {
    const el = requirementRefs.current[id];
    const list = requirementsListRef.current;
    if (el && list) {
      const containerRect = list.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const top =
        list.scrollTop +
        (elRect.top - containerRect.top) -
        containerRect.height / 2 +
        elRect.height / 2;
      list.scrollTo({ top, behavior: "instant" });
    }
  };

  const handleRequirementClick = useCallback(
    (req: Requirement) => {
      if (currentFile?.name !== req.file) {
        const nf = documents.find((f) => f.name === req.file);
        if (nf) setCurrentFile(nf);
      }
    },
    [currentFile, documents]
  );

  const handleRequirementClickFromViewer = useCallback(
    (req: Requirement) => {
      if (currentFile?.name !== req.file) {
        const nf = documents.find((f) => f.name === req.file);
        if (nf) setCurrentFile(nf);
      }
      setTimeout(() => scrollToRequirement(req.id), 100);
    },
    [currentFile, documents]
  );

  const sortedRequirements = [...requirements].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const handleRequirementHover = (
    req: Requirement | null,
    x?: number,
    y?: number
  ) => {
    if (req && x !== undefined && y !== undefined)
      setHoverOverlay({ requirement: req, x, y });
    else setHoverOverlay(null);
  };

  const handleRequirementDetailClick = useCallback(
    (req: Requirement) => {
      if (currentFile?.name !== req.file) {
        const nf = documents.find((f) => f.name === req.file);
        if (nf) setCurrentFile(nf);
      }
      setShowRequirementDetail(true);
    },
    [currentFile, documents]
  );

  useEffect(() => {
    if (
      showRequirementDetail &&
      !isAddingRequirement &&
      !showStart
    ) {
    }
  }, [showRequirementDetail, isAddingRequirement, showStart]);

  return (
    <div className="flex flex-col h-full w-full">
      {currentFile ? (
        <div className="flex-1 overflow-hidden pb-2">
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={50} minSize={30} className="overflow-hidden">
              <div
                ref={requirementsListRef}
                className="px-3 pt-4 overflow-y-auto flex-1 space-y-4"
              >
                {sortedRequirements.map((req) => (
                  <div
                    key={req.id}
                    ref={(el) => {
                      requirementRefs.current[req.id] = el;
                    }}
                  >
                    <div>
                      {req.name}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 transition-colors duration-200 mx-2" />
            <Panel defaultSize={showFileTree ? 35 : 50} minSize={25}>
              <div className="h-full flex flex-col overflow-hidden">
                <RequirementsViewer
                  document={currentFile}
                  requirements={showTrash ? [] : requirements}
                  selectedRequirement={hoverOverlay?.requirement}
                />
              </div>
            </Panel>
            {showFileTree && (
              <div className="h-full border ml-2 overflow-hidden">
                <FileTree
                  documents={documents}
                  onSelectFile={handleFileSelect}
                  selectedFileId={currentFile?.id}
                />
              </div>
            )}
          </PanelGroup>
          {hoverOverlay && (
            <RequirementHoverOverlay
              requirement={hoverOverlay.requirement}
              x={hoverOverlay.x}
              y={hoverOverlay.y}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Lade Datei...</p>
        </div>
      )}
    </div>
  );
}
