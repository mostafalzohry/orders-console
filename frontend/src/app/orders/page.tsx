import { AppHeader } from "@/components/layout/app-header";
import { OrdersView } from "@/components/orders/orders-view";

export default function OrdersPage() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <OrdersView />
      </main>
    </div>
  );
}
