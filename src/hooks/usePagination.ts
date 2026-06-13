import { useCallback, useState } from "react";

export interface UsePaginationResult {
  page: number;
  limit: number;
  offset: number;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export function usePagination(defaultLimit = 20): UsePaginationResult {
  const [page, setPage] = useState(0);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const reset = useCallback(() => setPage(0), []);

  return {
    page,
    limit: defaultLimit,
    offset: page * defaultLimit,
    nextPage,
    prevPage,
    reset,
  };
}
