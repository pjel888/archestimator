"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Buildings,
  ChartLine,
  Coins,
  ClipboardText,
  Flag,
  FolderOpen,
  Gauge,
  Headset,
  Lightning,
  Megaphone,
  Pulse,
  Rocket,
  SidebarSimple,
  TreeStructure,
  Users,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { cn } from "@/lib/ui/cn";

// F1 (UNIT-002) grouped navigation, after the pack's information architecture.
// Only existing routes are linked — no dead/coming-soon entries. Group headers
// are hidden when the sidebar is collapsed (icons render flat, as before).
export const ADMIN_NAV_GROUPS = [
  {
    label: "Home",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge },
      { href: "/admin/today", label: "Today", icon: Lightning },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/accounts", label: "Accounts", icon: Buildings },
      { href: "/admin/support", label: "Support", icon: Headset },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderOpen },
      { href: "/admin/estimate-system", label: "Estimate System", icon: TreeStructure },
      { href: "/admin/analytics", label: "Analytics", icon: ChartLine },
      { href: "/admin/financials", label: "Financials", icon: Coins },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/releases", label: "Releases", icon: Rocket },
      { href: "/admin/observability", label: "Observability", icon: Pulse },
    ],
  },
  {
    label: "Communications",
    items: [{ href: "/admin/notifications", label: "Notifications", icon: Megaphone }],
  },
  {
    label: "Governance",
    items: [
      { href: "/admin/flags", label: "Flags", icon: Flag },
      { href: "/admin/audit", label: "Audit", icon: ClipboardText },
    ],
  },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useAdminUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAdminUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-hairline bg-white text-ink transition-[width] duration-150",
        collapsed ? "w-[54px]" : "w-[54px] sm:w-[188px]",
      )}
      aria-label="Admin navigation"
    >
      <div className="flex h-12 items-center justify-between border-b border-hairline px-2">
        <div className={cn("min-w-0 max-sm:sr-only", collapsed && "sr-only")}>
          <p className="text-[11px] font-medium leading-4 text-ink">Admin</p>
          <p className="text-[9px] leading-3 text-tertiary">Platform controls</p>
        </div>
        <Button
          aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
          aria-pressed={collapsed}
          variant="ghost"
          size="icon-xs"
          onClick={toggleSidebar}
          className="hidden shrink-0 sm:inline-flex"
        >
          <SidebarSimple size={13} weight="regular" aria-hidden="true" />
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5" aria-label="Admin sections">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p
              className={cn(
                "px-2 text-[8px] font-medium uppercase leading-3 text-tertiary",
                "max-sm:sr-only",
                collapsed && "sr-only",
              )}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-xs px-2 text-[10px] font-medium leading-none transition-colors",
                    active ? "bg-surfaceMuted text-ink" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
                    "max-sm:justify-center max-sm:px-0",
                    collapsed && "justify-center px-0",
                  )}
                  title={item.label}
                >
                  <Icon size={14} weight="regular" className="shrink-0" aria-hidden="true" />
                  <span className={cn("truncate max-sm:sr-only", collapsed && "sr-only")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
