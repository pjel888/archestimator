"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DotsThreeOutline } from "@phosphor-icons/react/dist/ssr";

import {
  ADMIN_MOBILE_PRIMARY_NAV,
  isAdminNavActive,
  isAdminPrimaryNavRoute,
} from "@/components/admin/admin-nav";
import { AdminMobileMoreSheet } from "@/components/admin/AdminMobileMoreSheet";
import { cn } from "@/lib/ui/cn";

/**
 * Floating app-style bottom navigation for /admin on small viewports.
 * Desktop continues to use the left sidebar; this chrome is md:hidden only.
 */
export function AdminMobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreOpen || !isAdminPrimaryNavRoute(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Admin mobile navigation"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[900] md:hidden",
          "px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1",
          moreOpen && "invisible",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto flex max-w-lg items-stretch gap-0.5",
            "rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg-fallback)]",
            "px-1.5 py-1 shadow-[var(--glass-shadow)]",
            "supports-[backdrop-filter]:bg-[var(--glass-bg)] supports-[backdrop-filter]:backdrop-blur-[var(--glass-blur)] supports-[backdrop-filter]:backdrop-saturate-[var(--glass-saturate)]",
          )}
        >
          {ADMIN_MOBILE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = !moreOpen && isAdminNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--glass-nav-radius)] px-1 py-1",
                  "text-[8px] font-medium leading-3 transition-[background-color,color,transform] duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  "active:scale-[0.97] motion-reduce:active:scale-100",
                  active
                    ? "bg-orange-50 text-orange-700 shadow-[inset_0_0_0_1px_rgb(194,65,12)]"
                    : "text-tertiary hover:bg-[var(--glass-nav-hover-bg)] hover:text-ink",
                )}
              >
                <Icon size={18} weight="regular" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="More admin sections"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-controls="admin-mobile-more-sheet"
            onPointerDown={(event) => {
              // Keep the opening gesture on this control so the portaled
              // backdrop cannot receive the same pointerup/click.
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              setMoreOpen((open) => !open);
            }}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--glass-nav-radius)] px-1 py-1",
              "text-[8px] font-medium leading-3 transition-[background-color,color,transform] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "active:scale-[0.97] motion-reduce:active:scale-100",
              moreActive
                ? "bg-orange-50 text-orange-700 shadow-[inset_0_0_0_1px_rgb(194,65,12)]"
                : "text-tertiary hover:bg-[var(--glass-nav-hover-bg)] hover:text-ink",
            )}
          >
            <DotsThreeOutline size={18} weight="regular" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <AdminMobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
