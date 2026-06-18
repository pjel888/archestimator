"use client";

import { MoonStarsIcon, SunHorizonIcon } from "@phosphor-icons/react/dist/ssr";

import { useIsHydrated } from "@/hooks/use-is-hydrated";

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
 * Masthead greeting — reference-style editorial type over the canvas wash, no
 * card/border/frost. The time-of-day greeting is the headline, not a marketing
 * kicker, so the dashboard opens with direct user orientation.
 */
export function DashboardHero({ displayName }: DashboardHeroProps) {
  const hydrated = useIsHydrated();
  const tone = hydrated ? getWorkshopGreetingTone() : GREETING_PLACEHOLDER_TONE;
  const name = formatWorkshopGreetingName(displayName);

  const PeriodIcon = tone.icon === "moon" ? MoonStarsIcon : SunHorizonIcon;

  return (
    <section aria-label="Workshop greeting" className="flex min-h-[118px] flex-col justify-center">
      <h1 className="font-display text-[34px] font-semibold uppercase leading-[0.96] text-ink sm:text-[44px] lg:text-[54px]">
        <span className="flex items-center gap-2">
          <span className="grid size-[18px] place-items-center text-secondary sm:size-[20px]">
            <PeriodIcon role="img" aria-label={tone.periodLabel} weight="regular" className="size-full" />
          </span>
          <span>{tone.greeting}</span>
        </span>
        <span className="block">{name}</span>
      </h1>
    </section>
  );
}
