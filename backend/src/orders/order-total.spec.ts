import { calculateTotalMinor } from './order-total';

describe('calculateTotalMinor', () => {
  it('adds quantity times price over every item', () => {
    expect(
      calculateTotalMinor([
        { quantity: 2, unitPriceMinor: 1250 },
        { quantity: 1, unitPriceMinor: 999 },
      ]),
    ).toBe(3499);
  });

  it('is exact for the largest allowed order (5 items at the maximum)', () => {
    const item = { quantity: 1000, unitPriceMinor: 10_000_000 };

    expect(calculateTotalMinor(Array(5).fill(item))).toBe(50_000_000_000);
  });

  it('is zero for no items', () => {
    expect(calculateTotalMinor([])).toBe(0);
  });
});
