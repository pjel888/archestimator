"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarSimple } from "@phosphor-icons/react/dist/ssr";

import { ADMIN_NAV_GROUPS, isAdminNavActive } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { cn } from "@/lib/ui/cn";

export { ADMIN_NAV_GROUPS } from "@/components/admin/admin-nav";

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useAdminUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAdminUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-hairline bg-white text-ink transition-[width] duration-150 md:flex",
        collapsed ? "md:w-[54px]" : "md:w-[188px]",
      )}
      aria-label="Admin navigation"
    >
      <div className="flex h-12 items-center justify-between border-b border-hairline px-2">
        <div className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="text-[11px] font-medium leading-4 text-ink">Admin</p>
          <p className="text-[9px] leading-3 text-tertiary">Platform controls</p>
        </div>
        <Button
          aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
          aria-pressed={collapsed}
          variant="ghost"
          size="icon-xs"
          onClick={toggleSidebar}
          className="shrink-0"
        >
          <SidebarSimple size={16} weight="regular" aria-hidden="true" />
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5" aria-label="Admin sections">
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p
              className={cn(
                "px-2 text-[8px] font-medium uppercase leading-3 text-tertiary",
                collapsed && "sr-only",
              )}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isAdminNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-2 rounded-xs px-2 text-[10px] font-medium leading-none transition-colors",
                    active ? "bg-surfaceMuted text-ink" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
                    collapsed && "justify-center px-0",
                  )}
                  title={item.label}
                >
                  <Icon size={14} weight="regular" className="pointer-events-none shrink-0" aria-hidden="true" />
                  <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
