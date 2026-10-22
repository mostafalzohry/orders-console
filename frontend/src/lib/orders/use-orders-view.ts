import { useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "@/constants/orders";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import type { OrdersQuery, SortDirection, SortField } from "@/types/orders";

const NO_CURSORS: string[] = [];

export function useOrdersView() {
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<OrdersQuery["status"]>("");
  const [sort, setSort] = useState<SortField>("createdAt");
  const [dir, setDir] = useState<SortDirection>("desc");
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS).trim();

  const filtersKey = JSON.stringify([search, status, sort, dir]);
  const [pages, setPages] = useState({ filtersKey, cursors: NO_CURSORS });
  const cursors = pages.filtersKey === filtersKey ? pages.cursors : NO_CURSORS;

  const toggleSort = (field: SortField) => {
    if (field === sort) {
      setDir(dir === "desc" ? "asc" : "desc");
      return;
    }
    setSort(field);
    setDir("desc");
  };

  const clearFilters = () => {
    setSearchInput("");
    setStatus("");
  };

  return {
    query: { search, status, sort, dir, cursor: cursors.at(-1) },
    searchInput,
    setSearchInput,
    setStatus,
    clearFilters,
    toggleSort,
    page: cursors.length + 1,
    goNext: (nextCursor: string) =>
      setPages({ filtersKey, cursors: [...cursors, nextCursor] }),
    goPrevious: () => setPages({ filtersKey, cursors: cursors.slice(0, -1) }),
  };
}
