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

type WorkshopHeaderGreetingProps = {
  displayName?: string | null;
};

export function WorkshopHeaderGreeting({ displayName }: WorkshopHeaderGreetingProps) {
  const hydrated = useIsHydrated();
  const tone = hydrated ? getWorkshopGreetingTone() : GREETING_PLACEHOLDER_TONE;
  const name = formatWorkshopGreetingName(displayName);
  const PeriodIcon = tone.icon === "moon" ? MoonStarsIcon : SunHorizonIcon;

  return (
    <div className="flex h-10 min-w-0 items-center gap-2" aria-label={`${tone.greeting}, ${name}`}>
      <span className="grid h-10 shrink-0 place-items-center px-4 text-secondary">
        <PeriodIcon role="img" aria-label={tone.periodLabel} weight="regular" className="size-7" />
      </span>
      <h1 className="flex min-w-0 flex-col justify-center leading-none text-ink">
        <span className="truncate font-numeric text-[10px] font-light uppercase leading-3 text-secondary">
          {tone.greeting}
        </span>
        <span className="truncate font-display text-[14px] font-bold uppercase leading-4 tracking-normal">
          {name}
        </span>
      </h1>
    </div>
  );
}
