"use client";

import { ArrowClockwise, CheckCircle, Compass, Eye, Play, Warning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { OnboardingBrandVisual } from "@/components/onboarding/OnboardingBrandVisual";
import { useWorkshopSettingsModal } from "@/components/workshop/WorkshopSettingsModal";
import {
  reopenActivationChecklist,
  setAutomaticGuidanceEnabled,
} from "@/lib/onboarding/activation-actions";
import { ONBOARDING_FLOW_CATALOG } from "@/lib/onboarding/flow-catalog";
import { getEligibleOnboardingFlows } from "@/lib/onboarding/flow-eligibility";
import { resetCurrentGuidance } from "@/lib/onboarding/flow-actions";
import type {
  OnboardingEligibilitySnapshot,
  OnboardingFlowDefinition,
  OnboardingFlowKey,
  OnboardingFlowStatus,
  OnboardingLaunchMode,
  OnboardingLessonKey,
} from "@/lib/onboarding/flow-types";

const FLOW_PRESENTATION: Record<OnboardingFlowKey, { title: string; description: string }> = {
  core_orientation: {
    title: "Core orientation",
    description: "Find your way around, choose a starting point, and get help.",
  },
  collaborator_orientation: {
    title: "Assigned-work orientation",
    description: "Open assigned work and understand what you can do.",
  },
  first_estimate_value: {
    title: "First estimate",
    description: "Estimate hierarchy, priced work, totals, and save state.",
  },
  guided_estimate_practice: {
    title: "Estimate Sheet guide",
    description: "Practice the main Estimate Sheet tasks at your own pace.",
  },
  estimate_reader_orientation: {
    title: "Estimate reader guide",
    description: "Read hierarchy, row math, totals, status, and access limits.",
  },
  library_reuse: {
    title: "Library reuse",
    description: "Reuse components, folders, and Template structure.",
  },
  client_link_publishing: {
    title: "Client links",
    description: "Scope, publish, verify, recipients, activity, and safe maintenance.",
  },
};

const LESSON_LABELS: Record<OnboardingLessonKey, string> = {
  read_the_workspace: "Read the workspace",
  understand_row_math: "Understand row math",
  price_and_save: "Price and save",
  add_and_source: "Add and source",
  organize_work: "Organize work",
  reuse_structure: "Reuse structure",
  recover_and_trust: "Recover and trust",
  graduate: "Graduate to independent work",
  read_client_links: "Review client links",
  scope_and_publish: "Scope and publish",
  verify_and_share: "Verify and share",
  recipients_and_activity: "Recipients and activity",
  keep_it_current: "Keep it current",
  replace_or_turn_off_safely: "Replace or turn off safely",
};

const ESTIMATE_LESSONS: readonly OnboardingLessonKey[] = [
  "read_the_workspace",
  "understand_row_math",
  "price_and_save",
  "add_and_source",
  "organize_work",
  "reuse_structure",
  "recover_and_trust",
  "graduate",
];

const CLIENT_LINK_LESSONS: readonly OnboardingLessonKey[] = [
  "read_client_links",
  "scope_and_publish",
  "verify_and_share",
  "recipients_and_activity",
  "keep_it_current",
  "replace_or_turn_off_safely",
];

function createMutationId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const PASSIVE_VIEW_FLOWS = new Set<OnboardingFlowKey>([
  "core_orientation",
  "collaborator_orientation",
  "estimate_reader_orientation",
]);

function statusLabel(flowKey: OnboardingFlowKey, status: OnboardingFlowStatus | undefined) {
  if (status === "in_progress") return "In progress";
  if (status === "completed") return PASSIVE_VIEW_FLOWS.has(flowKey) ? "Viewed" : "Completed";
  if (status === "dismissed") return "Skipped";
  return "Not started";
}

function statusTone(status: OnboardingFlowStatus | undefined) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "accent" as const;
  if (status === "dismissed") return "warning" as const;
  return "neutral" as const;
}

function actionFor(status: OnboardingFlowStatus | undefined): {
  primaryLabel: string;
  primaryMode: OnboardingLaunchMode;
  secondaryLabel: string | null;
  secondaryMode: OnboardingLaunchMode | null;
} {
  if (status === "in_progress") {
    return { primaryLabel: "Resume guide", primaryMode: "resume", secondaryLabel: "Restart guide", secondaryMode: "restart" };
  }
  if (status === "completed") {
    return { primaryLabel: "View again", primaryMode: "replay", secondaryLabel: "Restart guide", secondaryMode: "restart" };
  }
  if (status === "dismissed") {
    return { primaryLabel: "Start guide again", primaryMode: "start", secondaryLabel: null, secondaryMode: null };
  }
  return { primaryLabel: "Start guide", primaryMode: "start", secondaryLabel: null, secondaryMode: null };
}

