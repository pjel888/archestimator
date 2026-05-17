import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Copy, FileText, FolderOpen, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/ui/cn";

type SidebarItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/projects", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Cost Library", icon: BookOpen },
  { label: "Proposals", icon: FileText },
  { label: "Clients", icon: Users },
  { label: "Templates", icon: Copy },
  { label: "Settings", icon: Settings },
];

type AppWorkspaceShellProps = {
  children: ReactNode;
  activeItem?: string;
  topBar?: ReactNode;
  bodyClassName?: string;
};

export function AppWorkspaceShell({ children, activeItem = "Projects", topBar, bodyClassName }: AppWorkspaceShellProps) {
  return (
    <div data-testid="app-workspace-shell" className="flex h-dvh min-h-screen overflow-hidden bg-canvas text-foreground">
      <aside className="hidden w-[220px] shrink-0 border-r border-divider bg-surface lg:flex lg:flex-col">
        <div className="border-b border-hairline px-5 py-4">
          <Link href="/projects" className="block text-base font-medium tracking-[-0.01em] text-ink">
            Archestimator
          </Link>
          <p className="mt-1 text-xs text-muted">Estimate workspace</p>
        </div>
        <nav aria-label="Workspace navigation" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {sidebarItems.map((item) => (
            <SidebarNavItem key={item.label} item={item} active={item.label === activeItem} />
          ))}
        </nav>
        <div className="border-t border-hairline px-5 py-4 text-xs leading-5 text-muted">
          Local-first MVP
          <span className="mt-1 block text-ink">No cloud sync connected</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar ? <div className="shrink-0 border-b border-divider bg-surface">{topBar}</div> : null}
        <main className={cn("min-h-0 flex-1 overflow-auto bg-canvas", bodyClassName)}>{children}</main>
      </div>
    </div>
  );
}

function SidebarNavItem({ item, active }: { item: SidebarItem; active: boolean }) {
  const Icon = item.icon;
  const classes = cn(
    "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
    active ? "bg-ink text-white" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
    !item.href ? "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-secondary" : null,
  );

  const content = (
    <>
      <Icon className="size-4" aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <div className={classes} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={classes} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

type WorkspaceTopBarProps = {
  eyebrow?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
};

export function WorkspaceTopBar({ eyebrow, title, meta, actions, stats }: WorkspaceTopBarProps) {
  return (
    <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{eyebrow}</p> : null}
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="truncate text-xl font-medium tracking-[-0.025em] text-ink">{title}</h1>
          {meta ? <div className="text-sm text-muted">{meta}</div> : null}
        </div>
      </div>
      {(stats || actions) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {stats}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
