import MarkdownViewer from '@/components/markdown-viewer/markdown-viewer';
import type { Document } from '@/services/api/api.ts';
import Mark from 'advanced-mark.js';
import { useCallback, useRef, useEffect } from 'react';
import { cleanMarkdownSnippets } from '@/lib/utils.ts';

interface BaseInformationViewerProps {
  document: Document;
  searchQuery: string | null;
}

export default function BaseInformationViewer({ document, searchQuery }: BaseInformationViewerProps) {
  const markdownRef = useRef<HTMLDivElement | null>(null);
  const markRef = useRef<Mark | null>(null);

  // Reset markRef when document changes
  useEffect(() => {
    markRef.current = null;
  }, [document.id]);

  const highlightContent = useCallback(() => {
    if (!markdownRef.current) return;

    if (!markRef.current) {
      markRef.current = new Mark(markdownRef.current);
    }
    const marker = markRef.current;

    marker.unmark({
      done: () => {
        if (!searchQuery) return;
        let terms = searchQuery.split('|');
        if (terms.length === 0) return;
        terms = cleanMarkdownSnippets(terms);

        let doneCnt = 0;
        const afterEach = () => {
          if (++doneCnt === terms.length) {
            const first = markdownRef.current?.querySelector('mark') as HTMLElement | undefined;
            first?.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        };


        terms.forEach((t) => {
            marker.mark(t, {
              separateWordSearch: false,
              acrossElements: true,
              ignorePunctuation: ' :;.,-–—‒_(){}[]!\'"+=#'.split(''),
              className: 'highlight-selected',
              done: afterEach
            });
          }
        );
      }
    });
  }, [searchQuery]);

  return <MarkdownViewer document={document} markdownRef={markdownRef} onComplete={highlightContent}></MarkdownViewer>;
}
