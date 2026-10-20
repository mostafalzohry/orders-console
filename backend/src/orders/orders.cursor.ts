import { FilterQuery, Types } from 'mongoose';
import { Order } from './order.schema';
import {
  SORT_DIRECTIONS,
  SORT_FIELDS,
  SortDirection,
  SortField,
} from './constants/orders.constants';

export interface Cursor {
  sort: SortField;
  dir: SortDirection;
  value: number;
  id: string;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function encodeCursor({ sort, dir, value, id }: Cursor): string {
  return Buffer.from(JSON.stringify([sort, dir, value, id])).toString(
    'base64url',
  );
}

export function decodeCursor(token: string): Cursor | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== 4) {
    return null;
  }
  const [sort, dir, value, id] = parsed as unknown[];
  if (
    !SORT_FIELDS.includes(sort as SortField) ||
    !SORT_DIRECTIONS.includes(dir as SortDirection) ||
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    typeof id !== 'string' ||
    !OBJECT_ID.test(id)
  ) {
    return null;
  }
  return { sort: sort as SortField, dir: dir as SortDirection, value, id };
}

export function keysetFilter({
  sort,
  dir,
  value,
  id,
}: Cursor): FilterQuery<Order> {
  const strict = dir === 'desc' ? '$lt' : '$gt';
  const inclusive = dir === 'desc' ? '$lte' : '$gte';
  const bound = sort === 'createdAt' ? new Date(value) : value;

  return {
    [sort]: { [inclusive]: bound },
    $or: [
      { [sort]: { [strict]: bound } },
      { [sort]: bound, _id: { [strict]: new Types.ObjectId(id) } },
    ],
  };
}
