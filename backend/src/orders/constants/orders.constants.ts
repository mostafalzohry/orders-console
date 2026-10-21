export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;
export const MAX_ITEMS_PER_ORDER = 5;
export const MAX_TEXT_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_ITEM_QUANTITY = 1000;
export const MAX_UNIT_PRICE_MINOR = 10_000_000;

export const SORT_FIELDS = ['createdAt', 'totalMinor'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
