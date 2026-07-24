"use client";

import { Check, Circle, Compass } from "@phosphor-icons/react";
import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  dismissActivationChecklist,
  reopenActivationChecklist,
} from "@/lib/onboarding/activation-actions";
import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import type { OnboardingEligibilitySnapshot } from "@/lib/onboarding/flow-types";

export function FirstEstimateChecklist({
  snapshot,
}: {
  snapshot: OnboardingEligibilitySnapshot;
}) {
  const router = useNavigationRouter();
  const [isPending, startTransition] = useTransition();
  const checklist = deriveFirstEstimateChecklist(snapshot);
  if (!checklist.canShow) return null;

  const setVisibility = (action: () => Promise<void>) => startTransition(async () => {
    await action();
    router.refresh();
  });

  if (checklist.isDismissed || checklist.isComplete) {
    return (
      <section
        aria-label="Getting started progress"
        className="mb-2 flex min-h-12 items-center justify-between gap-3 rounded-xs border border-hairline bg-white/80 px-3 py-2"
        data-first-estimate-checklist="collapsed"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-ink">
            {checklist.isComplete ? "Your first estimate is ready" : "Getting started is hidden"}
          </p>
          <p className="truncate text-[9px] text-tertiary">
            {checklist.isComplete
              ? "All 4 steps are complete."
              : `${checklist.completedCount} of ${checklist.items.length} tasks complete.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/workshop/getting-started"
            className="inline-flex min-h-7 items-center gap-1 rounded-xs px-2 text-[10px] font-medium text-accent outline-none hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Compass size={13} aria-hidden="true" />
            Open Getting Started
          </Link>
          {checklist.isDismissed ? (
            <Button
              size="xs"
              variant="secondary"
              disabled={isPending}
              onClick={() => setVisibility(reopenActivationChecklist)}
            >
              Reopen
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Getting started"
      className="mb-2 rounded-xs border border-hairline bg-white/85 p-3"
      data-first-estimate-checklist="expanded"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium text-ink">Your first estimate</h2>
            <span className="font-numeric text-[9px] text-tertiary">
              {checklist.completedCount}/{checklist.items.length}
            </span>
          </div>
          <Progress
            value={checklist.completedCount}
            max={checklist.items.length}
            size="sm"
            className="mt-1.5"
          />
          <p aria-live="polite" className="mt-1.5 text-[9px] leading-4 text-tertiary">
            Progress comes only from saved project and Estimate Sheet work, never from opening a guide.
          </p>
        </div>
        <Button
          size="xs"
          variant="ghost"
          disabled={isPending}
          title="You can reopen it in Settings."
          onClick={() => setVisibility(dismissActivationChecklist)}
        >
          Hide checklist
        </Button>
      </div>
      <ol className="mt-3 grid gap-1 lg:grid-cols-2">
        {checklist.items.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-start gap-2 rounded-xs border border-hairline bg-surface/70 px-2 py-2"
            data-checklist-status={item.status}
          >
            {item.status === "complete" ? (
              <Check className="mt-0.5 shrink-0 text-success" size={13} weight="bold" aria-hidden="true" />
            ) : (
              <Circle
                className={item.status === "next" ? "mt-0.5 shrink-0 text-accent" : "mt-0.5 shrink-0 text-tertiary"}
                size={13}
                weight={item.status === "next" ? "fill" : "regular"}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-ink">{item.label}</p>
              <p className="mt-0.5 text-[9px] leading-3 text-tertiary">{item.description}</p>
            </div>
            <Link
              className="shrink-0 text-[9px] font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              href={item.href}
            >
              {item.status === "next" ? "Continue" : "Open"}
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-end">
        <Link
          href="/workshop/getting-started"
          className="text-[9px] font-medium text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          Open Getting Started
        </Link>
      </div>
    </section>
  );
}
