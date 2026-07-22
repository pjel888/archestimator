"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_HREFS,
  isAdminNavActive,
} from "@/components/admin/admin-nav";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/overlays/dialog";
import { cn } from "@/lib/ui/cn";

type AdminMobileMoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full admin destination sheet for mobile. Built on the shared Dialog/Sheet
 * primitives (portal, focus trap, scroll lock, Escape, return-focus) so we
 * do not maintain a second overlay stack. overlayCloseGraceMs blocks the
 * opening tap from immediately dismissing the sheet on touch devices.
 */
export function AdminMobileMoreSheet({ open, onOpenChange }: AdminMobileMoreSheetProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // Warm likely next destinations while the sheet is open — cheap on CF/edge
    // and removes cold RSC waits when the user picks a non-primary route.
    for (const href of ADMIN_NAV_HREFS) {
      router.prefetch(href);
    }
  }, [open, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeLabel="Close admin navigation"
      modal
      overlayCloseGraceMs={400}
    >
      <DialogPortal>
        <div className="fixed inset-0 z-[1000] md:hidden" role="presentation">
          <DialogOverlay className="bg-ink/35" />
          <DialogContent
            id="admin-mobile-more-sheet"
            described
            initialFocus="first"
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[min(78dvh,640px)] w-full rounded-none rounded-t-[var(--glass-radius)] border-b-0",
              "bg-[var(--glass-bg-fallback)] shadow-[var(--glass-shadow)]",
              "supports-[backdrop-filter]:bg-[var(--glass-bg)] supports-[backdrop-filter]:backdrop-blur-[var(--glass-blur)] supports-[backdrop-filter]:backdrop-saturate-[var(--glass-saturate)]",
              "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            )}
          >
            <DialogHeader className="px-3 py-2">
              <div className="min-w-0">
                <DialogTitle>All admin sections</DialogTitle>
                <DialogDescription>Every control-plane destination</DialogDescription>
              </div>
              <DialogCloseButton className="h-9 w-9" />
            </DialogHeader>

            <DialogBody className="overflow-y-auto overscroll-contain px-2 py-2" aria-label="All admin sections">
              <nav>
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
                              prefetch
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
            </DialogBody>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
