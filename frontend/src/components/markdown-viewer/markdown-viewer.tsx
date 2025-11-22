import { ChevronDown, ChevronUp, Minus, Plus, Search, X } from 'lucide-react';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mark from 'advanced-mark.js';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { Document } from '@/services/api/api.ts';

interface MarkdownViewerProps {
  document: Document;
  markdownRef: RefObject<HTMLDivElement | null>;
  onComplete?: () => void;
}

export default function MarkdownViewer({ document, markdownRef, onComplete }: MarkdownViewerProps) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(12);

  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const markRef = useRef<Mark | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileUrl = useMemo(
    () => `${import.meta.env.VITE_MINIO_BASE_URL}/tender-files/${document.tender_id}/processed/${document.id}`,
    [document.tender_id, document.id]
  );

  console.log(fileUrl);

  const load = useCallback(async () => {
    setStatus('loading');
    setContent('');
    setErr(null);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status} ${res.statusText}`);
      }
      let txt = await res.text();
      txt = txt.replace(/- /g, '-'); // Handle word wraps

      setContent(txt);
      setStatus('ready');
      setErr(null);
    } catch (e) {
      setStatus('error');
      setErr(e instanceof Error ? e.message : 'Failed to load markdown');
    }
  }, [fileUrl]);

  useEffect(() => {
    setStatus('idle');
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'ready') {
      onComplete?.();
    }
  }, [status, onComplete]);

  useEffect(() => {
    if (status !== 'ready' || !markdownRef.current) return;
    markRef.current = new Mark(markdownRef.current);
  }, [status, markdownRef]);


  useEffect(() => {
    if (!markRef.current) return;
    clearTimeout(debounceRef.current!);
    debounceRef.current = setTimeout(() => {
      markRef.current?.unmark({
        className: 'highlight-search',
        done: () => {
          if (!searchTerm) {
            setMatches([]);
            setCurrentIndex(0);
            return;
          }
          markRef.current?.mark(searchTerm, {
            separateWordSearch: false,
            className: 'highlight-search',
            ignorePunctuation: ' :;.,-–—‒_(){}[]!\'"+='.split(''),
            acrossElements: true,
            done: () => {
              const elements = markdownRef.current?.querySelectorAll('.highlight-search') || [];
              const arr = Array.from(elements) as HTMLElement[];
              setMatches(arr);
              setCurrentIndex(arr.length ? 0 : -1);
            }
          });
        }
      });
    }, 300);
    return () => clearTimeout(debounceRef.current!);
  }, [searchTerm, markdownRef]);

  useEffect(() => {
    if (matches[currentIndex]) {
      matches[currentIndex].scrollIntoView({ block: 'center' });
    }
  }, [currentIndex, matches]);

  const zoomIn = useCallback(() => setFontSize((s) => Math.min(s + 2, 32)), []);
  const zoomOut = useCallback(() => setFontSize((s) => Math.max(s - 2, 8)), []);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchTerm('');
        setMatches([]);
        setCurrentIndex(0);
        markRef.current?.unmark({ className: 'highlight-search' });
      }
      return !prev;
    });
  }, []);

  const goNext = useCallback(() => {
    if (!matches.length) return;
    setCurrentIndex((idx) => (idx + 1) % matches.length);
  }, [matches]);
  const goPrev = useCallback(() => {
    if (!matches.length) return;
    setCurrentIndex((idx) => (idx - 1 + matches.length) % matches.length);
  }, [matches]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="relative w-full h-full border border-border rounded-md bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading markdown…</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative w-full h-full border border-border rounded-md bg-background flex items-center justify-center">
        <div className="text-destructive">Error: {err}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background overflow-hidden">
      <div className="h-14 border-b border-border bg-background flex items-center justify-between">
        <span className="px-4 truncate text-sm font-medium text-foreground" title={document.name}>
          {document.name}
        </span>

        <div className="flex items-center gap-2 select-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSearch}
            className="h-8 w-8"
            aria-label="Search"
          >
            <Search size={16} strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            aria-label="Zoom out"
            className="h-8 w-8"
          >
            <Minus size={16} />
          </Button>
          <span className="w-8 text-center text-xs tabular-nums text-muted-foreground">{fontSize}px</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            aria-label="Zoom in"
            className="h-8 w-8"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="h-14 w-full border-b border-border bg-background flex items-center justify-between px-4 gap-4 flex-shrink-0">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Suchen..."
              className="pl-9 pr-9 h-9 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              aria-label="Close search"
            >
              <X size={16} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              aria-label="Previous result"
              className="h-8 w-8"
              disabled={!matches.length}
            >
              <ChevronUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              aria-label="Next result"
              className="h-8 w-8"
              disabled={!matches.length}
            >
              <ChevronDown size={16} />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground min-w-[3rem] text-right">
              {matches.length ? `${currentIndex + 1}/${matches.length}` : '0/0'}
            </span>
          </div>
        </div>
      )}

      <div ref={markdownRef} className="px-4 w-full h-full overflow-auto markdown-content" style={{ fontSize }}>
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
}
