"use client";

import { CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import { getGroupFlagColors } from "@/lib/workshop/group-accent";

import {
  PROJECT_GROUP_FLAG_BG_COLOR,
  PROJECT_GROUP_FLAG_RULE_COLOR,
} from "./project-grid-layout";
import type { ProjectGroupSectionGroup } from "./ProjectGroupSection";
import type { ProjectListItem } from "./projects-page-client";

export type ProjectGroupFlagProps = {
  mode: "date" | "client" | "group";
  group: ProjectGroupSectionGroup;
  items: ProjectListItem[];
  /** = getProjectDateFlagLayoutClassName(viewMode) */
  flagLayoutClassName: string;
  collapsed?: boolean;
  onToggleCollapse?: (key: string) => void;
  /** Date mode passes "data-project-date-group-label"; client/group pass undefined. */
  legacyHeaderDataAttr?: "data-project-date-group-label";
  /** Group-mode editable bucket only: the rename/recolor/delete menu. Hidden for virtual + date/client. */
  headerMenuSlot?: ReactNode;
};

/**
 * The flag/header for a project group section.
 *
 * All modes share the same fixed 32px flag shape (`h-8`, `p-1`, flex row, no
 * overhang). Date/client mode keeps the LIVE brand-orange palette; group mode
 * uses the group's accent for border, a lighter tint for background, and a
 * contrast variant for text. The left accent rule/dot are intentionally omitted
 * — the border color carries the group identity.
 */
export function ProjectGroupFlag({
  mode,
  group,
  items,
  flagLayoutClassName,
  collapsed = false,
  onToggleCollapse,
  legacyHeaderDataAttr,
  headerMenuSlot,
}: ProjectGroupFlagProps) {
  const isGroupMode = mode === "group";
  const isVirtual = Boolean(group.isVirtual);
  const canCollapse = isGroupMode && typeof onToggleCollapse === "function";

  const { borderColor, backgroundColor, textColor, textClass } = isGroupMode
    ? {
        ...getGroupFlagColors(group.accentId),
        textClass: undefined,
      }
    : {
        borderColor: PROJECT_GROUP_FLAG_RULE_COLOR,
        backgroundColor: PROJECT_GROUP_FLAG_BG_COLOR,
        textColor: undefined,
        textClass: "text-brand-orange-dark",
      };

  // Verbatim legacy date attribute carried on the <h3> label.
  const labelLegacyAttr = legacyHeaderDataAttr ? { [legacyHeaderDataAttr]: "" } : {};

  return (
    <div data-project-group-flag>
      <div
        aria-hidden="true"
        className="h-px"
        data-project-group-rule
        style={{ backgroundColor: borderColor }}
      />
      <div className={cn("min-w-0 text-[9px] leading-3", flagLayoutClassName)}>
        <h3
          className={cn(
            "flex h-8 items-center gap-1.5 border-x border-b p-1 text-[9px] font-medium leading-3 tracking-normal",
            textClass,
          )}
          data-project-group-label
          style={{
            backgroundColor,
            borderColor,
            ...(textColor ? { color: textColor } : {}),
          }}
          {...labelLegacyAttr}
        >
          {canCollapse ? (
            <button
              type="button"
              aria-label={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
              aria-expanded={!collapsed}
              className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-xs opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              onClick={() => onToggleCollapse?.(group.key)}
            >
              {collapsed ? (
                <CaretRight size={10} weight="regular" aria-hidden="true" />
              ) : (
                <CaretDown size={10} weight="regular" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {isGroupMode ? (
            <>
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <span className="shrink-0 tabular-nums opacity-70">{items.length}</span>
              {!isVirtual && headerMenuSlot ? <span className="shrink-0">{headerMenuSlot}</span> : null}
            </>
          ) : (
            group.label
          )}
        </h3>
      </div>
    </div>
  );
}
