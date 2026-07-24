import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

import type {
  OnboardingEligibilitySnapshot,
  OnboardingFlowStateSnapshot,
} from "@/lib/onboarding/flow-types";
import { cn } from "@/lib/ui/cn";

type LibrarySurface = "components" | "templates";

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

function statusLabel(state: OnboardingFlowStateSnapshot | undefined) {
  if (!state || state.status === "not_started") return "Not started";
  if (state.status === "in_progress") return "In progress";
  if (state.status === "completed") return "Complete";
  return "Skipped";
}

export function LibraryReuseRail({
  snapshot,
  surface,
  hasReusableComponents,
  hasMeaningfulTemplates,
}: {
  snapshot: OnboardingEligibilitySnapshot | null;
  surface: LibrarySurface;
  hasReusableComponents: boolean;
  hasMeaningfulTemplates: boolean;
}) {
  if (!snapshot) return null;

  const canUseGuide = snapshot.capabilities.includes("view_estimate")
    && snapshot.capabilities.includes("manage_components")
    && snapshot.availableRoutes.includes("library_components");
  const canManageTemplates = snapshot.capabilities.includes("manage_templates")
    && snapshot.availableRoutes.includes("library_templates");
  const state = snapshot.flowStates.find((entry) => entry.flowKey === "library_reuse");
  const guideHref = `/workshop/library/${surface}?tour=library_reuse&mode=${launchMode(state)}`;

  return (
    <aside
      className="mx-2 mt-1 shrink-0 rounded-xs border border-hairline bg-white/80 text-ink"
      aria-label="Library reuse learning"
      data-library-reuse-rail
    >
      <details className="group">
        <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 px-2 text-[9px] font-medium marker:hidden">
          <span>Library reuse</span>
          <span className="flex items-center gap-1 text-[8px] font-normal text-tertiary">
            {statusLabel(state)}
            <CaretDown
              size={10}
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="border-t border-hairline p-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="max-w-2xl text-[8px] leading-3 text-tertiary">
              Reuse a shared Component through a normal insert, duplicate, or edit-and-save action.
              Opening starter content or viewing a guide does not complete this task.
            </p>
            {canUseGuide && hasReusableComponents ? (
              <Link
                href={guideHref}
                className="inline-flex min-h-6 items-center rounded-xs bg-ink px-2 text-[8px] font-medium text-white outline-none hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-focus"
              >
                {launchLabel(state)}
              </Link>
            ) : (
              <span className="text-[8px] leading-3 text-tertiary">
                {!canUseGuide ? "This guide requires Component and Estimate edit access." : "Add a reusable Component first."}
              </span>
            )}
          </div>

          <ol className="mt-2 grid gap-1 sm:grid-cols-3">
            <li className={cn(
              "rounded-xs border px-2 py-1.5",
              surface === "components" ? "border-accent bg-blue-50/60" : "border-hairline bg-surface/70",
            )}>
              <span className="text-[8px] font-medium">1 · Reuse a Component</span>
              <p className="mt-0.5 text-[7px] leading-3 text-tertiary">
                Shared Components can be inserted into Estimates, duplicated, or edited and saved.
              </p>
            </li>
            <li className={cn(
              "rounded-xs border px-2 py-1.5",
              surface === "components" ? "border-accent bg-blue-50/60" : "border-hairline bg-surface/70",
            )}>
              <span className="text-[8px] font-medium">2 · Read the folders</span>
              <p className="mt-0.5 text-[7px] leading-3 text-tertiary">
                Workspace folders organize shared Components. Uncategorized keeps anything not placed in a folder.
              </p>
            </li>
            <li className={cn(
              "rounded-xs border px-2 py-1.5",
              surface === "templates" ? "border-accent bg-blue-50/60" : "border-hairline bg-surface/70",
            )}>
              <span className="text-[8px] font-medium">3 · Reuse structure (optional)</span>
              <p className="mt-0.5 text-[7px] leading-3 text-tertiary">
                {canManageTemplates && hasMeaningfulTemplates
                  ? "Preview, insert, or duplicate a Template that contains real Estimate structure."
                  : "Available when you can use Templates and a saved Template is ready."}
              </p>
            </li>
          </ol>
        </div>
      </details>
    </aside>
  );
}
