"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteOrderErrorMessage } from "@/lib/orders/delete-order-error-message";
import { useDeleteOrder } from "@/lib/orders/use-delete-order";

interface DeleteOrderDialogProps {
  orderId: string | undefined;
  onClose: () => void;
}

export function DeleteOrderDialog({
  orderId,
  onClose,
}: DeleteOrderDialogProps) {
  const deleteOrder = useDeleteOrder();

  const close = () => {
    deleteOrder.reset();
    onClose();
  };

  const confirm = () => {
    if (orderId) {
      deleteOrder.mutate(orderId, { onSuccess: close });
    }
  };

  return (
    <Dialog open={orderId !== undefined} title="Delete order?" onClose={close}>
      <div className="space-y-4 px-6 py-8 text-center">
        <p className="text-slate-700">
          Are you sure you want to delete this order?
        </p>
        {deleteOrder.isError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {deleteOrderErrorMessage(deleteOrder.error)}
          </p>
        )}
      </div>
      <div className="flex justify-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={deleteOrder.isPending}
          onClick={confirm}
        >
          {deleteOrder.isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Dialog>
  );
}
