import { ValuePlaceholder } from "@/components/ui/value-placeholder";
import type { OrderStatus } from "@/types/orders";
import { StatusBadge } from "./status-badge";

export function StatusTile({
  status,
  value,
}: {
  status: OrderStatus;
  value: string | undefined;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-lg bg-slate-50 px-2.5 py-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2 sm:block sm:px-3 sm:py-2.5">
      <dt>
        <StatusBadge status={status} />
      </dt>
      <dd className="text-sm font-semibold text-slate-900 tabular-nums sm:mt-2 sm:text-lg">
        {value ?? <ValuePlaceholder />}
      </dd>
    </div>
  );
}
