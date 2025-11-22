
import { PanelResizeHandle } from "react-resizable-panels";

export default function ResizeHandler({ id }: { id: string }) {
    return (
        <PanelResizeHandle
            id={id}
            aria-label="Resize panels"
            role="separator"
            aria-orientation="vertical"
        >
          
        </PanelResizeHandle>)
}