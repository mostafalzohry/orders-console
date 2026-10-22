import { Button } from "@/components/ui/button";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { ORDER_STATUSES } from "@/constants/orders";
import { INPUT_CLASS } from "@/constants/styles";
import type { OrdersQuery } from "@/types/orders";

interface OrdersToolbarProps {
  searchInput: string;
  status: OrdersQuery["status"];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: OrdersQuery["status"]) => void;
  onClear: () => void;
}

export function OrdersToolbar({
  searchInput,
  status,
  onSearchChange,
  onStatusChange,
  onClear,
}: OrdersToolbarProps) {
  const hasActiveFilters = searchInput !== "" || status !== "";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 p-4">
      <div className="relative w-full sm:w-80">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Search orders"
          placeholder="Search customer name or email"
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          className={`${INPUT_CLASS} pl-9`}
        />
      </div>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(event) =>
          onStatusChange(event.target.value as OrdersQuery["status"])
        }
        className={`${INPUT_CLASS} min-w-0 flex-1 sm:w-44 sm:flex-none`}
      >
        <option value="">All statuses</option>
        {ORDER_STATUSES.map((value) => (
          <option key={value} value={value} className="capitalize">
            {value}
          </option>
        ))}
      </select>
      {hasActiveFilters && (
        <Button variant="secondary" onClick={onClear}>
          <CloseIcon />
          Clear filters
        </Button>
      )}
    </div>
  );
}
