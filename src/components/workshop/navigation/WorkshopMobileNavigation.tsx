"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { onboardingTarget } from "@/lib/onboarding/target-catalog";
import { cn } from "@/lib/ui/cn";
import {
  getWorkshopNavigationItems,
  isWorkshopNavigationItemActive,
} from "./workshop-navigation";

export function WorkshopMobileNavigation({
  disabledNavIds,
}: {
  disabledNavIds: readonly string[];
}) {
  const pathname = usePathname();
  const items = getWorkshopNavigationItems({ disabledNavIds });

  return (
    <nav
      id="workshop-mobile-navigation"
      aria-label="Workshop navigation"
      className="flex max-w-[min(58vw,22rem)] items-center gap-1 overflow-x-auto lg:hidden"
      {...onboardingTarget("nav.mobile_menu")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isWorkshopNavigationItemActive(pathname, item);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-xs border outline-none",
              active
                ? "border-primary/20 bg-orange-50 text-brand-orange-dark"
                : "border-transparent text-secondary hover:border-hairline hover:bg-surfaceMuted hover:text-ink",
            )}
            {...(item.onboardingTargetKey
              ? onboardingTarget(item.onboardingTargetKey)
              : {})}
          >
            <Icon size={16} aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
