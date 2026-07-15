"use client";

import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminShellProps = {
  children: ReactNode;
  displayName: string;
  email: string;
};

export function AdminShell({ children, displayName, email }: AdminShellProps) {
  return (
    <main className="flex h-[100dvh] overflow-hidden bg-surfaceMuted/50 text-ink" aria-label="Admin dashboard">
      <AdminSidebar />
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Admin workspace">
        <AdminHeader displayName={displayName} email={email} />
        <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto bg-white p-2">{children}</div>
      </section>
    </main>
  );
}
