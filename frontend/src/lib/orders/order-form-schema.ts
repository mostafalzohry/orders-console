import { z } from "zod";
import {
  MAX_EMAIL_LENGTH,
  MAX_ITEM_QUANTITY,
  MAX_ITEMS_PER_ORDER,
  MAX_TEXT_LENGTH,
  MAX_UNIT_PRICE_MINOR,
  PRICE_PATTERN,
} from "@/constants/orders";
import { parseMinorUnits } from "@/lib/utils/money";

const text = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .max(MAX_TEXT_LENGTH, `Use at most ${MAX_TEXT_LENGTH} characters`);

const itemSchema = z.object({
  name: text("an item name"),
  quantity: z
    .number({ error: "Enter a quantity" })
    .int("Use a whole number")
    .min(1, "Quantity must be at least 1")
    .max(MAX_ITEM_QUANTITY, `Quantity can be at most ${MAX_ITEM_QUANTITY}`),
  unitPrice: z
    .string()
    .regex(PRICE_PATTERN, "Enter a price like 12.50")
    .refine((value) => {
      const minor = parseMinorUnits(value);
      return minor >= 1 && minor <= MAX_UNIT_PRICE_MINOR;
    }, "Price is out of range"),
});

export const orderFormSchema = z.object({
  customerName: text("the customer name"),
  customerEmail: z
    .email("Enter a valid email address")
    .max(MAX_EMAIL_LENGTH, "Email is too long"),
  items: z
    .array(itemSchema)
    .min(1, "Add at least one item")
    .max(MAX_ITEMS_PER_ORDER, `Add at most ${MAX_ITEMS_PER_ORDER} items`),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
export type OrderFormItem = OrderFormValues["items"][number];
