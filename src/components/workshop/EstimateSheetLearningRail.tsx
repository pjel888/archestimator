"use client";

import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react";

import type {
  OnboardingEligibilitySnapshot,
  OnboardingFlowKey,
  OnboardingFlowStateSnapshot,
  OnboardingStepKey,
} from "@/lib/onboarding/flow-types";
import { cn } from "@/lib/ui/cn";

const GUIDED_LESSONS = [
  { key: "read_the_workspace", label: "Read the workspace", step: "practice_workspace", optional: false },
  { key: "understand_row_math", label: "Understand row math", step: "practice_row_math", optional: true },
  { key: "price_and_save", label: "Price and save", step: "practice_price_and_save", optional: false },
  { key: "add_and_source", label: "Add and source", step: "practice_add_and_source", optional: false },
  { key: "organize_work", label: "Organize work", step: "practice_organize", optional: true },
  { key: "reuse_structure", label: "Reuse structure", step: "practice_reuse", optional: true },
  { key: "recover_and_trust", label: "Recover and trust", step: "practice_recovery", optional: true },
  { key: "graduate", label: "Graduate", step: "practice_transfer", optional: true },
] as const satisfies readonly {
  key: string;
  label: string;
  step: OnboardingStepKey;
  optional: boolean;
}[];

function flowState(
  snapshot: OnboardingEligibilitySnapshot,
  flowKey: OnboardingFlowKey,
) {
  return snapshot.flowStates.find((state) => state.flowKey === flowKey);
}

function statusLabel(state: OnboardingFlowStateSnapshot | undefined) {
  if (!state || state.status === "not_started") return "Not started";
  if (state.status === "in_progress") return "In progress";
  if (state.status === "completed") return "Complete";
  return "Skipped";
}

function launchMode(state: OnboardingFlowStateSnapshot | undefined) {
  if (state?.status === "in_progress") return "resume";
  if (state?.status === "completed") return "replay";
  if (state?.status === "dismissed") return "start";
  return "start";
}

function launchLabel(state: OnboardingFlowStateSnapshot | undefined) {
  const mode = launchMode(state);
  if (mode === "resume") return "Resume guide";
  if (mode === "replay") return "View again";
  if (state?.status === "dismissed") return "Start guide again";
  return "Start guide";
}

function lessonStatus(
  state: OnboardingFlowStateSnapshot | undefined,
  step: OnboardingStepKey,
  available: boolean,
) {
  if (!available) return "Blocked";
  if (state?.status === "completed") return "Completed";
  const currentIndex = GUIDED_LESSONS.findIndex(
    (lesson) => lesson.step === state?.currentStepKey,
  );
  const lessonIndex = GUIDED_LESSONS.findIndex((lesson) => lesson.step === step);
  if (currentIndex < 0) return lessonIndex === 0 ? "Available" : "Blocked";
  if (lessonIndex < currentIndex) return "Completed";
  if (lessonIndex === currentIndex) return "Resume";
  return "Available";
}

