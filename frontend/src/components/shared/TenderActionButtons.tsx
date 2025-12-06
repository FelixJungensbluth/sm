import { Button } from "@/components/ui/button";
import { ClipboardList, Search } from "lucide-react";

interface TenderActionButtonsProps {
  tenderId: string;
  onReviewBaseInfo: () => void;
  onExtractRequirements: () => void;
  variant?: "full" | "compact";
}

export function TenderActionButtons({
  tenderId,
  onReviewBaseInfo,
  onExtractRequirements,
  variant = "full",
}: TenderActionButtonsProps) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onReviewBaseInfo}
        className="flex-1 justify-center gap-2 h-8 text-xs bg-black text-white hover:bg-black/80"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        {variant === "full" ? "Review Base Information" : "Review"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExtractRequirements}
        className="flex-1 justify-center gap-2 h-8 text-xs bg-black text-white hover:bg-black/80"
      >
        <Search className="h-3.5 w-3.5" />
        {variant === "full" ? "Extract Requirements" : "Extract"}
      </Button>
    </>
  );
}
