import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  Books,
  Folder,
  Presentation,
  ShareNetwork,
  SquaresFour,
} from "@phosphor-icons/react/dist/ssr";

import type { OnboardingTargetKey } from "@/lib/onboarding/target-catalog";
import type { SidebarNavItem } from "@/components/sidebar/sidebar-types";

export type WorkshopNavigationItem = SidebarNavItem & {
  icon: PhosphorIcon;
  onboardingTargetKey?: OnboardingTargetKey;
};

export const WORKSHOP_HOME_NAV_ID = "workshop";

const WORKSHOP_NAVIGATION_ITEMS: readonly WorkshopNavigationItem[] = [
  {
    id: WORKSHOP_HOME_NAV_ID,
    href: "/workshop",
    label: "Workshop",
    icon: SquaresFour,
    shortcut: "⌘1",
  },
  {
    id: "projects",
    href: "/workshop/projects",
    label: "Projects",
    icon: Folder,
    shortcut: "⌘2",
    onboardingTargetKey: "nav.projects",
  },
  {
    id: "library",
    href: "/workshop/library",
    label: "Library",
    icon: Books,
    shortcut: "⌘3",
  },
  {
    id: "proposals",
    href: "/workshop/proposals",
    label: "Proposals",
    icon: Presentation,
    shortcut: "⌘4",
  },
  {
    id: "publisher",
    href: "/workshop/publisher",
    label: "Share",
    icon: ShareNetwork,
    shortcut: "⌘5",
  },
];

export function getWorkshopNavigationItems({
  disabledNavIds = [],
  projectsBadgeCount = 0,
}: {
  disabledNavIds?: readonly string[];
  projectsBadgeCount?: number;
} = {}): readonly WorkshopNavigationItem[] {
  const disabled = new Set(disabledNavIds);
  return WORKSHOP_NAVIGATION_ITEMS.filter((item) => !disabled.has(item.id)).map(
    (item) => {
      if (item.id !== "projects" || projectsBadgeCount <= 0) return item;
      return {
        ...item,
        badgeCount: projectsBadgeCount,
        badgeLabel: `${projectsBadgeCount} pending ${
          projectsBadgeCount === 1 ? "invite" : "invites"
        }`,
      };
    },
  );
}

export function isWorkshopNavigationItemActive(
  pathname: string | null,
  item: Pick<WorkshopNavigationItem, "href" | "id">,
) {
  if (item.id === WORKSHOP_HOME_NAV_ID) return pathname === item.href;
  return (
    pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`))
  );
}