export function EstimateSheetLearningRail({
  snapshot,
  canEditEstimate,
}: {
  snapshot: OnboardingEligibilitySnapshot | null;
  canEditEstimate: boolean;
}) {
  if (!snapshot) return null;

  const firstValueState = flowState(snapshot, "first_estimate_value");
  const readerState = flowState(snapshot, "estimate_reader_orientation");
  const guidedState = flowState(snapshot, "guided_estimate_practice");
  const primaryFlowKey: OnboardingFlowKey = canEditEstimate
    ? "first_estimate_value"
    : "estimate_reader_orientation";
  const primaryState = canEditEstimate ? firstValueState : readerState;
  const guidedAvailable = canEditEstimate
    && snapshot.dataPredicates.tutorial_binding_current === true;
  const primaryAvailable = snapshot.dataPredicates.estimate_context_available === true;

  return (
    <aside
      className="mx-2 mt-1 shrink-0 rounded-xs border border-hairline bg-white/80 text-ink"
      aria-label="Estimate learning"
      data-estimate-learning-rail
    >
      <details className="group">
        <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 px-2 text-[9px] font-medium marker:hidden">
          <span>Estimate learning</span>
          <span className="flex items-center gap-1 text-[8px] font-normal text-tertiary">
            {canEditEstimate ? statusLabel(primaryState) : "Read-only guide"}
            <CaretDown
              size={10}
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="grid gap-3 border-t border-hairline p-2 lg:grid-cols-[minmax(13rem,0.7fr)_minmax(22rem,1.3fr)]">
          <section className="rounded-xs border border-hairline bg-surface/70 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[10px] font-medium">
                  {canEditEstimate ? "Estimate essentials" : "Reader orientation"}
                </h2>
                <p className="mt-1 text-[8px] leading-3 text-tertiary">
                  {canEditEstimate
                    ? "Use live Estimate Sheet controls. Guidance never creates or prices work for you."
                    : "Review Areas, row math, totals, save status, and the actions available to you."}
                </p>
              </div>
              <span className="shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] text-secondary">
                {statusLabel(primaryState)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {primaryAvailable ? (
                <Link
                  href={`?tour=${primaryFlowKey}&mode=${launchMode(primaryState)}`}
                  className="inline-flex min-h-6 items-center rounded-xs bg-ink px-2 text-[9px] font-medium text-white outline-none hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {launchLabel(primaryState)}
                </Link>
              ) : (
                <span className="text-[8px] leading-3 text-tertiary">
                  Estimate context is not ready.
                </span>
              )}
              <Link
                href="/workshop/getting-started"
                className="text-[8px] font-medium text-secondary underline underline-offset-2"
              >
                Back to Getting Started
              </Link>
              <Link
                href="/workshop/feedback"
                className="text-[8px] font-medium text-secondary underline underline-offset-2"
              >
                Support
              </Link>
            </div>
          </section>

          <section className="rounded-xs border border-hairline bg-surface/70 p-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[10px] font-medium">Guided practice lessons</h2>
                <p className="mt-1 text-[8px] leading-3 text-tertiary">
                  Complete each task yourself in the practice project. Example content does not count as your own work.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {guidedAvailable ? (
                  <>
                    <Link
                      href={`?tour=guided_estimate_practice&mode=${launchMode(guidedState)}`}
                      className="inline-flex min-h-6 items-center rounded-xs border border-divider bg-white px-2 text-[8px] font-medium outline-none hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {launchLabel(guidedState)}
                    </Link>
                    {guidedState?.status === "in_progress" || guidedState?.status === "completed" ? (
                      <Link
                        href="?tour=guided_estimate_practice&mode=restart"
                        className="inline-flex min-h-6 items-center rounded-xs px-2 text-[8px] font-medium text-secondary underline underline-offset-2"
                      >
                        Restart guide
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href="/workshop/getting-started"
                    className="inline-flex min-h-6 items-center rounded-xs border border-divider bg-white px-2 text-[8px] font-medium outline-none hover:bg-surfaceMuted focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Prepare practice
                  </Link>
                )}
              </div>
            </div>
            <ol className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
              {GUIDED_LESSONS.map((lesson) => {
                const lessonState = lessonStatus(guidedState, lesson.step, guidedAvailable);
                return (
                  <li
                    key={lesson.key}
                    className="rounded-xs border border-hairline bg-white px-1.5 py-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[8px] font-medium">{lesson.label}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-xs px-1 py-0.5 text-[7px]",
                          lesson.optional ? "bg-surfaceMuted text-tertiary" : "bg-blue-50 text-blue-700",
                        )}
                      >
                        {lesson.optional ? "Optional" : "Core"}
                      </span>
                    </div>
                    <span className="mt-0.5 block text-[7px] text-tertiary">{lessonState}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-[8px] leading-3 text-tertiary">
              To stop this guide, open it and choose Skip this guide. Complete the practice tasks yourself for them to count.
            </p>
          </section>
        </div>
      </details>
    </aside>
  );
}
