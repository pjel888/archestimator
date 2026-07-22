/**
 * Lightweight primary thumb targets for the floating mobile bottom nav.
 * Kept separate from ADMIN_NAV_GROUPS so the More sheet can own the full icon set.
 */
import type { ComponentType, SVGProps } from "react";
import { Gauge, Headset, Lightning, Users } from "@phosphor-icons/react/dist/ssr";

type PhosphorIcon = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  }
>;

export type AdminPrimaryNavItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
};

export const ADMIN_MOBILE_PRIMARY_NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/today", label: "Today", icon: Lightning },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/support", label: "Support", icon: Headset },
] as const satisfies readonly AdminPrimaryNavItem[];

export const ADMIN_MOBILE_PRIMARY_HREFS = ADMIN_MOBILE_PRIMARY_NAV.map((item) => item.href);
