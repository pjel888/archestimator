import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  ChartBar,
  ChartBarHorizontal,
  ClipboardText,
  ClockCounterClockwise,
  ShareNetwork,
} from "@phosphor-icons/react/dist/ssr";

export type ProjectNavigationItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
  exact: boolean;
};

export function getProjectNavigationItems(
  projectId: string,
): readonly ProjectNavigationItem[] {
  const root = `/workshop/projects/${projectId}`;
  return [
    {
      href: root,
      label: "Dashboard",
      icon: ChartBar,
      exact: true,
    },
    {
      href: `${root}/estimates`,
      label: "Estimates",
      icon: ClipboardText,
      exact: false,
    },
    {
      href: `${root}/data`,
      label: "Data",
      icon: ChartBarHorizontal,
      exact: false,
    },
    {
      href: `${root}/activity`,
      label: "Activity",
      icon: ClockCounterClockwise,
      exact: false,
    },
    {
      href: `${root}/client-portals`,
      label: "Portals",
      icon: ShareNetwork,
      exact: false,
    },
  ];
}

export function isProjectNavigationItemActive(
  pathname: string | null,
  item: Pick<ProjectNavigationItem, "exact" | "href">,
) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href ||
        Boolean(pathname?.startsWith(`${item.href}/`));
}
