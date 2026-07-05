"use client";

import { Fragment, type DragEvent, type ReactNode } from "react";

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
export type ProjectCardDropPosition = "before" | "after" | "end";
export type ProjectCardDropTarget = {
  groupKey: string;
  projectId: string | null;
  position: ProjectCardDropPosition;
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
  isProjectDragActive?: boolean;
  isProjectDropAvailable?: boolean;
  isProjectDropTarget?: boolean;
  projectCardDropTarget?: ProjectCardDropTarget | null;
  onProjectDragOver?: (key: string, event: DragEvent<HTMLElement>) => void;
  onProjectDrop?: (key: string, event: DragEvent<HTMLElement>) => void;
  onProjectDragLeave?: (key: string, event: DragEvent<HTMLElement>) => void;
  onProjectCardDragOver?: (
    key: string,
    projectId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
  onProjectCardDrop?: (
    key: string,
    projectId: string,
    event: DragEvent<HTMLElement>,
  ) => void;
};

/**
 * One section renderer for date, client, and user-group buckets.
 */
export function ProjectGroupSection({
  mode,
  group,
  items,
  viewMode,
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
  isProjectDragActive = false,
  isProjectDropAvailable = false,
  isProjectDropTarget = false,
  projectCardDropTarget = null,
  onProjectDragOver,
  onProjectDrop,
  onProjectDragLeave,
  onProjectCardDragOver,
  onProjectCardDrop,
}: ProjectGroupSectionProps) {
  const isVirtual = Boolean(group.isVirtual);
  const canReorder = mode === "group" && !isVirtual && isReorderable;
  const canReceiveProjectDrop =
    mode === "group" && Boolean(onProjectDragOver || onProjectDrop);
  const showProjectDropSkeleton =
    canReceiveProjectDrop && !collapsed && isProjectDragActive && isProjectDropAvailable;
  const activeCardDropTarget =
    projectCardDropTarget?.groupKey === group.key ? projectCardDropTarget : null;
  const showEndProjectDropSkeleton =
    showProjectDropSkeleton && activeCardDropTarget?.position !== "before" && activeCardDropTarget?.position !== "after";

  function renderProjectDropSkeleton(position: ProjectCardDropPosition) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "project-group-card-drop-skeleton",
          position === "before" || position === "after"
            ? "project-group-card-drop-skeleton--insertion"
            : undefined,
        )}
        data-project-card-drop-skeleton=""
        data-project-card-drop-skeleton-position={position}
        data-project-card-drop-skeleton-view={viewMode}
      >
        <span className="project-group-card-drop-skeleton__thumb" />
        <span className="project-group-card-drop-skeleton__body">
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }

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
        isProjectDropAvailable ? "project-group-card-drop-section" : undefined,
        isProjectDropTarget ? "project-group-card-drop-section--active" : undefined,
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
      {collapsed ? null : (
        <div
          className={cn(
            layoutClassName,
            isProjectDropAvailable ? "project-group-card-drop-body" : undefined,
            isProjectDropTarget
              ? "project-group-card-drop-body--active"
              : undefined,
          )}
          data-project-card-drop-body={
            isProjectDropAvailable ? "" : undefined
          }
          data-project-card-drop-body-active={
            isProjectDropTarget ? "" : undefined
          }
        >
          {items.map((item) => {
            const projectId = item.project.id;
            const isBeforeTarget =
              activeCardDropTarget?.projectId === projectId &&
              activeCardDropTarget.position === "before";
            const isAfterTarget =
              activeCardDropTarget?.projectId === projectId &&
              activeCardDropTarget.position === "after";
            return (
              <Fragment key={projectId}>
                {isBeforeTarget ? renderProjectDropSkeleton("before") : null}
                <div
                  className="project-group-card-drop-slot"
                  data-project-card-drop-slot={projectId}
                  data-project-card-drop-slot-active={
                    isBeforeTarget || isAfterTarget ? "" : undefined
                  }
                  onDragOver={
                    onProjectCardDragOver
                      ? (event) => onProjectCardDragOver(group.key, projectId, event)
                      : undefined
                  }
                  onDrop={
                    onProjectCardDrop
                      ? (event) => onProjectCardDrop(group.key, projectId, event)
                      : undefined
                  }
                >
                  {renderCard(item)}
                </div>
                {isAfterTarget ? renderProjectDropSkeleton("after") : null}
              </Fragment>
            );
          })}
          {showEndProjectDropSkeleton ? renderProjectDropSkeleton("end") : null}
        </div>
      )}
    </section>
  );
}
