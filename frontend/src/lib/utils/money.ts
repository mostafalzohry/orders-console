import { MINOR_UNITS_PER_MAJOR, PRICE_PATTERN } from "@/constants/orders";

const amountFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMinorUnits(minor: number): string {
  return amountFormat.format(minor / MINOR_UNITS_PER_MAJOR);
}

export function parseMinorUnits(amount: string): number {
  const trimmed = amount.trim();
  if (!PRICE_PATTERN.test(trimmed)) {
    return 0;
  }
  const [whole, fraction = ""] = trimmed.split(".");
  return (
    Number(whole) * MINOR_UNITS_PER_MAJOR + Number(fraction.padEnd(2, "0"))
  );
}
