import type { ProjectCardViewMode } from "./LiveProjectCard";

/**
 * Brand-orange flag colors for the date/client group flag header.
 *
 * Shared between `projects-page-client.tsx` and `ProjectGroupSection.tsx` so both
 * surfaces render the EXACT same `color-mix` strings. These are the LIVE flag
 * colors (brand-orange-tinted, NOT neutral grey): the background is a 25% tint of
 * the brand orange over white, the rule/border is a slightly stronger 35% tint.
 * The projects-page sort-controls suite asserts both strings byte-for-byte — do
 * NOT change a single character.
 */
export const PROJECT_GROUP_FLAG_BG_COLOR = "color-mix(in srgb, var(--brand-orange) 25%, white)";
export const PROJECT_GROUP_FLAG_RULE_COLOR = "color-mix(in srgb, var(--brand-orange) 35%, white)";

/**
 * The grid class for the live-project wall and each group's card grid.
 * Byte-identical to the strings asserted by the projects-page view-mode and
 * sort-controls suites — do NOT change any returned string.
 */
export function getProjectGridClassName(viewMode: ProjectCardViewMode) {
  if (viewMode === "list")
    return "flex flex-col divide-y divide-hairline overflow-hidden rounded-xs border border-hairline";
  if (viewMode === "small") return "grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2";
  if (viewMode === "medium") return "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3";

  return "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3";
}

/**
 * The flag-header layout class. In list view the flag uses the small thumbnail
 * width (the sort-controls suite asserts `minmax(132px,1fr)` for list-view date
 * flags); otherwise it tracks the active view mode.
 */
export function getProjectDateFlagLayoutClassName(viewMode: ProjectCardViewMode) {
  return viewMode === "list" ? getProjectGridClassName("small") : getProjectGridClassName(viewMode);
}
