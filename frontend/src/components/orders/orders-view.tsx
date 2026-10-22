"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { useOrders } from "@/lib/orders/use-orders";
import { useOrdersView } from "@/lib/orders/use-orders-view";
import type { Order } from "@/types/orders";
import { DeleteOrderDialog } from "./delete-order-dialog";
import { OrderDetails } from "./order-details";
import { OrderForm } from "./order-form";
import { OrdersStats } from "./orders-stats";
import { OrdersTable } from "./orders-table";
import { OrdersToolbar } from "./orders-toolbar";
import { PaginationControls } from "./pagination-controls";

export function OrdersView() {
  const view = useOrdersView();
  const orders = useOrders(view.query);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order>();
  const [orderToDelete, setOrderToDelete] = useState<Order>();
  const closeNewOrder = () => setIsNewOrderOpen(false);
  const closeDetails = () => setSelectedOrder(undefined);
  const closeDelete = () => setOrderToDelete(undefined);
  const nextCursor = orders.data?.nextCursor;
  const isEmpty = orders.data?.data.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter and register orders.
          </p>
        </div>
        <Button onClick={() => setIsNewOrderOpen(true)}>
          <PlusIcon />
          New order
        </Button>
      </div>

      <OrdersStats />

      <section className="flex min-h-[32rem] flex-1 flex-col overflow-hidden sm:min-h-80 rounded-xl border border-slate-200 bg-white shadow-sm">
        <OrdersToolbar
          searchInput={view.searchInput}
          status={view.query.status}
          onSearchChange={view.setSearchInput}
          onStatusChange={view.setStatus}
          onClear={view.clearFilters}
        />
        {orders.isError ? (
          <div
            role="alert"
            className="m-4 flex shrink-0 items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>Could not load orders.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => orders.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <SearchIcon className="size-8 text-slate-300" />
            <p className="font-medium text-slate-700">No orders match.</p>
            <p className="text-sm text-slate-500">
              Try a different search or status.
            </p>
          </div>
        ) : (
          <OrdersTable
            orders={orders.data?.data}
            sort={view.query.sort}
            dir={view.query.dir}
            isDimmed={orders.isPlaceholderData}
            onSort={view.toggleSort}
            onViewDetails={setSelectedOrder}
            onDelete={setOrderToDelete}
          />
        )}
        <PaginationControls
          page={view.page}
          canGoPrevious={view.page > 1 && !orders.isPlaceholderData}
          canGoNext={Boolean(nextCursor) && !orders.isPlaceholderData}
          onPrevious={view.goPrevious}
          onNext={() => nextCursor && view.goNext(nextCursor)}
        />
      </section>

      <Dialog open={isNewOrderOpen} title="New order" onClose={closeNewOrder}>
        <OrderForm onCreated={closeNewOrder} onCancel={closeNewOrder} />
      </Dialog>

      <Dialog
        open={selectedOrder !== undefined}
        title="Order details"
        onClose={closeDetails}
      >
        {selectedOrder && (
          <OrderDetails order={selectedOrder} onClose={closeDetails} />
        )}
      </Dialog>

      <DeleteOrderDialog orderId={orderToDelete?.id} onClose={closeDelete} />
    </div>
  );
}
