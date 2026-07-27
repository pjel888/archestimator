"use client";

import type { TooltipRenderProps } from "react-joyride";
import { ArrowRight, Compass, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { OnboardingContentKey } from "@/lib/onboarding/flow-types";
import { OnboardingBrandVisual } from "./OnboardingBrandVisual";
import {
  ONBOARDING_TARGET_HANDOFF_EVENT,
  type OnboardingTargetHandoffEventDetail,
} from "./onboarding-runtime-events";

const CONTENT: Record<
  OnboardingContentKey,
  { title: string; body: string }
> = {
  welcome: {
    title: "Welcome to Archestimator",
    body: "This short guide shows where work lives. Close it to pause, or skip it so it does not open automatically again. You can restart it anytime in Settings.",
  },
  workspace_map: {
    title: "Your Workshop",
    body: "The Workshop keeps projects, reusable library content, sharing, and support in one authenticated workspace.",
  },
  mobile_navigation: {
    title: "Workshop navigation",
    body: "Use this compact navigation row to move between the Workshop sections available to you.",
  },
  projects_entry: {
    title: "Projects",
    body: "Projects organize estimates and collaboration. Open Projects when you are ready to start or resume work.",
  },
  assigned_work: {
    title: "Assigned work",
    body: "This is the project or estimate shared with you. Your available controls reflect your current access.",
  },
  effective_access: {
    title: "Your access",
    body: "Save and editing controls remain read-only when your current role does not permit changes.",
  },
  guidance_and_help: {
    title: "Getting started",
    body: "Return here to continue a guide, view one again, or choose a different starting path.",
  },
  hierarchy: {
    title: "Estimate hierarchy",
    body: "Areas and rows keep the estimate readable and make totals easier to review.",
  },
  add_area: {
    title: "Add an Area",
    body: "Areas group related work. Use the product control when you are ready; guidance never creates it for you.",
  },
  add_priced_row: {
    title: "Add a row",
    body: "Add a real estimate row, then price and save it to advance your checklist.",
  },
  price_and_scope: {
    title: "Price the work",
    body: "Enter the real quantity and pricing details for this row, then wait for the save confirmation.",
  },
  total_and_save: {
    title: "Review the total",
    body: "A saved total completes this task. Simply viewing the number does not.",
  },
  reader_hierarchy: {
    title: "Read the structure",
    body: "Expand Areas and rows to understand how the estimate is organized.",
  },
  reader_row_math: {
    title: "Read row math",
    body: "Quantity, unit cost, and adjustments explain how each row contributes to the estimate.",
  },
  reader_total_and_status: {
    title: "Total and status",
    body: "Use the total and save status to confirm you are viewing the latest saved estimate.",
  },
  reader_access_and_help: {
    title: "Access and help",
    body: "Your access is intentionally read-only. Getting started and Support remain available.",
  },
  practice_workspace: {
    title: "Practice workspace",
    body: "This practice project is separate from your independent project work.",
  },
  practice_row_math: {
    title: "Understand row math",
    body: "Review how quantity, unit cost, and adjustments produce the row total.",
  },
  practice_price_and_save: {
    title: "Price and save",
    body: "Make the requested change yourself and wait for the save confirmation.",
  },
  practice_add_and_source: {
    title: "Add and source",
    body: "Use a real source or add a row through the estimate controls; the tour never performs the action.",
  },
  practice_organize: {
    title: "Organize work",
    body: "Use Areas and hierarchy controls to keep the estimate understandable.",
  },
  practice_reuse: {
    title: "Reuse structure",
    body: "Reusable Components and Templates can speed up real work. Opening starter examples does not complete this lesson.",
  },
  practice_recovery: {
    title: "Recover safely",
    body: "Save state and history help you confirm what persisted before retrying a change.",
  },
  practice_transfer: {
    title: "Apply it independently",
    body: "Apply the skill in your own project and wait for the change to save.",
  },
  library_sources: {
    title: "Reusable Components",
    body: "Browse reusable content, then perform a deliberate insert or reuse action when it fits your estimate.",
  },
  library_folders: {
    title: "Library folders",
    body: "Folders organize reusable Components without counting starter installation as reuse.",
  },
  library_templates: {
    title: "Templates",
    body: "Preview and deliberately use a Template when its structure matches your work.",
  },
  client_links_roster: {
    title: "Commitment Center",
    body: "This workspace view shows portal agreements, pending issues, requests, decisions, and access state.",
  },
  client_links_publish: {
    title: "Compose an issue",
    body: "Open the owning project to review the exact issue package, audience, and decision policy before publishing.",
  },
  client_links_verify: {
    title: "Verify the portal",
    body: "Review the current agreement and portal state before copying a stable link or opening recipient preview.",
  },
  client_links_optional: {
    title: "Recipients and activity",
    body: "Recipient delivery and authenticated activity remain optional. Guidance never sends an email.",
  },
  client_links_recipients: {
    title: "Recipients and activity",
    body: "Recipient delivery and authenticated activity remain optional. Guidance never sends an email.",
  },
  client_links_maintenance: {
    title: "Act on commitment state",
    body: "Requests, waiting discussions, delivery failures, and pending issues identify the next action without creating legacy links.",
  },
  client_links_safety: {
    title: "Replace or turn off safely",
    body: "Republish issues a new URL. Replace and Turn off immediately affect recipients and always require your normal confirmation.",
  },
};

export function OnboardingTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const contentKey =
    typeof step.data?.contentKey === "string"
      ? (step.data.contentKey as OnboardingContentKey)
      : null;
  const content = contentKey ? CONTENT[contentKey] : null;
  const isTargetHandoff = step.data?.interaction === "handoff_to_target";

  return (
    <section
      {...tooltipProps}
      className="pointer-events-auto w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-[1.25rem] border border-[#1b2b44]/15 bg-white text-ink shadow-[0_24px_60px_-26px_rgba(17,31,50,0.5)] motion-reduce:transition-none"
    >
      <OnboardingBrandVisual className="h-24">
        <div className="flex h-full items-start justify-between p-3 text-white">
          <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.16em] text-white/80">
            <span className="grid size-6 place-items-center rounded-full bg-white/14 ring-1 ring-white/20">
              <Compass size={13} weight="bold" aria-hidden="true" />
            </span>
            Archestimator guide
          </div>
          <IconButton
            icon={<X size={15} aria-hidden="true" />}
            label={closeProps["aria-label"] ?? "Close guide"}
            title={closeProps.title}
            size="icon-xs"
            variant="overlay"
            className="size-7 shrink-0 rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/22 focus-visible:ring-white"
            onClick={closeProps.onClick}
          />
        </div>
      </OnboardingBrandVisual>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-brand-orange-dark">
              Step {index + 1} of {size}
            </p>
            <h2 className="mt-1 text-[14px] font-semibold tracking-[-0.01em] text-ink">
              {content?.title ?? step.title ?? "Guidance"}
            </h2>
          </div>
        </div>
        <div className="mt-2 text-[11px] leading-5 text-secondary">
          {content?.body ?? step.content}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#1b2b44]/10 pt-3">
          {index > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-0 rounded-full px-3"
              aria-label={backProps["aria-label"]}
              title={backProps.title}
              onClick={backProps.onClick}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-w-0 rounded-full px-2 text-tertiary"
            aria-label={skipProps["aria-label"]}
            title={skipProps.title}
            onClick={skipProps.onClick}
          >
            Skip guide
          </Button>
          {isTargetHandoff ? (
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="ml-auto min-w-0 rounded-full px-3"
              onClick={() => {
                const flowKey = step.data?.flowKey;
                const stepKey = step.data?.stepKey;
                if (typeof flowKey !== "string" || typeof stepKey !== "string") return;
                window.dispatchEvent(
                  new CustomEvent<OnboardingTargetHandoffEventDetail>(
                    ONBOARDING_TARGET_HANDOFF_EVENT,
                    { detail: { flowKey, stepKey } as OnboardingTargetHandoffEventDetail },
                  ),
                );
              }}
            >
              Try it now
              <ArrowRight size={13} weight="bold" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="ml-auto min-w-0 rounded-full px-3"
              aria-label={primaryProps["aria-label"]}
              title={primaryProps.title}
              onClick={primaryProps.onClick}
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep ? <ArrowRight size={13} weight="bold" aria-hidden="true" /> : null}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
