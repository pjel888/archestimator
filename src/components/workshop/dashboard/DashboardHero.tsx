"use client";

import { MoonStarsIcon, SunHorizonIcon } from "@phosphor-icons/react/dist/ssr";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { cn } from "@/lib/ui/cn";

type WorkshopGreetingTone = { icon: "sun" | "moon"; periodLabel: string; greeting: string };

function getWorkshopGreetingTone(date = new Date()): WorkshopGreetingTone {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { icon: "sun", periodLabel: "Morning", greeting: "Good morning" };
  if (hour >= 12 && hour < 18) return { icon: "sun", periodLabel: "Afternoon", greeting: "Good afternoon" };
  return { icon: "moon", periodLabel: "Night", greeting: "Good evening" };
}

function formatWorkshopGreetingName(displayName?: string | null) {
  const trimmed = displayName?.trim();
  if (!trimmed) return "there";
  if (!trimmed.includes("@")) return trimmed.slice(0, 48);
  return trimmed.split("@")[0].replace(/[._-]+/g, " ").trim().slice(0, 48) || "there";
}

const GREETING_PLACEHOLDER_TONE: WorkshopGreetingTone = {
  icon: "sun",
  periodLabel: "Morning",
  greeting: "Good morning",
};

type DashboardHeroProps = {
  displayName?: string | null;
};

/**
 * Masthead greeting — plain over the canvas wash, no card/border/frost.
 *
 * Kicker is the new technical voice (Roboto Mono `font-numeric`); name is the
 * Zilla Slab display face. Test hooks (section aria-label, greeting tone/name
 * helpers, the SSR-stable placeholder swap, and the icon's role/aria-label with
 * no border/bg/aria-label on its wrapper) are preserved verbatim.
 */
export function DashboardHero({ displayName }: DashboardHeroProps) {
  const hydrated = useIsHydrated();
  const tone = hydrated ? getWorkshopGreetingTone() : GREETING_PLACEHOLDER_TONE;
  const name = formatWorkshopGreetingName(displayName);

  const PeriodIcon = tone.icon === "moon" ? MoonStarsIcon : SunHorizonIcon;

  return (
    <section aria-label="Workshop greeting" className="flex flex-col gap-[6px]">
      <p className="flex items-center gap-[6px] font-numeric text-[11px] font-normal text-secondary">
        <span className="grid size-[16px] place-items-center text-secondary">
          <PeriodIcon
            role="img"
            aria-label={tone.periodLabel}
            weight="regular"
            className="size-[16px]"
          />
        </span>
        <span>{tone.greeting}</span>
      </p>

      <h1
        className={cn(
          "max-w-full truncate font-display text-[34px] font-medium leading-[1.1] text-ink",
        )}
        title={name}
      >
        {name}
      </h1>
    </section>
  );
}
