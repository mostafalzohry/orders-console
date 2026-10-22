export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const SORT_FIELDS = ["createdAt", "totalMinor"] as const;

export const PAGE_SIZE = 50;
export const SEARCH_DEBOUNCE_MS = 300;
export const SKELETON_ROWS = 8;

export const MAX_ITEMS_PER_ORDER = 5;
export const MAX_ITEM_QUANTITY = 1000;
export const MAX_UNIT_PRICE_MINOR = 10_000_000;
export const MAX_TEXT_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;
export const MINOR_UNITS_PER_MAJOR = 100;

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const STATUS_BADGE_CLASSES: Record<
  (typeof ORDER_STATUSES)[number],
  string
> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipped: "bg-sky-100 text-sky-800",
  delivered: "bg-indigo-100 text-indigo-800",
  cancelled: "bg-slate-200 text-slate-700",
};
