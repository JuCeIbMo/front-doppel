interface PaginationProps {
  page: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasMore: boolean;
  isLoading: boolean;
}

export function Pagination({ page, onPrev, onNext, hasPrev, hasMore, isLoading }: PaginationProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev || isLoading}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-sm text-text-secondary">Página {page + 1}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasMore || isLoading}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}