function launchPath(flowKey: OnboardingFlowKey, snapshot: OnboardingEligibilitySnapshot) {
  if (
    flowKey === "first_estimate_value"
    || flowKey === "guided_estimate_practice"
    || flowKey === "estimate_reader_orientation"
  ) {
    const projectId = snapshot.resourceContext.projectId;
    const nodeId = snapshot.resourceContext.nodeId;
    if (projectId && nodeId) {
      return `/workshop/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(nodeId)}`;
    }
  }
  if (flowKey === "library_reuse") return "/workshop/library/components";
  if (flowKey === "client_link_publishing") return "/workshop/publisher";
  return "/workshop";
}

function unavailableReason(definition: OnboardingFlowDefinition, snapshot: OnboardingEligibilitySnapshot) {
  const capability = definition.audience.flatMap((rule) => rule.requires).find(
    (required) => !snapshot.capabilities.includes(required),
  );
  if (capability) return "This guide is not available with your current access.";
  return "This guide does not apply to the current route or available data.";
}

function FlowCard({
  definition,
  eligible,
  snapshot,
}: {
  definition: OnboardingFlowDefinition;
  eligible: boolean;
  snapshot: OnboardingEligibilitySnapshot;
}) {
  const { closeBeforeNavigate } = useWorkshopSettingsModal();
  const state = snapshot.flowStates.find(
    (candidate) => candidate.flowKey === definition.key && candidate.flowVersion === definition.version,
  );
  const action = actionFor(state?.status);
  const presentation = FLOW_PRESENTATION[definition.key];
  const lessonKeys = definition.key === "guided_estimate_practice"
    ? ESTIMATE_LESSONS
    : definition.key === "client_link_publishing"
      ? CLIENT_LINK_LESSONS
      : [...new Set(definition.steps.flatMap((step) => step.lesson ? [step.lesson] : []))];

  function launch(mode: OnboardingLaunchMode) {
    const query = new URLSearchParams({ tour: definition.key, mode });
    closeBeforeNavigate(`${launchPath(definition.key, snapshot)}?${query}`);
  }

  return (
    <article className="rounded-2xl border border-hairline bg-white p-3 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[10px] font-medium leading-4 text-ink">{presentation.title}</h4>
          <p className="mt-0.5 text-[9px] leading-4 text-tertiary">{presentation.description}</p>
        </div>
        <Badge tone={eligible ? statusTone(state?.status) : "neutral"} size="xs">
          {eligible ? statusLabel(definition.key, state?.status) : "Unavailable"}
        </Badge>
      </div>
      {lessonKeys.length > 0 ? (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2" aria-label={`${presentation.title} lessons`}>
          {lessonKeys.map((lessonKey) => {
            const lessonSteps = definition.steps.filter((step) => step.lesson === lessonKey);
            const currentIndex = definition.steps.findIndex((step) => step.key === state?.currentStepKey);
            const lessonEndIndex = Math.max(...lessonSteps.map((step) => definition.steps.indexOf(step)));
            const completed = state?.status === "completed" || (currentIndex > lessonEndIndex && currentIndex >= 0);
            const current = lessonSteps.some((step) => step.key === state?.currentStepKey);
            return (
              <li key={lessonKey} className="flex min-w-0 items-center gap-1 text-[9px] leading-4 text-secondary">
                {completed ? <CheckCircle size={12} className="text-success" aria-hidden="true" /> : current ? <Play size={12} className="text-accent" aria-hidden="true" /> : <Eye size={12} className="text-tertiary" aria-hidden="true" />}
                <span className="truncate">{LESSON_LABELS[lessonKey]}</span>
                <span className="ml-auto shrink-0 text-tertiary">
                  {completed
                    ? PASSIVE_VIEW_FLOWS.has(definition.key) ? "Viewed" : "Completed"
                    : current ? "Resume"
                    : eligible ? "Available"
                    : "Blocked"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {eligible ? (
          <>
            <Button className="rounded-full px-3" type="button" size="sm" variant="brand" onClick={() => launch(action.primaryMode)}>
              <Compass size={13} aria-hidden="true" />
              {action.primaryLabel}
            </Button>
            {action.secondaryMode ? (
              <Button className="rounded-full px-3" type="button" size="sm" variant="secondary" onClick={() => launch(action.secondaryMode!)}>
                <ArrowClockwise size={13} aria-hidden="true" />
                {action.secondaryLabel}
              </Button>
            ) : null}
          </>
        ) : (
          <p className="flex items-center gap-1 text-[9px] leading-4 text-tertiary">
            <Warning size={12} aria-hidden="true" />
            {unavailableReason(definition, snapshot)}
          </p>
        )}
      </div>
    </article>
  );
}

export function GuidanceToursSettings({
  snapshot,
}: {
  snapshot: OnboardingEligibilitySnapshot | null;
}) {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [automaticGuidance, setAutomaticGuidance] = useState(
    snapshot?.activation.automaticGuidanceEnabled ?? true,
  );
  const [isPending, startTransition] = useTransition();
  const eligibleKeys = useMemo(
    () => new Set(snapshot ? getEligibleOnboardingFlows(snapshot, "desktop").map((flow) => flow.definition.key) : []),
    [snapshot],
  );

  function reopenChecklist() {
    startTransition(async () => {
      try {
        await reopenActivationChecklist();
        setNotice("The checklist is visible again. Completed tasks remain complete.");
        router.refresh();
      } catch {
        setNotice("The checklist could not be reopened. No task progress changed.");
      }
    });
  }

  function updateAutomaticGuidance(enabled: boolean) {
    startTransition(async () => {
      try {
        await setAutomaticGuidanceEnabled(enabled);
        setAutomaticGuidance(enabled);
        setNotice(
          enabled
            ? "Automatic guidance is on. It can appear the next time you open an eligible page."
            : "Automatic guidance is off. You can still start any guide from this page.",
        );
        if (!enabled) {
          router.refresh();
        }
      } catch {
        setNotice("Automatic guidance could not be updated. Your current setting was not changed.");
      }
    });
  }

  function resetGuidance() {
    if (!snapshot) return;
    startTransition(async () => {
      try {
        const result = await resetCurrentGuidance({
          mutationId: createMutationId(),
          expectedRevisions: Object.fromEntries(
            snapshot.flowStates.map((state) => [state.flowKey, state.revision]),
          ),
        });

        if (result.status === "conflict") {
          setNotice("Guidance changed while Settings was open. The latest progress is loading; review it, then choose Restart all guides again.");
          setConfirmReset(false);
          router.refresh();
          return;
        }

        setNotice("All guides were restarted. Your projects, estimates, client links, starter examples, and checklist progress were not changed.");
        setConfirmReset(false);
        router.refresh();
      } catch {
        setNotice("Guides could not be restarted. Your work and current guide progress were not changed.");
      }
    });
  }

  return (
    <section className="mx-auto max-w-[720px] space-y-4 px-3 py-4 sm:px-5 sm:py-5" aria-labelledby="guidance-tours-title">
      <div className="relative overflow-hidden rounded-2xl bg-[#172337] p-4 text-white">
        <OnboardingBrandVisual className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] opacity-70 sm:block" />
        <div className="relative z-[1] max-w-[68ch]">
          <p className="text-[9px] font-medium uppercase leading-3 tracking-[0.16em] text-white/70">Guidance</p>
          <h3 id="guidance-tours-title" className="mt-2 text-[15px] font-semibold leading-5">Guidance & tours</h3>
          <p className="mt-1 text-[10px] leading-5 text-white/72">
            Continue a guide, start one again, or control when guidance appears. Your project work is never changed.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-white p-3 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-[10px] font-medium leading-4 text-ink">Show automatic guidance</h4>
            <p className="mt-1 max-w-[62ch] text-[9px] leading-4 text-tertiary">
              Turn this off to stop tips and tours from opening automatically. You can still start any guide here.
            </p>
          </div>
          <Switch
            checked={automaticGuidance}
            onChange={updateAutomaticGuidance}
            aria-label="Show automatic guidance"
            disabled={isPending || !snapshot}
            className="mt-0.5 shrink-0"
          />
        </div>
      </div>

      {snapshot ? (
        <div className="grid gap-2">
          {ONBOARDING_FLOW_CATALOG.map((definition) => (
            <FlowCard
              key={definition.key}
              definition={definition}
              eligible={eligibleKeys.has(definition.key)}
              snapshot={snapshot}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-warningSoft bg-warningSoft/20 p-3">
          <p className="text-[10px] font-medium text-ink">Guidance status is temporarily unavailable</p>
          <p className="mt-1 text-[9px] leading-4 text-secondary">Other Settings pages remain available. No progress was changed.</p>
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-surfaceMuted/30 p-3">
        <h4 className="text-[10px] font-medium leading-4 text-ink">Getting-started checklist</h4>
        <p className="mt-1 text-[9px] leading-4 text-tertiary">
          Show the checklist again without changing completed tasks.
        </p>
        <Button className="mt-2 rounded-full px-3" type="button" size="sm" variant="secondary" disabled={isPending} onClick={reopenChecklist}>
          Reopen checklist
        </Button>
      </div>

      <div className="rounded-2xl border border-warningSoft bg-white p-3 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]">
        <h4 className="text-[10px] font-medium leading-4 text-ink">Restart all guides</h4>
        <p className="mt-1 text-[9px] leading-4 text-tertiary">
          Starts each guide from step one. Your projects, estimates, client links, starter examples, and getting-started checklist progress stay unchanged.
        </p>
        {confirmReset ? (
          <div className="mt-2 rounded-xl border border-warningSoft bg-warningSoft/15 p-2">
            <p className="text-[9px] leading-4 text-secondary">
              Restart every guide from the beginning? Your projects, estimates, client links, starter examples, and completed work will not change.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button className="rounded-full px-3" type="button" size="sm" variant="danger" disabled={isPending} onClick={resetGuidance}>
                Restart all guides
              </Button>
              <Button className="rounded-full px-3" type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-2 rounded-full px-3" type="button" size="sm" variant="danger" disabled={isPending || !snapshot} onClick={() => setConfirmReset(true)}>
            Restart all guides
          </Button>
        )}
      </div>

      {notice ? <p role="status" className="text-[9px] leading-4 text-secondary">{notice}</p> : null}
    </section>
  );
}
