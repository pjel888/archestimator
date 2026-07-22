"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "@phosphor-icons/react/dist/ssr";

import {
  ADMIN_NAV_GROUPS,
  isAdminNavActive,
} from "@/components/admin/admin-nav";
import { cn } from "@/lib/ui/cn";

type AdminMobileMoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full admin destination sheet for mobile. Preserves every sidebar group and
 * link that the desktop rail exposes — nothing is dropped behind "More".
 *
 * Portaled to document.body so it escapes AdminShell overflow clipping, and
 * dismiss is deferred until the opening pointer gesture ends so the backdrop
 * does not immediately swallow the same tap that opened the sheet.
 */
export function AdminMobileMoreSheet({ open, onOpenChange }: AdminMobileMoreSheetProps) {
  const pathname = usePathname();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dismissReadyRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      dismissReadyRef.current = false;
      return;
    }

    // Ignore backdrop dismiss for a short window after open. Mobile browsers
    // can deliver a ghost click/pointerup onto a newly mounted overlay under
    // the same finger that pressed More; a pointerup-based ready gate fails
    // in that case because the ghost gesture itself marks dismiss ready.
    dismissReadyRef.current = false;
    const readyFallback = window.setTimeout(() => {
      dismissReadyRef.current = true;
    }, 400);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusId = requestAnimationFrame(() => closeRef.current?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(readyFallback);
      cancelAnimationFrame(focusId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  function requestClose() {
    if (!dismissReadyRef.current) return;
    onOpenChange(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/35 transition-opacity duration-150"
        aria-label="Close admin navigation"
        onClick={requestClose}
      />
      <div
        id="admin-mobile-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[min(78dvh,640px)] flex-col overflow-hidden",
          "rounded-t-[var(--glass-radius)] border border-hairline border-b-0 bg-[var(--glass-bg-fallback)]",
          "shadow-[var(--glass-shadow)]",
          "supports-[backdrop-filter]:bg-[var(--glass-bg)] supports-[backdrop-filter]:backdrop-blur-[var(--glass-blur)] supports-[backdrop-filter]:backdrop-saturate-[var(--glass-saturate)]",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline px-3 py-2">
          <div className="min-w-0">
            <p id={titleId} className="text-[11px] font-medium leading-4 text-ink">
              All admin sections
            </p>
            <p className="text-[9px] leading-3 text-tertiary">Every control-plane destination</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Close"
          >
            <X size={14} weight="regular" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2" aria-label="All admin sections">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-2 pb-1 text-[8px] font-medium uppercase leading-3 text-tertiary">
                {group.label}
              </p>
              <ul className="grid grid-cols-2 gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isAdminNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-[var(--glass-nav-radius)] px-2.5 py-2 text-[10px] font-medium leading-4 transition-colors duration-150",
                          active
                            ? "bg-orange-50 text-ink shadow-[inset_0_0_0_1px_rgb(194,65,12)]"
                            : "bg-white/70 text-secondary hover:bg-surfaceMuted hover:text-ink",
                        )}
                      >
                        <Icon
                          size={15}
                          weight="regular"
                          className={cn("shrink-0", active ? "text-orange-700" : "text-tertiary")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
