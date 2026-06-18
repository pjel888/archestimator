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
 * Masthead greeting — a compact orientation strip that owns the first dashboard
 * row without competing with the destination tiles below it.
 */
export function DashboardHero({ displayName }: DashboardHeroProps) {
  const hydrated = useIsHydrated();
  const tone = hydrated ? getWorkshopGreetingTone() : GREETING_PLACEHOLDER_TONE;
  const name = formatWorkshopGreetingName(displayName);

  const PeriodIcon = tone.icon === "moon" ? MoonStarsIcon : SunHorizonIcon;

  return (
    <section aria-label="Workshop greeting" className="flex h-full min-h-0 items-end px-2 py-2">
      <h1 className="flex flex-col items-start gap-1 uppercase leading-none text-ink">
        <span className="grid size-3 place-items-center text-secondary">
          <PeriodIcon role="img" aria-label={tone.periodLabel} weight="regular" className="size-full" />
        </span>
        <span className="font-numeric text-[10px] font-medium text-secondary">{tone.greeting}</span>
        <span className="font-display text-[14px] font-medium">{name}</span>
      </h1>
    </section>
  );
}
