"use client";

import { ArrowRight, Check, Compass, EyeSlash } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
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
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const checklist = deriveFirstEstimateChecklist(snapshot);
  if (!checklist.canShow) return null;

  const setVisibility = (
    action: () => Promise<void>,
    errorMessage: string,
  ) => startTransition(async () => {
    setVisibilityError(null);
    try {
      await action();
      router.refresh();
    } catch {
      setVisibilityError(errorMessage);
    }
  });

  if (checklist.isDismissed || checklist.isComplete) {
    return (
      <section
        aria-label="Getting started progress"
        className="dashboard-destination-card dashboard-first-estimate--collapsed flex items-center justify-between gap-3"
        data-first-estimate-checklist="collapsed"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid size-7 shrink-0 place-items-center rounded-xs border ${
              checklist.isComplete
                ? "border-success/20 bg-successSoft/70 text-success"
                : "border-[color:var(--destination-inner-border)] bg-white/45 text-secondary"
            }`}
          >
            {checklist.isComplete ? (
              <Check size={14} weight="regular" aria-hidden="true" />
            ) : (
              <Compass size={14} weight="regular" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-medium uppercase leading-none tracking-[0.04em] text-ink">
              {checklist.isComplete ? "Your first estimate is ready" : "Getting started is hidden"}
            </p>
            <p className="mt-1 truncate text-[9px] leading-3 text-secondary">
              {checklist.isComplete
                ? "All 4 steps are complete."
                : `${checklist.completedCount} of ${checklist.items.length} tasks complete.`}
            </p>
            {visibilityError ? (
              <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">
                {visibilityError}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ButtonLink
            href="/workshop/getting-started"
            variant="plain"
            size="xs"
            className="min-h-7 min-w-0 gap-1.5 px-2 !text-[9px] text-ink hover:bg-white/60 hover:text-brand-orange-dark focus-visible:ring-offset-0 motion-reduce:transition-none"
          >
            <Compass size={13} aria-hidden="true" />
            Open Getting Started
            <ArrowRight size={12} aria-hidden="true" />
          </ButtonLink>
          {checklist.isDismissed ? (
            <Button
              size="xs"
              variant="secondary"
              className="!min-w-0 !px-2"
              disabled={isPending}
              onClick={() => setVisibility(
                reopenActivationChecklist,
                "The checklist could not be reopened. Your saved progress was not changed.",
              )}
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
      className="dashboard-destination-card dashboard-first-estimate"
      data-first-estimate-checklist="expanded"
    >
      <div className="dashboard-first-estimate__summary">
        <div className="flex items-center justify-between gap-2">
          <span className="font-numeric text-[8px] font-medium uppercase leading-none text-secondary">
            Getting started
          </span>
          <span
            aria-live="polite"
            className="font-numeric text-[14px] font-normal leading-none text-ink"
          >
            {checklist.completedCount}/{checklist.items.length}
          </span>
        </div>
        <h2 className="dashboard-first-estimate__title mt-1.5 font-display text-[20px] font-medium uppercase leading-[1.05] tracking-[0.04em] text-ink">
          Your first estimate
        </h2>
        <Progress
          value={checklist.completedCount}
          max={checklist.items.length}
          size="sm"
          className="mt-2 [&>div]:bg-[color:var(--destination-inner-list-border)] [&>div>div]:bg-brand-orange"
        />
        <p className="dashboard-first-estimate__principle mt-2 text-[9px] leading-[13px] text-secondary">
          Progress comes only from saved project and Estimate Sheet work, never from opening a guide.
        </p>
        {visibilityError ? (
          <p role="alert" className="mt-1 text-[9px] leading-3 text-danger">
            {visibilityError}
          </p>
        ) : null}
        <div className="dashboard-first-estimate__summary-actions mt-auto flex items-center justify-between gap-2 pt-2">
          <ButtonLink
            href="/workshop/getting-started"
            variant="plain"
            size="xs"
            className="min-h-7 min-w-0 gap-1.5 px-1.5 !text-[9px] text-ink hover:bg-white/55 hover:text-brand-orange-dark focus-visible:ring-offset-0 motion-reduce:transition-none"
          >
            <Compass size={13} weight="regular" aria-hidden="true" />
            Open guide
            <ArrowRight size={12} weight="regular" aria-hidden="true" />
          </ButtonLink>
          <Button
            size="xs"
            variant="plain"
            className="!min-w-0 !gap-1.5 !px-1.5 text-secondary hover:!bg-white/55"
            disabled={isPending}
            title="You can reopen it in Settings."
            onClick={() => setVisibility(
              dismissActivationChecklist,
              "The checklist could not be hidden. Your saved progress was not changed.",
            )}
          >
            <EyeSlash size={13} weight="regular" aria-hidden="true" />
            Hide checklist
          </Button>
        </div>
      </div>
      <ol className="dashboard-first-estimate__tasks">
        {checklist.items.map((item, index) => (
          <li
            key={item.id}
            aria-current={item.status === "next" ? "step" : undefined}
            className="dashboard-first-estimate__task"
            data-checklist-status={item.status}
          >
            <span className="dashboard-first-estimate__step">
              {item.status === "complete" ? (
                <Check size={13} weight="regular" aria-hidden="true" />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-numeric text-[8px] font-medium uppercase leading-none text-secondary">
                  {item.status === "complete"
                    ? "Saved"
                    : item.status === "next"
                      ? "Next step"
                      : "Pending"}
                </span>
                <ButtonLink
                  className="dashboard-first-estimate__action min-h-6 min-w-0 shrink-0 gap-1 px-1.5 !text-[9px] focus-visible:ring-offset-0"
                  href={item.href}
                  variant="plain"
                  size="xs"
                >
                  {item.status === "next" ? "Continue" : "Open"}
                  <ArrowRight size={11} weight="regular" aria-hidden="true" />
                </ButtonLink>
              </div>
              <p className="dashboard-first-estimate__task-title mt-1.5 text-[10px] font-medium leading-3.5 text-ink">
                {item.label}
              </p>
              <p className="dashboard-first-estimate__description mt-1 text-[9px] leading-3 text-secondary">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
