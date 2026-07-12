"use client";

import Link from "next/link";
import { useTransition } from "react";

import { dismissActivationChecklist, reopenActivationChecklist } from "@/lib/onboarding/activation-actions";
import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import type { ActivationProgress } from "@/lib/onboarding/activation-repository";
import { Button } from "@/components/ui/button";
import { useNavigationRouter } from "@/hooks/use-navigation-router";

export function FirstEstimateChecklist({ progress }: { progress: ActivationProgress | null }) {
  const router = useNavigationRouter();
  const [isPending, startTransition] = useTransition();
  const checklist = deriveFirstEstimateChecklist(progress);
  const isCollapsed = checklist.isComplete || checklist.isDismissed;
  const hasUnavailableItems = checklist.items.some((item) => item.status === "not_available");
  const setVisibility = (action: () => Promise<void>) => startTransition(async () => {
    await action();
    router.refresh();
  });

  return (
    <section aria-label="Getting Started" className="border-b border-hairline bg-white px-3 py-2" data-first-estimate-checklist="">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-medium text-ink">Getting Started</h2>
          <p aria-live="polite" className="text-[10px] text-secondary">
            {checklist.isComplete ? "Your first estimate is ready." : isCollapsed ? "Checklist hidden. Reopen it any time." : "Complete these steps when they help your workflow."}
          </p>
        </div>
        {isCollapsed ? (
          <Button size="xs" variant="secondary" disabled={isPending} onClick={() => setVisibility(reopenActivationChecklist)}>Reopen checklist</Button>
        ) : (
          <Button size="xs" variant="ghost" disabled={isPending} onClick={() => setVisibility(dismissActivationChecklist)}>Dismiss</Button>
        )}
      </div>
      {!isCollapsed ? (
        <ol className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 border-t border-hairline pt-1">
              <span className="text-[10px] text-secondary">{item.label}{item.status === "not_available" ? " (not available)" : item.status === "complete" ? " (complete)" : ""}</span>
              <Link className="text-[10px] font-medium text-accent hover:underline" href={item.href}>Open</Link>
            </li>
          ))}
        </ol>
      ) : null}
      {hasUnavailableItems ? (
        <p className="mt-2 text-[9px] leading-3 text-tertiary" data-checklist-availability="degraded">
          Some checklist steps are not available yet. Continue with the available steps, or <a className="font-medium text-accent hover:underline" href="mailto:support@archestimator.com?subject=Archestimator%20getting%20started">contact support</a> for help.
        </p>
      ) : null}
    </section>
  );
}
