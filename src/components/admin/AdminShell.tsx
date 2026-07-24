"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";

const AdminSidebar = dynamic(
  () => import("@/components/admin/AdminSidebar").then((module) => module.AdminSidebar),
  { ssr: false },
);

const AdminMobileBottomNav = dynamic(
  () =>
    import("@/components/admin/AdminMobileBottomNav").then((module) => module.AdminMobileBottomNav),
  { ssr: false },
);

type AdminShellProps = {
  children: ReactNode;
  displayName: string;
  email: string;
};

/**
 * Admin app chrome: desktop left rail + header; mobile floating bottom nav.
 * Only one chrome tree mounts per viewport once matchMedia is known — phones
 * never hydrate the full sidebar icon set.
 */
export function AdminShell({ children, displayName, email }: AdminShellProps) {
  const [viewport, setViewport] = useState<"pending" | "mobile" | "desktop">("pending");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setViewport(media.matches ? "desktop" : "mobile");
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <main
      className="flex h-[100dvh] overflow-hidden bg-surfaceMuted/40 text-ink"
      aria-label="Admin dashboard"
      data-admin-shell-root
    >
      {viewport === "desktop" ? <AdminSidebar /> : null}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden" aria-label="Admin workspace">
        <AdminHeader displayName={displayName} email={email} />
        <div
          className={[
            "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-white",
            "px-3 py-3 sm:p-4",
            "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-4",
            "scroll-pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:scroll-pb-4",
          ].join(" ")}
        >
          {children}
        </div>
      </section>
      {viewport === "mobile" ? <AdminMobileBottomNav /> : null}
    </main>
  );
}
