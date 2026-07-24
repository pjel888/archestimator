"use client";

import type { TooltipRenderProps } from "react-joyride";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import type { OnboardingContentKey } from "@/lib/onboarding/flow-types";

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
    title: "Client links",
    body: "This page shows each client link’s publication status and who can access it.",
  },
  client_links_publish: {
    title: "Scope and publish",
    body: "Review the exact estimate scope and access before performing the normal publish action.",
  },
  client_links_verify: {
    title: "Verify and share",
    body: "Verify the current publication before copying its link or opening authenticated Preview.",
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
    title: "Keep links current",
    body: "Live, Needs update, Expired, Off, and Not shared statuses tell you whether the current link needs attention.",
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

  return (
    <section
      {...tooltipProps}
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-xs border border-hairline bg-white p-3 text-ink shadow-2xl motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase text-tertiary">
            Step {index + 1} of {size}
          </p>
          <h2 className="mt-1 text-[12px] font-medium">
            {content?.title ?? step.title ?? "Guidance"}
          </h2>
        </div>
        <button
          type="button"
          aria-label={closeProps["aria-label"]}
          title={closeProps.title}
          className="grid size-7 shrink-0 place-items-center rounded-xs text-secondary hover:bg-surfaceMuted hover:text-ink"
          onClick={closeProps.onClick}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 text-[10px] leading-4 text-secondary">
        {content?.body ?? step.content}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        {index > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
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
          aria-label={skipProps["aria-label"]}
          title={skipProps.title}
          onClick={skipProps.onClick}
        >
          Skip this guide
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="ml-auto"
          aria-label={primaryProps["aria-label"]}
          title={primaryProps.title}
          onClick={primaryProps.onClick}
        >
          {isLastStep ? "Finish" : "Next"}
        </Button>
      </div>
    </section>
  );
}
