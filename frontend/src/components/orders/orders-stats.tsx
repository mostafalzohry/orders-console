"use client";

import { Button } from "@/components/ui/button";
import { ORDER_STATUSES } from "@/constants/orders";
import { useOrderStats } from "@/lib/orders/use-order-stats";
import { formatCount } from "@/lib/utils/format-count";
import { formatDateTime } from "@/lib/utils/format-date";
import { formatMinorUnits } from "@/lib/utils/money";
import { HeadlineTile } from "./headline-tile";
import { StatusTile } from "./status-tile";

export function OrdersStats() {
  const stats = useOrderStats();
  const data = stats.data;

  return (
    <section
      aria-label="Order statistics"
      aria-busy={stats.isPending}
      className="shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">Overview</h2>
        <p className="h-4 text-xs text-slate-500">
          {data &&
            (stats.isFetching
              ? "Updating…"
              : `Updated ${formatDateTime(data.generatedAt)}`)}
        </p>
      </div>
      {stats.isError ? (
        <div
          role="alert"
          className="m-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>Could not load statistics.</span>
          <Button variant="secondary" size="sm" onClick={() => stats.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-2 divide-x divide-slate-100">
            <HeadlineTile
              label="Revenue today"
              value={data && formatMinorUnits(data.revenueTodayMinor)}
            />
            <HeadlineTile
              className="pl-4 sm:pl-6"
              label="Total orders"
              value={data && formatCount(data.totalOrders)}
            />
          </dl>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-5">
            {ORDER_STATUSES.map((status) => (
              <StatusTile
                key={status}
                status={status}
                value={data && formatCount(data.totalsByStatus[status])}
              />
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
