/**
 * Shared admin navigation model — desktop sidebar and mobile More sheet
 * consume the same groups so no route or label is lost when chrome adapts.
 */
import type { ComponentType, SVGProps } from "react";
import {
  Buildings,
  Chats,
  ChartLine,
  Coins,
  ClipboardText,
  Database,
  EnvelopeSimple,
  Flag,
  FolderOpen,
  Gauge,
  Headset,
  Lightning,
  Megaphone,
  Notepad,
  Pulse,
  Rocket,
  ShieldCheck,
  Sparkle,
  TreeStructure,
  Users,
} from "@phosphor-icons/react/dist/ssr";

import { ADMIN_MOBILE_PRIMARY_NAV } from "@/components/admin/admin-mobile-primary-nav";
import { isAdminNavActive, isAdminPrimaryNavRoute as matchPrimaryRoute } from "@/components/admin/admin-nav-utils";

type PhosphorIcon = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  }
>;

export type AdminNavItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
};

export type AdminNavGroup = {
  label: string;
  items: readonly AdminNavItem[];
};

export { ADMIN_MOBILE_PRIMARY_NAV } from "@/components/admin/admin-mobile-primary-nav";
export { isAdminNavActive } from "@/components/admin/admin-nav-utils";

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
      { href: "/admin/allowlist", label: "Allowlist", icon: EnvelopeSimple },
      { href: "/admin/accounts", label: "Accounts", icon: Buildings },
      { href: "/admin/support", label: "Support", icon: Headset },
      { href: "/admin/saved-replies", label: "Saved Replies", icon: Notepad },
    ],
  },
  {
    label: "Product",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderOpen },
      { href: "/admin/estimate-system", label: "Estimate System", icon: TreeStructure },
      { href: "/admin/analytics", label: "Analytics", icon: ChartLine },
      { href: "/admin/financials", label: "Financials", icon: Coins },
      { href: "/admin/copilot", label: "AI Copilot", icon: Sparkle },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/releases", label: "Releases", icon: Rocket },
      { href: "/admin/data-quality", label: "Data Quality", icon: Database },
      { href: "/admin/observability", label: "Observability", icon: Pulse },
    ],
  },
  {
    label: "Communications",
    items: [
      { href: "/admin/communications", label: "Communications", icon: Chats },
      { href: "/admin/notifications", label: "Notifications", icon: Megaphone },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/admin/flags", label: "Flags", icon: Flag },
      { href: "/admin/audit", label: "Audit", icon: ClipboardText },
      { href: "/admin/privacy", label: "Privacy", icon: ShieldCheck },
    ],
  },
] as const satisfies readonly AdminNavGroup[];

export function isAdminPrimaryNavRoute(pathname: string) {
  return matchPrimaryRoute(
    pathname,
    ADMIN_MOBILE_PRIMARY_NAV.map((item) => item.href),
  );
}

/** Flat href list for route prefetch when the More sheet opens. */
export const ADMIN_NAV_HREFS = ADMIN_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => item.href),
);
