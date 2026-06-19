"use client";

import type { ReactNode } from "react";

import type { ProjectCardViewMode } from "./LiveProjectCard";
import { ProjectGroupFlag } from "./ProjectGroupFlag";
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
  const isVirtual = Boolean(group.isVirtual);

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
        <ProjectGroupFlag
          mode={mode}
          group={group}
          flagLayoutClassName={flagLayoutClassName}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          legacyHeaderDataAttr={legacyHeaderDataAttr}
          headerMenuSlot={headerMenuSlot}
        />
      </div>
      {collapsed ? null : <div className={layoutClassName}>{items.map(renderCard)}</div>}
    </section>
  );
}
