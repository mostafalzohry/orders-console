import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { AdminOnly } from "@/components/auth/admin-only";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";
import { SKELETON_ROWS, SORT_FIELDS } from "@/constants/orders";
import { formatDateTime } from "@/lib/utils/format-date";
import { formatMinorUnits } from "@/lib/utils/money";
import type { Order, SortDirection, SortField } from "@/types/orders";
import { StatusBadge } from "./status-badge";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Order>();
const NO_ORDERS: Order[] = [];

const columns = helper.columns([
  helper.accessor("customerName", {
    header: "Customer",
    cell: (cell) => (
      <>
        <span className="block font-medium text-slate-900 capitalize">
          {cell.getValue()}
        </span>
        <span className="block max-w-24 truncate text-xs text-slate-500 sm:max-w-48 md:hidden">
          {cell.row.original.customerEmail}
        </span>
      </>
    ),
  }),
  helper.accessor("customerEmail", {
    header: "Email",
    cell: (cell) => (
      <span className="block max-w-40 truncate text-slate-500 xl:max-w-64">
        {cell.getValue()}
      </span>
    ),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (cell) => <StatusBadge status={cell.getValue()} />,
  }),
  helper.accessor("totalMinor", {
    header: "Total",
    cell: (cell) => (
      <>
        <span className="font-medium whitespace-nowrap text-slate-900 tabular-nums">
          {formatMinorUnits(cell.getValue())}
        </span>
        <span className="mt-1 block sm:hidden">
          <StatusBadge status={cell.row.original.status} />
        </span>
      </>
    ),
  }),
  helper.accessor("createdAt", {
    header: "Created",
    cell: (cell) => (
      <span className="whitespace-nowrap text-slate-500">
        {formatDateTime(cell.getValue())}
      </span>
    ),
  }),
]);

const COLUMN_CLASSES: Record<string, string> = {
  customerEmail: "hidden md:table-cell",
  status: "hidden sm:table-cell",
  totalMinor: "text-right",
  createdAt: "hidden xl:table-cell",
};

function isSortField(id: string): id is SortField {
  return (SORT_FIELDS as readonly string[]).includes(id);
}

interface OrdersTableProps {
  orders: Order[] | undefined;
  sort: SortField;
  dir: SortDirection;
  isDimmed: boolean;
  onSort: (field: SortField) => void;
  onViewDetails: (order: Order) => void;
  onDelete: (order: Order) => void;
}

export function OrdersTable({
  orders,
  sort,
  dir,
  isDimmed,
  onSort,
  onViewDetails,
  onDelete,
}: OrdersTableProps) {
  const table = useTable({ features, columns, data: orders ?? NO_ORDERS });

  return (
    <div
      aria-busy={isDimmed}
      className={`min-h-0 flex-1 overflow-auto transition-opacity ${isDimmed ? "opacity-50" : ""}`}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={
                    header.column.id === sort
                      ? dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={`border-b border-slate-200 px-2 py-3 text-left sm:px-4 font-semibold whitespace-nowrap ${COLUMN_CLASSES[header.column.id] ?? ""}`}
                >
                  {isSortField(header.column.id) ? (
                    <button
                      type="button"
                      onClick={() => onSort(header.column.id as SortField)}
                      className="inline-flex items-center gap-1 font-semibold uppercase hover:text-slate-900"
                    >
                      <table.FlexRender header={header} />
                      <span aria-hidden="true">
                        {header.column.id === sort
                          ? dir === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-slate-200 px-2 py-3 sm:px-4"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders
            ? table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-[background-color] hover:bg-slate-50"
                >
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-2 py-3 sm:px-4 ${COLUMN_CLASSES[cell.column.id] ?? ""}`}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                  <td className="px-2 py-3 sm:px-4">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 sm:px-3"
                        onClick={() => onViewDetails(row.original)}
                      >
                        Details
                      </Button>
                      <AdminOnly>
                        <button
                          type="button"
                          aria-label={`Delete order for ${row.original.customerName}`}
                          onClick={() => onDelete(row.original)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </AdminOnly>
                    </div>
                  </td>
                </tr>
              ))
            : Array.from({ length: SKELETON_ROWS }, (_, row) => (
                <tr key={row}>
                  {[
                    ...table.getAllLeafColumns().map((column) => column.id),
                    "actions",
                  ].map((id) => (
                    <td
                      key={id}
                      className={`px-2 py-3.5 sm:px-4 ${COLUMN_CLASSES[id] ?? ""}`}
                    >
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
