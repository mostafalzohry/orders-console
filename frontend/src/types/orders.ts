import type { ORDER_STATUSES, SORT_FIELDS } from "@/constants/orders";

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

export interface OrderItem {
  name: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  totalMinor: number;
  createdAt: string;
}

export interface OrdersPage {
  data: Order[];
  nextCursor: string | null;
}

export interface OrdersQuery {
  search: string;
  status: OrderStatus | "";
  sort: SortField;
  dir: SortDirection;
  cursor?: string;
}

export interface NewOrder {
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
}

export interface OrderStats {
  totalsByStatus: Record<OrderStatus, number>;
  totalOrders: number;
  revenueTodayMinor: number;
  generatedAt: string;
}
