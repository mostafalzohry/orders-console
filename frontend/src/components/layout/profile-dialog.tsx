"use client";

import { Button } from "@/components/ui/button";
import { LabeledValue } from "@/components/ui/labeled-value";
import { Dialog } from "@/components/ui/dialog";
import { useMe } from "@/lib/auth/use-me";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const me = useMe();

  return (
    <Dialog open={open} title="Profile" onClose={onClose}>
      <div className="px-6 py-5">
        {me.isError ? (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>Could not load your profile.</span>
            <Button variant="secondary" size="sm" onClick={() => me.refetch()}>
              Retry
            </Button>
          </div>
        ) : me.data ? (
          <dl className="space-y-4">
            <LabeledValue label="Email">{me.data.email}</LabeledValue>
            <LabeledValue label="Role">
              <span className="capitalize">{me.data.role}</span>
            </LabeledValue>
          </dl>
        ) : (
          <div className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="h-4 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
