import { hashPayload, OrderPayload } from './orders.hash';

const payload = (): OrderPayload => ({
  customerName: 'ada lovelace',
  customerEmail: 'ada@example.com',
  items: [
    { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
    { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
  ],
});

describe('hashPayload', () => {
  it('gives the same hash for the same order', () => {
    expect(hashPayload(payload())).toBe(hashPayload(payload()));
  });

  it('is a 64-character hex string', () => {
    expect(hashPayload(payload())).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not depend on the order of the object properties', () => {
    const reordered: OrderPayload = {
      items: [
        { unitPriceMinor: 1250, quantity: 2, name: 'Widget' },
        { unitPriceMinor: 999, quantity: 1, name: 'Gadget' },
      ],
      customerEmail: 'ada@example.com',
      customerName: 'ada lovelace',
    };

    expect(hashPayload(reordered)).toBe(hashPayload(payload()));
  });

  it.each([
    ['name', (p: OrderPayload) => ({ ...p, customerName: 'grace hopper' })],
    ['email', (p: OrderPayload) => ({ ...p, customerEmail: 'g@example.com' })],
    [
      'an item quantity',
      (p: OrderPayload) => ({
        ...p,
        items: [{ ...p.items[0], quantity: 3 }, p.items[1]],
      }),
    ],
    [
      'an item price',
      (p: OrderPayload) => ({
        ...p,
        items: [p.items[0], { ...p.items[1], unitPriceMinor: 1000 }],
      }),
    ],
    [
      'an item name',
      (p: OrderPayload) => ({
        ...p,
        items: [{ ...p.items[0], name: 'Widget 2' }, p.items[1]],
      }),
    ],
    [
      'the number of items',
      (p: OrderPayload) => ({ ...p, items: [p.items[0]] }),
    ],
    [
      'the order of the items',
      (p: OrderPayload) => ({ ...p, items: [p.items[1], p.items[0]] }),
    ],
  ])('gives a different hash when %s changes', (_label, change) => {
    expect(hashPayload(change(payload()))).not.toBe(hashPayload(payload()));
  });
});
