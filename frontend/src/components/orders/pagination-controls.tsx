import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function PaginationControls({
  page,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrevious}
        disabled={!canGoPrevious}
      >
        Previous
      </Button>
      <span className="text-sm text-slate-600">Page {page}</span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext}
      >
        Next
      </Button>
    </div>
  );
}
