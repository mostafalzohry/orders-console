import { Button } from "@/components/ui/button";
import { LabeledValue } from "@/components/ui/labeled-value";
import { formatDateTime } from "@/lib/utils/format-date";
import { formatMinorUnits } from "@/lib/utils/money";
import type { Order } from "@/types/orders";
import { StatusBadge } from "./status-badge";

export function OrderDetails({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <LabeledValue label="Customer">
            <span className="capitalize">{order.customerName}</span>
          </LabeledValue>
          <LabeledValue label="Email">{order.customerEmail}</LabeledValue>
          <LabeledValue label="Status">
            <StatusBadge status={order.status} />
          </LabeledValue>
          <LabeledValue label="Created">
            {formatDateTime(order.createdAt)}
          </LabeledValue>
        </dl>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold">
                  Item
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-semibold"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-semibold"
                >
                  Unit price
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-semibold"
                >
                  Line total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2.5">{item.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMinorUnits(item.unitPriceMinor)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatMinorUnits(item.quantity * item.unitPriceMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Total
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMinorUnits(order.totalMinor)}
          </p>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
