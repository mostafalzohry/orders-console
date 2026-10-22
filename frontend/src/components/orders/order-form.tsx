"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { MAX_ITEMS_PER_ORDER } from "@/constants/orders";
import { INPUT_CLASS, LABEL_CLASS } from "@/constants/styles";
import { ApiError } from "@/lib/api/api-error";
import { createOrderErrorMessage } from "@/lib/orders/create-order-error-message";
import {
  orderFormSchema,
  type OrderFormValues,
} from "@/lib/orders/order-form-schema";
import { orderTotalMinor } from "@/lib/orders/order-total";
import { useCreateOrder } from "@/lib/orders/use-create-order";
import { formatMinorUnits, parseMinorUnits } from "@/lib/utils/money";

const EMPTY_ITEM = { name: "", quantity: 1, unitPrice: "" };
const EMPTY_FORM = { customerName: "", customerEmail: "", items: [EMPTY_ITEM] };
const ITEM_GRID = "grid gap-3 sm:grid-cols-[1fr_5.5rem_7.5rem_2.5rem]";

interface OrderFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function OrderForm({ onCreated, onCancel }: OrderFormProps) {
  const createOrder = useCreateOrder();
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    mode: "onTouched",
    defaultValues: EMPTY_FORM,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  const onSubmit = (values: OrderFormValues) => {
    if (createOrder.isPending) {
      return;
    }
    createOrder.mutate(
      {
        order: {
          ...values,
          items: values.items.map(({ name, quantity, unitPrice }) => ({
            name,
            quantity,
            unitPriceMinor: parseMinorUnits(unitPrice),
          })),
        },
        idempotencyKey,
      },
      {
        onSuccess: () => {
          reset(EMPTY_FORM);
          createOrder.reset();
          setIdempotencyKey(crypto.randomUUID());
          onCreated();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 422) {
            setIdempotencyKey(crypto.randomUUID());
          }
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customerName" className={LABEL_CLASS}>
              Customer name
            </label>
            <input
              id="customerName"
              autoComplete="off"
              aria-invalid={Boolean(errors.customerName)}
              className={`${INPUT_CLASS} mt-1`}
              {...register("customerName")}
            />
            <FieldError message={errors.customerName?.message} />
          </div>
          <div>
            <label htmlFor="customerEmail" className={LABEL_CLASS}>
              Customer email
            </label>
            <input
              id="customerEmail"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors.customerEmail)}
              className={`${INPUT_CLASS} mt-1`}
              {...register("customerEmail")}
            />
            <FieldError message={errors.customerEmail?.message} />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className={LABEL_CLASS}>Items</legend>
          <div
            aria-hidden="true"
            className={`${ITEM_GRID} hidden text-xs font-medium tracking-wide text-slate-500 uppercase sm:grid`}
          >
            <span>Item</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`${ITEM_GRID} items-start rounded-lg border border-slate-200 p-3 sm:border-0 sm:p-0`}
            >
              <div>
                <input
                  aria-label={`Item ${index + 1} name`}
                  placeholder="Item name"
                  aria-invalid={Boolean(errors.items?.[index]?.name)}
                  className={INPUT_CLASS}
                  {...register(`items.${index}.name`)}
                />
                <FieldError message={errors.items?.[index]?.name?.message} />
              </div>
              <div>
                <input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  placeholder="Qty"
                  aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                  className={INPUT_CLASS}
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                />
                <FieldError
                  message={errors.items?.[index]?.quantity?.message}
                />
              </div>
              <div>
                <input
                  aria-label={`Item ${index + 1} unit price`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.items?.[index]?.unitPrice)}
                  className={INPUT_CLASS}
                  {...register(`items.${index}.unitPrice`)}
                />
                <FieldError
                  message={errors.items?.[index]?.unitPrice?.message}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove item ${index + 1}`}
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => append(EMPTY_ITEM)}
            disabled={fields.length >= MAX_ITEMS_PER_ORDER}
          >
            <PlusIcon />
            Add item
          </Button>
        </fieldset>

        {createOrder.isError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {createOrderErrorMessage(createOrder.error)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Total
          </p>
          <output
            aria-label="Total"
            className="block text-2xl font-semibold tabular-nums"
          >
            {formatMinorUnits(orderTotalMinor(items))}
          </output>
          <p className="text-xs text-slate-500">Calculated from the items</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createOrder.isPending}>
            {createOrder.isPending ? "Creating…" : "Create order"}
          </Button>
        </div>
      </div>
    </form>
  );
}
