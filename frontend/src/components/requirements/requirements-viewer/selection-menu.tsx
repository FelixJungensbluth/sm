import { Plus } from 'lucide-react';
import { forwardRef, type RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface SelectionMenuProps {
  onAdd: (text: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export interface SelectionMenuRef {
  hide: () => void;
}

export const SelectionMenu = forwardRef<SelectionMenuRef, SelectionMenuProps>(
  ({ onAdd, containerRef }: SelectionMenuProps, ref) => {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const lastClickTargetRef = useRef<EventTarget | null>(null);

    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState('');

    const handleClick = () => {
      if (selectedText) {
        onAdd(selectedText);
      }
      hideMenu();
      window.getSelection()?.removeAllRanges();
    };

    const hideMenu = useCallback(() => {
      setVisible(false);
      setSelectedText('');
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        hide: () => {
          hideMenu();
        },
      }),
      [hideMenu],
    );

    useEffect(() => {
      const handleMouseDown = (e: MouseEvent) => {
        lastClickTargetRef.current = e.target;
      };
      document.addEventListener('mousedown', handleMouseDown);
      return () => document.removeEventListener('mousedown', handleMouseDown);
    }, []);

    useEffect(() => {
      const containerElement = containerRef.current;
      if (!containerElement) return;

      const handleMouseUp = (event: MouseEvent) => {
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            if (!menuRef.current?.contains(event.target as Node)) {
              hideMenu();
            }
            return;
          }

          const selectedString = selection.toString().trim();
          let isSelectionInContainer = false;

          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (containerElement.contains(range.commonAncestorContainer)) {
              isSelectionInContainer = true;
            } else if (
              containerElement.contains(range.startContainer) ||
              containerElement.contains(range.endContainer)
            ) {
              isSelectionInContainer = true;
            }
          }

          if (isSelectionInContainer && selectedString) {
            const containerRect = containerElement.getBoundingClientRect();

            const menuX = event.clientX - containerRect.left;
            const menuY = event.clientY - containerRect.top;
            const offsetY = 10;

            setSelectedText(selectedString);
            setPosition({ x: menuX, y: menuY + offsetY });
            setVisible(true);
          } else {
            if (!menuRef.current?.contains(event.target as Node)) {
              hideMenu();
            }
          }
        }, 0);
      };

      containerElement.addEventListener('mouseup', handleMouseUp);

      return () => {
        containerElement.removeEventListener('mouseup', handleMouseUp);
      };
    }, [containerRef, hideMenu]);

    if (!visible) return null;

    return (
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          pointerEvents: 'auto',
          backgroundColor: 'hsl(var(--primary))',
          opacity: 1,
        }}
        className="shadow-lg p-2 border border-1 flex flex-row cursor-pointer items-center gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        <Plus strokeWidth={1.5} size={16} />
        <span className="text-xs">Neue Anforderung</span>
      </div>
    );
  },
);
