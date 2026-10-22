"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLogout } from "@/lib/auth/use-logout";
import { useMe } from "@/lib/auth/use-me";
import { ProfileDialog } from "./profile-dialog";

const MENU_ITEM_CLASS =
  "block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

export function UserMenu() {
  const { data: user } = useMe();
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const closeMenu = () => setIsOpen(false);

  const closeOnEscape = (event: KeyboardEvent) => {
    if (isOpen && event.key === "Escape") {
      closeMenu();
      triggerRef.current?.focus();
    }
  };

  const openProfile = () => {
    closeMenu();
    setIsProfileOpen(true);
  };

  return (
    <div className="relative" onKeyDown={closeOnEscape}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition hover:bg-slate-100"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white uppercase"
        >
          {user?.email.charAt(0)}
        </span>
        <span className="hidden text-sm text-slate-700 sm:inline">
          {user?.email}
        </span>
        <span aria-hidden="true" className="text-xs text-slate-400">
          ▾
        </span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={closeMenu}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            id={menuId}
            className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {user && (
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.email}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 capitalize">
                  {user.role}
                </p>
              </div>
            )}
            <div className="mt-1.5">
              <button
                type="button"
                autoFocus
                onClick={openProfile}
                className={MENU_ITEM_CLASS}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className={MENU_ITEM_CLASS}
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}

      <ProfileDialog
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
