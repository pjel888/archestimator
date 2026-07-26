"use client";

import {
  ArrowRight,
  Check,
  Clock,
  Compass,
  Lifebuoy,
  SpinnerGap,
  Warning,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OnboardingBrandVisual } from "./OnboardingBrandVisual";
import {
  addCurrentStarterContent,
  restoreCurrentStarterContent,
  resumeCurrentStarterContent,
  startGuidedSample,
} from "@/lib/onboarding/activation-actions";
import { deriveFirstEstimateChecklist } from "@/lib/onboarding/first-estimate-checklist";
import { selectCurrentOnboardingPath } from "@/lib/onboarding/first-run-actions";
import { getEligibleOnboardingFlows } from "@/lib/onboarding/flow-eligibility";
import { PROJECT_START_BLANK_HREF } from "@/lib/projects/project-start-intent";
import type {
  ActivationPath,
  OnboardingEligibilitySnapshot,
  OnboardingFlowKey,
  OnboardingFlowStatus,
  StarterReadinessState,
} from "@/lib/onboarding/flow-types";

type PathCard = {
  key: ActivationPath;
  title: string;
  description: string;
  action: string;
  href: string;
  requiresStarter?: boolean;
  startsGuidedSample?: boolean;
};

const PATHS: readonly PathCard[] = [
  {
    key: "guided_sample",
    title: "Guided practice",
    description: "Spend about 10–15 minutes completing real Estimate Sheet tasks in a dedicated practice project.",
    action: "Start guided practice",
    href: "/workshop/projects",
    startsGuidedSample: true,
  },
  {
    key: "starter_reference",
    title: "Finished example",
    description: "Explore a prepared project and its Estimate Sheets before starting your own work.",
    action: "Open example",
    href: "/workshop/projects",
    requiresStarter: true,
  },
  {
    key: "starter_sandbox",
    title: "Practice project",
    description: "Try the controls in a safe example project without affecting your own checklist progress.",
    action: "Open practice project",
    href: "/workshop/projects",
    requiresStarter: true,
  },
  {
    key: "workspace_template",
    title: "Workspace template",
    description: "Start from a reusable layout and adapt it to your next project.",
    action: "Browse templates",
    href: "/workshop/library/templates",
  },
  {
    key: "blank",
    title: "Blank project",
    description: "Start from scratch and build the estimate around your own scope.",
    action: "Start from scratch",
    href: PROJECT_START_BLANK_HREF,
  },
] as const;

const PRIMARY_PATHS = PATHS.filter(
  (path) => path.key === "guided_sample" || path.key === "blank",
);
const SECONDARY_PATHS = PATHS.filter(
  (path) => path.key !== "guided_sample" && path.key !== "blank",
);

const STARTER_STATE_CONTENT: Record<
  StarterReadinessState,
  { label: string; title: string; description: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }
> = {
  not_started: {
    label: "Not started",
    title: "Starter content has not been installed",
    description: "Reference, Sandbox, Components, and Templates are unavailable until installation is started.",
    tone: "neutral",
  },
  installing: {
    label: "Installing",
    title: "Starter content is installing",
    description: "Do not use partial content yet. This page will show it as ready only after the server confirms completion.",
    tone: "accent",
  },
  partial: {
    label: "Needs recovery",
    title: "Starter content is only partially available",
    description: "Installation can safely resume. Existing examples stay intact while missing items are restored.",
    tone: "warning",
  },
  complete: {
    label: "Ready",
    title: "Starter content is ready",
    description: "Guided practice, example projects, Components, and Templates are ready to use.",
    tone: "success",
  },
  explicit_add: {
    label: "Optional",
    title: "Starter content can be added",
    description: "This workspace already contains business data, so starter content is never installed automatically.",
    tone: "neutral",
  },
  inactive_key_restore: {
    label: "Restore available",
    title: "Some starter content is inactive",
    description: "Missing or archived example items can be restored without duplicating active content.",
    tone: "warning",
  },
};

