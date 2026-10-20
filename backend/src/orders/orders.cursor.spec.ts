import { Types } from 'mongoose';
import {
  Cursor,
  decodeCursor,
  encodeCursor,
  keysetFilter,
} from './orders.cursor';

const ID = new Types.ObjectId().toHexString();
const cursor = (overrides: Partial<Cursor> = {}): Cursor => ({
  sort: 'createdAt',
  dir: 'desc',
  value: 1_760_000_000_000,
  id: ID,
  ...overrides,
});
const token = (payload: unknown) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

describe('cursor encoding', () => {
  it('round-trips', () => {
    expect(decodeCursor(encodeCursor(cursor()))).toEqual(cursor());
    expect(
      decodeCursor(
        encodeCursor(cursor({ sort: 'totalMinor', dir: 'asc', value: 12345 })),
      ),
    ).toEqual(cursor({ sort: 'totalMinor', dir: 'asc', value: 12345 }));
  });

  it('is URL-safe', () => {
    expect(encodeCursor(cursor())).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['garbage text', '!!!not a cursor!!!'],
    ['empty string', ''],
    ['not JSON', Buffer.from('hello').toString('base64url')],
    ['an object instead of an array', token({ sort: 'createdAt' })],
    ['too few parts', token(['createdAt', 'desc', 1])],
    ['too many parts', token(['createdAt', 'desc', 1, ID, 'extra'])],
    ['an unknown sort field', token(['name', 'desc', 1, ID])],
    ['an unknown direction', token(['createdAt', 'up', 1, ID])],
    ['a string value', token(['createdAt', 'desc', '1', ID])],
    ['a null value', token(['createdAt', 'desc', null, ID])],
    ['an id that is not an ObjectId', token(['createdAt', 'desc', 1, 'abc'])],
    ['an operator object as id', token(['createdAt', 'desc', 1, { $ne: 1 }])],
  ])('rejects %s', (_label, value) => {
    expect(decodeCursor(value)).toBeNull();
  });
});

describe('keysetFilter', () => {
  it('goes strictly below the cursor row when sorting descending by date', () => {
    const filter = keysetFilter(cursor());
    const date = new Date(1_760_000_000_000);

    expect(filter).toEqual({
      createdAt: { $lte: date },
      $or: [
        { createdAt: { $lt: date } },
        { createdAt: date, _id: { $lt: new Types.ObjectId(ID) } },
      ],
    });
  });

  it('goes strictly above the cursor row when sorting ascending by amount', () => {
    const filter = keysetFilter(
      cursor({ sort: 'totalMinor', dir: 'asc', value: 500 }),
    );

    expect(filter).toEqual({
      totalMinor: { $gte: 500 },
      $or: [
        { totalMinor: { $gt: 500 } },
        { totalMinor: 500, _id: { $gt: new Types.ObjectId(ID) } },
      ],
    });
  });

  it('uses numbers for the amount and dates for the date', () => {
    const byDate = keysetFilter(cursor()).createdAt as { $lte: unknown };
    const byAmount = keysetFilter(cursor({ sort: 'totalMinor', value: 9 }))
      .totalMinor as {
      $lte: unknown;
    };

    expect(byDate.$lte).toBeInstanceOf(Date);
    expect(byAmount.$lte).toBe(9);
  });
});
