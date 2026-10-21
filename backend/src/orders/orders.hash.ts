import { createHash } from 'node:crypto';
import { OrderItem } from './order.schema';

export interface OrderPayload {
  customerName: string;
  customerEmail: string;
  items: readonly OrderItem[];
}

export function hashPayload({
  customerName,
  customerEmail,
  items,
}: OrderPayload): string {
  const canonical = [
    customerName,
    customerEmail,
    items.map((item) => [item.name, item.quantity, item.unitPriceMinor]),
  ];
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
