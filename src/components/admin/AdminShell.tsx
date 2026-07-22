"use client";

import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMobileBottomNav } from "@/components/admin/AdminMobileBottomNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminShellProps = {
  children: ReactNode;
  displayName: string;
  email: string;
};

/**
 * Admin app chrome: desktop left rail + header; mobile floating bottom nav.
 * Content padding reserves space for the mobile nav without clipping data.
 */
export function AdminShell({ children, displayName, email }: AdminShellProps) {
  return (
    <main className="flex h-[100dvh] overflow-hidden bg-surfaceMuted/40 text-ink" aria-label="Admin dashboard">
      <AdminSidebar />
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Admin workspace">
        <AdminHeader displayName={displayName} email={email} />
        <div
          className={[
            "min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain bg-white",
            "px-3 py-3 sm:p-4",
            /* Reserve thumb-nav + safe-area clearance on mobile app chrome */
            "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-4",
          ].join(" ")}
        >
          {children}
        </div>
      </section>
      <AdminMobileBottomNav />
    </main>
  );
}
