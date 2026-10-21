import { OrderItem } from './order.schema';

export function calculateTotalMinor(
  items: readonly Pick<OrderItem, 'quantity' | 'unitPriceMinor'>[],
): number {
  return items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceMinor,
    0,
  );
}
