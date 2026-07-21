"use client";

import Link from "next/link";
import { ArrowSquareOut, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { Badge } from "@/components/ui/badge";

type AdminHeaderProps = {
  displayName: string;
  email: string;
};

export function AdminHeader({ displayName, email }: AdminHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-hairline bg-white px-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
          <p className="truncate text-[11px] font-medium leading-4 text-ink">Admin</p>
          <Badge tone="neutral" size="xs" className="hidden min-w-0 px-1 normal-case sm:inline-flex">
            gated
          </Badge>
        </div>
        <p className="truncate text-[9px] leading-3 text-tertiary">
          <span className="sm:hidden">{displayName}</span>
          <span className="hidden sm:inline">
            Signed in as {displayName} - {email}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <AdminCommandPalette />
        <Link
          href="/workshop"
          className="inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-h-7"
        >
          <span className="sm:hidden">App</span>
          <span className="hidden sm:inline">Workshop</span>
          <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
