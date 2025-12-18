import MarkdownViewer from "@/components/markdown-viewer/markdown-viewer";
import { type Requirement, type Document } from "@/services/api/api.ts";
import Mark from "advanced-mark.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SelectionMenu, type SelectionMenuRef } from "./selection-menu.tsx";
import { RequirementHoverOverlay } from "./requirements-overlay.tsx";
import { cleanMarkdownSnippets } from "@/lib/utils";
import { EXCLUSION } from "@/constants/requirement-categories.ts";

interface RequirementsViewerProps {
  document: Document;
  requirements: Requirement[];
  selectedRequirement?: Requirement;
  onRequirementSelect?: (requirement: Requirement) => void;
}

export default function RequirementsViewer({
  document,
  requirements,
  selectedRequirement,
  onRequirementSelect,
}: RequirementsViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionMenuRef = useRef<SelectionMenuRef>(null);
  const markdownRef = useRef<HTMLDivElement | null>(null);
  const markRef = useRef<Mark | null>(null);
  const [isMarkdownLoaded, setIsMarkdownLoaded] = useState(false);
  const isHighlightingRef = useRef(false);
  const requirementsMapRef = useRef<Map<string, Requirement>>(new Map());
  const updateSelectedHighlightRef = useRef<() => void>(() => {});
  const [hoverOverlay, setHoverOverlay] = useState<{
    requirement: Requirement;
    x: number;
    y: number;
  } | null>(null);

  const documentRequirements = useMemo(
    () =>
      requirements.filter(
        (requirement: Requirement) =>
          requirement.tender_id === document.tender_id
      ),
    [requirements, document.tender_id]
  );

  // Prepare all requirements for highlighting with their IDs stored in data attributes
  const allRequirementsData = useMemo(() => {
    const data: Array<{
      sources: string[];
      requirementId: string;
      className: string;
    }> = [];

    documentRequirements.forEach((req) => {
      if (!req.source || !req.id) return;

      const className =
        req.category === EXCLUSION
          ? "highlight-exclusion-requirement"
          : "highlight-evaluation-requirement";
      let sources = req.source.split("|");
      if (sources.length === 0) return;
      sources = cleanMarkdownSnippets(sources);

      if (sources.length > 0) {
        data.push({
          sources,
          requirementId: req.id,
          className,
        });
      }
    });

    return data;
  }, [documentRequirements]);

  // Update selected highlight by toggling class on existing marks
  const updateSelectedHighlight = useCallback(() => {
    if (!markdownRef.current || !isMarkdownLoaded) return;

    // Remove selected class from all elements
    const allMarks = markdownRef.current.querySelectorAll(
      "[data-requirement-id]"
    );
    allMarks.forEach((mark) => {
      mark.classList.remove("highlight-selected");
    });

    // Add selected class to current requirement
    if (
      selectedRequirement?.id &&
      selectedRequirement?.source &&
      document.name === selectedRequirement.file
    ) {
      const selectedMarks = markdownRef.current.querySelectorAll(
        `[data-requirement-id="${selectedRequirement.id}"]`
      );
      selectedMarks.forEach((mark) => {
        mark.classList.add("highlight-selected");
      });

      // Scroll to first occurrence
      if (selectedMarks.length > 0) {
        requestAnimationFrame(() => {
          selectedMarks[0].scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        });
      }
    }
  }, [selectedRequirement, document.name, isMarkdownLoaded]);

  // Store latest updateSelectedHighlight in ref so highlightContent can call it without depending on it
  useEffect(() => {
    updateSelectedHighlightRef.current = updateSelectedHighlight;
  }, [updateSelectedHighlight]);

  // Single event handler with efficient delegation
  const handleContainerEvent = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Find the closest mark element with a data-requirement-id
      let element: HTMLElement | null = target;
      while (element && !element.dataset.requirementId) {
        element = element.parentElement;
        // Stop if we've left the container
        if (element === containerRef.current) break;
      }

      if (!element || !element.dataset.requirementId) return;

      const requirementId = element.dataset.requirementId;
      const requirement = requirementsMapRef.current.get(requirementId);
      if (!requirement) return;

      const targetRect = element.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      if (event.type === "click") {
        event.preventDefault();
        event.stopPropagation();
        if (onRequirementSelect) {
          onRequirementSelect(requirement);
        }
      } else if (event.type === "mouseenter") {
        setHoverOverlay({
          requirement,
          x: targetRect.left + targetRect.width / 2 - containerRect.left,
          y: targetRect.top - containerRect.top,
        });
      } else if (event.type === "mouseleave") {
        setHoverOverlay(null);
      }
    },
    [onRequirementSelect]
  );

  // Attach event listeners once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("click", handleContainerEvent, true);
    container.addEventListener("mouseenter", handleContainerEvent, true);
    container.addEventListener("mouseleave", handleContainerEvent, true);

    return () => {
      container.removeEventListener("click", handleContainerEvent, true);
      container.removeEventListener("mouseenter", handleContainerEvent, true);
      container.removeEventListener("mouseleave", handleContainerEvent, true);
    };
  }, [handleContainerEvent]);

  // Helper function to check if DOM is ready for highlighting
  const isDOMReady = useCallback(() => {
    if (!markdownRef.current) return false;
    
    // Check if there's actual text content in the markdown container
    const hasContent = markdownRef.current.textContent && markdownRef.current.textContent.trim().length > 0;
    
    // Check if there are rendered elements (not just empty container)
    const hasElements = markdownRef.current.children.length > 0 || 
                       markdownRef.current.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div').length > 0;
    
    return hasContent && hasElements;
  }, []);

  // Highlight all requirements efficiently - mark each requirement separately for reliable association
  const highlightContent = useCallback(() => {
    if (!markdownRef.current || isHighlightingRef.current) return;

    // Ensure DOM is ready before attempting to highlight
    const attemptHighlight = (retries = 3) => {
      if (!isDOMReady()) {
        if (retries > 0) {
          // Wait a bit more and try again
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              attemptHighlight(retries - 1);
            });
          });
        } else {
          // Give up after retries, but still mark as loaded to prevent infinite waiting
          console.warn('Markdown DOM not ready for highlighting after retries');
          setIsMarkdownLoaded(true);
          isHighlightingRef.current = false;
        }
        return;
      }

      isHighlightingRef.current = true;

      // Create or reuse Mark instance
      if (!markRef.current) {
        markRef.current = new Mark(markdownRef.current);
      }
      const marker = markRef.current;

      // Build requirements map for quick lookup
      requirementsMapRef.current.clear();
      documentRequirements.forEach((req) => {
        if (req.id) {
          requirementsMapRef.current.set(req.id, req);
        }
      });

      requestAnimationFrame(() => {
        // Unmark everything first
        marker.unmark({
          done: () => {
            if (allRequirementsData.length === 0) {
              setIsMarkdownLoaded(true);
              isHighlightingRef.current = false;
              // Call updateSelectedHighlight separately after a brief delay to ensure DOM is ready
              requestAnimationFrame(() => {
                updateSelectedHighlightRef.current();
              });
              return;
            }

            let completedRequirements = 0;
            const totalRequirements = allRequirementsData.length;

            // Mark each requirement separately to reliably associate marks with requirement IDs
            allRequirementsData.forEach((data) => {
              marker.mark(data.sources, {
                separateWordSearch: false,
                acrossElements: true,
                ignorePunctuation: " :;.,-–—‒_(){}[]!'\"+=".split(""),
                className: data.className,
                cacheTextNodes: true,
                combinePatterns: true,
                each: (element: HTMLElement) => {
                  // Directly associate this mark with the requirement ID
                  element.dataset.requirementId = data.requirementId;
                },
                done: () => {
                  completedRequirements++;
                  if (completedRequirements === totalRequirements) {
                    setIsMarkdownLoaded(true);
                    isHighlightingRef.current = false;
                    // Call updateSelectedHighlight separately after highlighting is complete
                    requestAnimationFrame(() => {
                      updateSelectedHighlightRef.current();
                    });
                  }
                },
              });
            });
          },
        });
      });
    };

    // Start the highlighting attempt
    requestAnimationFrame(() => {
      attemptHighlight();
    });
  }, [allRequirementsData, documentRequirements, isDOMReady]); // Added isDOMReady to dependencies

  // Reset when document changes
  useEffect(() => {
    setIsMarkdownLoaded(false);
    isHighlightingRef.current = false;
    requirementsMapRef.current.clear();
    if (markRef.current) {
      markRef.current = null;
    }
  }, [document.id]);

  // Update selected highlight when selection changes
  useEffect(() => {
    if (isMarkdownLoaded) {
      updateSelectedHighlight();
    }
  }, [selectedRequirement, isMarkdownLoaded, updateSelectedHighlight]);

  const handleScroll = useCallback(() => {
    selectionMenuRef.current?.hide();
    setHoverOverlay(null);
  }, []);

  const memoizedMarkdownViewer = useMemo(
    () => (
      <MarkdownViewer
        document={document}
        markdownRef={markdownRef}
        onComplete={highlightContent}
      />
    ),
    [document.id, highlightContent]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onScroll={handleScroll}
    >
      {memoizedMarkdownViewer}
      <SelectionMenu
        ref={selectionMenuRef}
        onAdd={() => {}}
        containerRef={containerRef}
      />
      {hoverOverlay && (
        <RequirementHoverOverlay
          requirement={hoverOverlay.requirement}
          x={hoverOverlay.x}
          y={hoverOverlay.y}
        />
      )}
    </div>
  );
}