function flowStatusLabel(status: OnboardingFlowStatus | undefined) {
  if (!status || status === "not_started") return "Not started";
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Complete";
  return "Skipped";
}

function flowLaunchMode(status: OnboardingFlowStatus | undefined) {
  if (status === "in_progress") return "resume";
  if (status === "completed") return "replay";
  if (status === "dismissed") return "start";
  return "start";
}

function FlowStatusCard({
  snapshot,
  flowKey,
  title,
  description,
  unavailableReason,
}: {
  snapshot: OnboardingEligibilitySnapshot;
  flowKey: OnboardingFlowKey;
  title: string;
  description: string;
  unavailableReason?: string;
}) {
  const state = snapshot.flowStates.find((flowState) => flowState.flowKey === flowKey);
  const status = state?.status;
  const mode = flowLaunchMode(status);
  return (
    <article className="flex min-h-36 flex-col rounded-2xl border border-hairline bg-white p-3 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-ink">{title}</h3>
        <Badge
          size="xs"
          className="min-w-0"
          tone={status === "completed" ? "success" : status === "in_progress" ? "accent" : "neutral"}
        >
          {flowStatusLabel(status)}
        </Badge>
      </div>
      <p className="mt-2 text-[9px] leading-4 text-tertiary">{description}</p>
      <div className="mt-auto pt-3">
        {unavailableReason ? (
          <p className="text-[9px] leading-4 text-tertiary">{unavailableReason}</p>
        ) : (
          <ButtonLink
            href={`/workshop/getting-started?tour=${flowKey}&mode=${mode}`}
            size="xs"
            className="min-w-0 gap-1 rounded-full px-3"
          >
            {mode === "resume"
              ? "Resume guide"
              : mode === "replay"
                ? "View again"
                : status === "dismissed"
                  ? "Start guide again"
                  : "Start guide"}
            <ArrowRight size={12} aria-hidden="true" />
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

export function GettingStartedProgress({
  snapshot,
}: {
  snapshot: OnboardingEligibilitySnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingPath, setPendingPath] = useState<ActivationPath | null>(null);
  const [starterActionPending, setStarterActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starterActionError, setStarterActionError] = useState<string | null>(null);
  const checklist = deriveFirstEstimateChecklist(snapshot);
  const isCreator = checklist.canShow;
  const showChecklist = checklist.canShow && !checklist.isDismissed;
  const starterState = snapshot.starter?.state ?? null;
  const starterReady = starterState === "complete";
  const starterContent = starterState ? STARTER_STATE_CONTENT[starterState] : null;
  const canManageStarter = snapshot.workspaceRole === "owner"
    || snapshot.workspaceRole === "admin";
  const hasEstimateContext = snapshot.dataPredicates.estimate_context_available === true;
  const canManageClientLinks = snapshot.capabilities.includes("manage_client_links")
    && snapshot.availableRoutes.includes("client_links");
  const estimateFlowKey = snapshot.capabilities.includes("edit_estimate")
    ? "first_estimate_value"
    : "estimate_reader_orientation";
  const selectedPath = snapshot.activation.selectedPath;
  const launchableFlowKeys = useMemo(
    () =>
      new Set<OnboardingFlowKey>(
        (["desktop", "mobile"] as const).flatMap((viewport) =>
          getEligibleOnboardingFlows(snapshot, viewport).map(
            (flow) => flow.definition.key,
          ),
        ),
      ),
    [snapshot],
  );

  const recommendation = useMemo(() => {
    if (!isCreator) return "Open the work shared with you, then use the reader guide for hierarchy, row math, totals, and access.";
    if (checklist.isComplete) return "Your first estimate checklist is complete. Continue independently or view a focused guide again.";
    if (!selectedPath) return "Choose one start path. Guided practice is best when you want a short, hands-on walkthrough.";
    return `Continue the ${PATHS.find((path) => path.key === selectedPath)?.title ?? "selected"} path.`;
  }, [checklist.isComplete, isCreator, selectedPath]);

  const choosePath = (path: PathCard) => {
    setActionError(null);
    setPendingPath(path.key);
    startTransition(async () => {
      try {
        if (path.startsGuidedSample) {
          const sample = await startGuidedSample();
          router.push(
            `/workshop/projects/${sample.projectId}/estimates/${sample.areaId}?tour=guided_estimate_practice&mode=resume`,
          );
          return;
        }
        await selectCurrentOnboardingPath(path.key);
        router.push(path.href);
      } catch {
        setActionError("This path could not be prepared. Retry, choose another path, or open Support.");
        setPendingPath(null);
      }
    });
  };

  const starterAction = starterState === "not_started" || starterState === "explicit_add"
    ? canManageStarter
      ? { label: "Add starter content", run: () => addCurrentStarterContent() }
      : null
    : starterState === "installing" || starterState === "partial"
      ? { label: "Resume installation", run: () => resumeCurrentStarterContent() }
      : starterState === "inactive_key_restore" && canManageStarter
        ? {
            label: "Restore starter content",
            run: () => restoreCurrentStarterContent(
              snapshot.starter?.workspaceRevision ?? 0,
            ),
          }
        : null;

  const runStarterAction = () => {
    if (!starterAction) return;
    setStarterActionError(null);
    setStarterActionPending(true);
    startTransition(async () => {
      try {
        await starterAction.run();
        router.refresh();
      } catch {
        setStarterActionError(
          canManageStarter
            ? "Starter content could not be prepared. Retry, or open Support if recovery keeps failing."
            : "A workspace owner or admin must finish the shared starter-content setup.",
        );
      } finally {
        setStarterActionPending(false);
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 pb-8">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-[#1b2b44]/20 bg-[#172337] p-5 shadow-[0_22px_54px_-38px_rgba(17,31,50,0.65)]">
        <OnboardingBrandVisual className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] opacity-75 lg:block" />
        <div className="relative z-[1] flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-brand-orange ring-1 ring-white/15">
                <Compass size={16} aria-hidden="true" />
              </span>
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/70">
                Recommended next step
              </p>
            </div>
            <h2 className="mt-3 max-w-xl text-[19px] font-semibold tracking-[-0.02em] text-white">
              {isCreator ? "Reach your first useful estimate" : "Understand the work shared with you"}
            </h2>
            <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/72">{recommendation}</p>
          </div>
          {showChecklist ? (
            <div className="w-full max-w-[220px] rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[9px] text-white/78">
                <span className="font-medium text-white">Getting-started progress</span>
                <span className="font-numeric">
                  {checklist.completedCount}/{checklist.items.length}
                </span>
              </div>
              <Progress
                value={checklist.completedCount}
                max={checklist.items.length}
                size="sm"
                className="mt-2"
              />
            </div>
          ) : null}
        </div>
      </section>

      {showChecklist ? (
        <section className="rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]" aria-labelledby="first-estimate-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="first-estimate-heading" className="text-[12px] font-medium text-ink">First estimate checklist</h2>
              <p className="mt-1 text-[10px] leading-4 text-tertiary">
                Only work you save yourself counts toward this checklist. Opening a guide or example does not.
              </p>
            </div>
            {checklist.isComplete ? (
              <Badge tone="success" size="xs" className="min-w-0">Complete</Badge>
            ) : null}
          </div>
          <ol className="mt-3 grid gap-2 md:grid-cols-2">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-xl border border-hairline bg-surface/60 p-2">
                {item.status === "complete" ? (
                  <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Clock size={14} className={item.status === "next" ? "mt-0.5 shrink-0 text-accent" : "mt-0.5 shrink-0 text-tertiary"} aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-tertiary">{item.description}</p>
                </div>
                <ButtonLink href={item.href} size="xs" variant="plain" className="min-w-0 shrink-0 px-2 text-accent hover:underline">
                  Open
                </ButtonLink>
              </li>
            ))}
          </ol>
        </section>
      ) : checklist.canShow && checklist.isDismissed ? (
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)] sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[11px] font-medium text-ink">First estimate checklist hidden</h2>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">
              Your saved progress is unchanged. Reopen the checklist whenever you want it back.
            </p>
          </div>
          <ButtonLink
            href="/workshop/settings?page=guidance-tours"
            size="sm"
            className="min-w-0 shrink-0 rounded-full px-3"
          >
            Open Guidance settings
          </ButtonLink>
        </section>
      ) : null}

      {isCreator ? (
        <section className="rounded-2xl border border-hairline bg-white p-4 shadow-[0_18px_42px_-38px_rgba(17,31,50,0.42)]" aria-labelledby="start-path-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 id="start-path-heading" className="text-[12px] font-medium text-ink">Choose how to start</h2>
              <p className="mt-1 text-[10px] leading-4 text-tertiary">
                Choose between hands-on practice and your own project. Examples and templates remain available below.
              </p>
            </div>
            {selectedPath ? (
              <Badge tone="accent" size="xs" className="min-w-0">
                Selected: {PATHS.find((path) => path.key === selectedPath)?.title ?? selectedPath}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Recommended start paths">
            {PRIMARY_PATHS.map((path) => {
              const pending = isPending && pendingPath === path.key;
              return (
                <article
                  key={path.key}
                  className="flex min-h-40 flex-col rounded-2xl border border-hairline bg-surface/60 p-3"
                  data-start-path={path.key}
                  data-primary-start-path="true"
                  data-path-availability="available"
                >
                  <h3 className="text-[11px] font-medium text-ink">{path.title}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-tertiary">{path.description}</p>
                  <Button
                    className="mt-auto w-full rounded-full"
                    size="sm"
                    variant={path.key === "guided_sample" ? "brand" : "secondary"}
                    disabled={isPending}
                    aria-busy={pending}
                    onClick={() => choosePath(path)}
                  >
                    {pending ? (
                      <>
                        <SpinnerGap size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        Preparing
                      </>
                    ) : path.action}
                  </Button>
                </article>
              );
            })}
          </div>
          <details
            className="mt-3 rounded-xl border border-hairline bg-surface/40 p-3"
          >
            <summary className="cursor-pointer text-[10px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus">
              Explore finished examples and templates
            </summary>
            <p className="mt-1 text-[10px] leading-4 text-tertiary">
              Review prepared work or begin from reusable content without making it your primary first step.
            </p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {SECONDARY_PATHS.map((path) => {
                const unavailable = path.requiresStarter && !starterReady;
                const pending = isPending && pendingPath === path.key;
                return (
                  <article
                    key={path.key}
                    className="flex flex-col rounded-xl border border-hairline bg-white p-3"
                    data-start-path={path.key}
                    data-path-availability={unavailable ? "unavailable" : "available"}
                  >
                    <h3 className="text-[11px] font-medium text-ink">{path.title}</h3>
                    <p className="mt-1 text-[10px] leading-4 text-tertiary">{path.description}</p>
                    {unavailable ? (
                      <p className="mt-2 text-[10px] leading-4 text-warning">
                        Available after starter content is ready.
                      </p>
                    ) : null}
                    <Button
                      className="mt-3 w-full rounded-full"
                      size="sm"
                      variant="secondary"
                      disabled={isPending || unavailable}
                      aria-busy={pending}
                      onClick={() => choosePath(path)}
                    >
                      {pending ? (
                        <>
                          <SpinnerGap size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          Preparing
                        </>
                      ) : path.action}
                    </Button>
                  </article>
                );
              })}
            </div>
          </details>
          {actionError ? (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-xs border border-dangerSoft bg-dangerSoft p-2 text-[10px] leading-4 text-danger">
              <Warning size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {starterContent ? (
        <section className="rounded-xs border border-hairline bg-white p-4" aria-labelledby="starter-content-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="starter-content-heading" className="text-[12px] font-medium text-ink">Starter content</h2>
              <h3 className="mt-2 text-[10px] font-medium text-ink">{starterContent.title}</h3>
              <p className="mt-1 max-w-2xl text-[9px] leading-4 text-tertiary">{starterContent.description}</p>
              {snapshot.starter?.inactiveAssetKeys.length ? (
                <p className="mt-2 text-[9px] text-warning">
                  {snapshot.starter.inactiveAssetKeys.length} example {snapshot.starter.inactiveAssetKeys.length === 1 ? "item needs" : "items need"} recovery.
                </p>
              ) : null}
              {!starterAction && !canManageStarter && starterState !== "complete" ? (
                <p className="mt-2 text-[9px] leading-4 text-tertiary">
                  Ask a workspace owner or admin to add or restore shared starter content.
                </p>
              ) : null}
            </div>
            <Badge tone={starterContent.tone} size="xs" className="min-w-0">{starterContent.label}</Badge>
          </div>
          {starterAction ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                aria-busy={starterActionPending}
                onClick={runStarterAction}
              >
                {starterActionPending ? (
                  <>
                    <SpinnerGap size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Preparing
                  </>
                ) : starterAction.label}
              </Button>
              <p className="text-[9px] leading-4 text-tertiary">
                Existing projects and active starter items are preserved.
              </p>
            </div>
          ) : null}
          {starterActionError ? (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-xs border border-dangerSoft bg-dangerSoft p-2 text-[9px] leading-4 text-danger">
              <Warning size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{starterActionError}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xs border border-hairline bg-white p-4" aria-labelledby="lessons-heading">
        <div>
          <h2 id="lessons-heading" className="text-[12px] font-medium text-ink">Guidance and lessons</h2>
          <p className="mt-1 text-[9px] leading-4 text-tertiary">
            Start focused guidance only when it helps. Skipped guides remain available here and in Settings.
          </p>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <FlowStatusCard
            snapshot={snapshot}
            flowKey={estimateFlowKey}
            title={snapshot.capabilities.includes("edit_estimate") ? "Estimate Sheet essentials" : "Read an Estimate Sheet"}
            description={snapshot.capabilities.includes("edit_estimate")
              ? "Hierarchy, area and row creation, pricing, totals, and saved state."
              : "Hierarchy, row math, totals, status, access, and help."}
            unavailableReason={!hasEstimateContext
              ? "Start or open an accessible Estimate Sheet before launching this route-local guide."
              : !launchableFlowKeys.has(estimateFlowKey)
                ? "This guide is not available with the current access or saved state."
              : undefined}
          />
          {isCreator ? (
            <FlowStatusCard
              snapshot={snapshot}
              flowKey="guided_estimate_practice"
              title="Guided estimate practice"
              description="Complete practice through normal Estimate Sheet actions, then apply the skill to your own work."
              unavailableReason={snapshot.dataPredicates.tutorial_binding_current !== true
                ? "Create the guided practice project before opening its lessons."
                : !launchableFlowKeys.has("guided_estimate_practice")
                  ? "This guide is not available with the current access or saved state."
                : undefined}
            />
          ) : null}
          {canManageClientLinks ? (
            <FlowStatusCard
              snapshot={snapshot}
              flowKey="client_link_publishing"
              title="Client links"
              description="Choose scope, publish, verify the current link, and understand optional recipients and activity."
              unavailableReason={snapshot.dataPredicates.client_link_project_available === false
                ? "A manageable Project is required before this guide can launch."
                : !launchableFlowKeys.has("client_link_publishing")
                  ? "This guide is not available with the current access or saved state."
                : undefined}
            />
          ) : null}
        </div>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-xs border border-hairline bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[11px] font-medium text-ink">Need help recovering?</h2>
          <p className="mt-1 text-[9px] leading-4 text-tertiary">
            Contact Support if a guide or starter example cannot recover after you try again.
          </p>
        </div>
        <ButtonLink
          href="/workshop/feedback"
          size="sm"
          className="min-w-0 shrink-0 gap-1 px-3"
        >
          <Lifebuoy size={13} aria-hidden="true" />
          Open Support
        </ButtonLink>
      </section>
    </div>
  );
}
