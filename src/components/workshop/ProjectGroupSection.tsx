"use client";

import { CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { resolveAccent } from "@/lib/workshop/group-accent";

import type { ProjectCardViewMode } from "./LiveProjectCard";
import {
  PROJECT_GROUP_FLAG_BG_COLOR,
  PROJECT_GROUP_FLAG_RULE_COLOR,
} from "./project-grid-layout";
import type { ProjectListItem } from "./projects-page-client";

export type ProjectGroupSectionGroup = {
  /** Stable section key. date: `${field}:${label}`; group: groupId; ungrouped: "__ungrouped__". */
  key: string;
  label: string;
  /** user-group only; date/client/ungrouped pass undefined or null. */
  accentId?: string | null;
  /** true for the Ungrouped bucket (no rename/recolor/reorder/delete). */
  isVirtual?: boolean;
};

export type ProjectGroupSectionProps = {
  mode: "date" | "client" | "group";
  group: ProjectGroupSectionGroup;
  items: ProjectListItem[];
  viewMode: ProjectCardViewMode;
  renderCard: (item: ProjectListItem) => ReactNode;
  /** = getProjectGridClassName(viewMode) from project-grid-layout.ts */
  layoutClassName: string;
  /** = getProjectDateFlagLayoutClassName(viewMode) */
  flagLayoutClassName: string;
  collapsed?: boolean;
  onToggleCollapse?: (key: string) => void;
  /** Date mode passes "data-project-date-group-label"; client/group pass undefined. */
  legacyHeaderDataAttr?: "data-project-date-group-label";
  /** Date: { "data-project-date-group": key }; client: { "data-project-client-group": key }. */
  legacySectionDataAttr?: Record<string, string>;
  /** Group-mode editable bucket only: the rename/recolor/delete menu. Hidden for virtual + date/client. */
  headerMenuSlot?: ReactNode;
};

/**
 * One section renderer for date, client, and user-group buckets.
 *
 * Date/client mode reproduces the LIVE brand-orange flag block byte-identically:
 * a `data-project-group-rule` divider tinted with the 35% color-mix, then an
 * `<h3 data-project-group-label>` carrying `text-brand-orange-dark`, the 25%/35%
 * `color-mix` inline styles, and (date only) `data-project-date-group-label`. The
 * label text is rendered RAW inside the `<h3>` so RTL's `getByText(label)`
 * resolves to the styled `<h3>` (the sort-controls suite is the contract).
 *
 * Group mode swaps the orange flag for a per-group accent (a left rule + a dot,
 * resolved from `group.accentId` and applied INLINE only — never on the label
 * text), a keyboard-operable collapse caret, an item count, and an editable
 * header-menu slot (hidden for the virtual Ungrouped bucket). The label stays
 * readable and non-orange.
 */
export function ProjectGroupSection({
  mode,
  group,
  items,
  renderCard,
  layoutClassName,
  flagLayoutClassName,
  collapsed = false,
  onToggleCollapse,
  legacyHeaderDataAttr,
  legacySectionDataAttr,
  headerMenuSlot,
}: ProjectGroupSectionProps) {
  const isGroupMode = mode === "group";
  const isVirtual = Boolean(group.isVirtual);
  const accent = isGroupMode ? resolveAccent(group.accentId) : null;
  const canCollapse = isGroupMode && typeof onToggleCollapse === "function";

  // Verbatim legacy date attribute carried on the <h3> label.
  const labelLegacyAttr = legacyHeaderDataAttr ? { [legacyHeaderDataAttr]: "" } : {};

  return (
    <section
      aria-label={group.label}
      className="space-y-2"
      data-project-group={group.key}
      data-project-group-kind={mode === "client" ? "client" : mode}
      {...(isVirtual ? { "data-project-group-virtual": "" } : {})}
      {...(legacySectionDataAttr ?? {})}
    >
      <div className="pt-1">
        <div
          aria-hidden="true"
          className="h-px"
          data-project-group-rule
          style={{ backgroundColor: isGroupMode && accent ? accent.ruleColor : PROJECT_GROUP_FLAG_RULE_COLOR }}
        />
        <div className={cn("min-w-0 text-[9px] leading-3", flagLayoutClassName)}>
          {isGroupMode ? (
            <h3
              className="flex min-w-0 items-center gap-1.5 border-x border-b border-hairline bg-surfaceMuted px-1 py-1.5 text-[9px] font-medium leading-3 tracking-normal text-secondary"
              data-project-group-label
            >
              {accent ? (
                <span
                  aria-hidden="true"
                  data-project-group-accent-rule=""
                  className="-my-1.5 mr-0.5 h-[18px] w-[3px] shrink-0 self-stretch rounded-xs"
                  style={{ backgroundColor: accent.ruleColor }}
                />
              ) : null}
              {accent ? (
                <span
                  aria-hidden="true"
                  data-project-group-accent-dot=""
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent.dotColor }}
                />
              ) : null}
              {canCollapse ? (
                <button
                  type="button"
                  aria-label={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
                  aria-expanded={!collapsed}
                  className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-xs text-tertiary hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                  onClick={() => onToggleCollapse?.(group.key)}
                >
                  {collapsed ? (
                    <CaretRight size={10} weight="regular" aria-hidden="true" />
                  ) : (
                    <CaretDown size={10} weight="regular" aria-hidden="true" />
                  )}
                </button>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <span className="shrink-0 tabular-nums text-tertiary">{items.length}</span>
              {!isVirtual && headerMenuSlot ? <span className="shrink-0">{headerMenuSlot}</span> : null}
            </h3>
          ) : (
            <h3
              className="min-w-0 border-x border-b px-1 py-1.5 text-[9px] font-medium leading-3 tracking-normal text-brand-orange-dark"
              style={{
                backgroundColor: PROJECT_GROUP_FLAG_BG_COLOR,
                borderColor: PROJECT_GROUP_FLAG_RULE_COLOR,
              }}
              data-project-group-label
              {...labelLegacyAttr}
            >
              {group.label}
            </h3>
          )}
        </div>
      </div>
      {collapsed ? null : <div className={layoutClassName}>{items.map(renderCard)}</div>}
    </section>
  );
}
