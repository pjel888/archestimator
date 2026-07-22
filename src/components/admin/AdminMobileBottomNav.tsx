"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DotsThreeOutline } from "@phosphor-icons/react/dist/ssr";

import {
  ADMIN_MOBILE_PRIMARY_HREFS,
  ADMIN_MOBILE_PRIMARY_NAV,
} from "@/components/admin/admin-mobile-primary-nav";
import { isAdminNavActive, isAdminPrimaryNavRoute } from "@/components/admin/admin-nav-utils";
import { cn } from "@/lib/ui/cn";

const AdminMobileMoreSheet = dynamic(
  () =>
    import("@/components/admin/AdminMobileMoreSheet").then((module) => module.AdminMobileMoreSheet),
  { ssr: false },
);

/**
 * Floating app-style bottom navigation for /admin on small viewports.
 * Desktop continues to use the left sidebar; this chrome is md:hidden only.
 *
 * The More sheet (full nav icon set + Dialog primitives) is code-split and only
 * loaded on first open / idle prefetch so the primary chrome stays light.
 */
export function AdminMobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreMounted, setMoreMounted] = useState(false);
  const moreActive = moreOpen || isAdminPrimaryNavRoute(pathname, ADMIN_MOBILE_PRIMARY_HREFS);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (moreOpen) {
      setMoreMounted(true);
      return;
    }
    if (moreMounted || typeof window === "undefined") return;

    let cancelled = false;
    const warm = () => {
      if (!cancelled) setMoreMounted(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(warm, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [moreMounted, moreOpen]);

  function openMore() {
    setMoreMounted(true);
    setMoreOpen(true);
  }

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
            "rounded-[var(--glass-radius)] border border-[var(--glass-border)]",
            /* Solid fill on mobile — backdrop-filter is a steady GPU cost and not needed for readability. */
            "bg-[var(--glass-bg-fallback)] px-1.5 py-1 shadow-[var(--glass-shadow)]",
          )}
        >
          {ADMIN_MOBILE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = !moreOpen && isAdminNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
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
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (moreOpen) setMoreOpen(false);
              else openMore();
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

      {moreMounted ? <AdminMobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} /> : null}
    </>
  );
}
