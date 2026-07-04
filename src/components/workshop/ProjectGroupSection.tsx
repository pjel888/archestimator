"use client";

import type { DragEvent, ReactNode } from "react";

import type { ActionMenuGroup } from "@/components/ui/action-menu";
import { cn } from "@/lib/ui/cn";
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
export type ProjectGroupDropPosition = "before" | "after";

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
  /** Group-mode editable bucket only: visible kebab + context-menu actions. Hidden for virtual + date/client. */
  headerActionGroups?: ActionMenuGroup[];
  onRenameGroup?: (key: string, name: string) => void;
  isReorderable?: boolean;
  isDragging?: boolean;
  dropPosition?: ProjectGroupDropPosition | null;
  onReorderDragStart?: (key: string, event: DragEvent<HTMLElement>) => void;
  onReorderDragOver?: (key: string, event: DragEvent<HTMLElement>) => void;
  onReorderDrop?: (key: string, event: DragEvent<HTMLElement>) => void;
  onReorderDragEnd?: () => void;
  isProjectDropTarget?: boolean;
  onProjectDragOver?: (key: string, event: DragEvent<HTMLElement>) => void;
  onProjectDrop?: (key: string, event: DragEvent<HTMLElement>) => void;
  onProjectDragLeave?: (key: string, event: DragEvent<HTMLElement>) => void;
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
  headerActionGroups,
  onRenameGroup,
  isReorderable = false,
  isDragging = false,
  dropPosition = null,
  onReorderDragStart,
  onReorderDragOver,
  onReorderDrop,
  onReorderDragEnd,
  isProjectDropTarget = false,
  onProjectDragOver,
  onProjectDrop,
  onProjectDragLeave,
}: ProjectGroupSectionProps) {
  const isVirtual = Boolean(group.isVirtual);
  const canReorder = mode === "group" && !isVirtual && isReorderable;
  const canReceiveProjectDrop =
    mode === "group" && Boolean(onProjectDragOver || onProjectDrop);

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (canReceiveProjectDrop) onProjectDragOver?.(group.key, event);
    if (!event.defaultPrevented && canReorder) {
      onReorderDragOver?.(group.key, event);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (canReceiveProjectDrop) onProjectDrop?.(group.key, event);
    if (!event.defaultPrevented && canReorder) {
      onReorderDrop?.(group.key, event);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (canReceiveProjectDrop) onProjectDragLeave?.(group.key, event);
  }

  return (
    <section
      aria-label={group.label}
      className={cn(
        "space-y-2 rounded-sm",
        isDragging ? "opacity-60" : undefined,
        dropPosition === "before"
          ? "shadow-[inset_0_2px_0_rgb(251_146_60)]"
          : undefined,
        dropPosition === "after"
          ? "shadow-[inset_0_-2px_0_rgb(251_146_60)]"
          : undefined,
        isProjectDropTarget
          ? "shadow-[inset_0_0_0_1px_rgba(251,146,60,0.42)]"
          : undefined,
      )}
      data-project-group={group.key}
      data-project-group-kind={mode === "client" ? "client" : mode}
      data-project-group-reorderable={canReorder ? "" : undefined}
      data-project-group-dragging={isDragging ? "" : undefined}
      data-project-group-drop-position={dropPosition ?? undefined}
      data-project-card-drop-target={canReceiveProjectDrop ? "" : undefined}
      data-project-card-drop-active={isProjectDropTarget ? "" : undefined}
      onDragOver={canReceiveProjectDrop || canReorder ? handleDragOver : undefined}
      onDrop={canReceiveProjectDrop || canReorder ? handleDrop : undefined}
      onDragLeave={canReceiveProjectDrop ? handleDragLeave : undefined}
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
          headerActionGroups={headerActionGroups}
          onRenameGroup={isVirtual ? undefined : onRenameGroup}
          isReorderable={canReorder}
          onReorderDragStart={onReorderDragStart}
          onReorderDragEnd={onReorderDragEnd}
        />
      </div>
      {collapsed ? null : <div className={layoutClassName}>{items.map(renderCard)}</div>}
    </section>
  );
}
