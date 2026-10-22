import { parseMinorUnits } from "@/lib/utils/money";
import type { OrderFormItem } from "./order-form-schema";

export function orderTotalMinor(items: Partial<OrderFormItem>[]): number {
  return items.reduce((sum, { quantity, unitPrice }) => {
    const validQuantity = Number.isInteger(quantity) ? Number(quantity) : 0;
    return sum + validQuantity * parseMinorUnits(unitPrice ?? "");
  }, 0);
}
