"use client";

import {
  CaretDown,
  CaretRight,
  Check,
  DotsSixVertical,
  DotsThreeVertical,
} from "@phosphor-icons/react/dist/ssr";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { type ActionMenuItem, type ActionMenuGroup } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ShadcnDropdownMenu,
  ShadcnDropdownMenuContent,
  ShadcnDropdownMenuItem,
  ShadcnDropdownMenuSeparator,
  ShadcnDropdownMenuSub,
  ShadcnDropdownMenuSubContent,
  ShadcnDropdownMenuSubTrigger,
  ShadcnDropdownMenuTrigger,
} from "@/components/ui/shadcn-dropdown-menu";
import { cn } from "@/lib/ui/cn";
import { getGroupFlagColors } from "@/lib/workshop/group-accent";

import {
  PROJECT_GROUP_FLAG_BG_COLOR,
  PROJECT_GROUP_FLAG_RULE_COLOR,
} from "./project-grid-layout";
import type { ProjectGroupSectionGroup } from "./ProjectGroupSection";

export type ProjectGroupFlagProps = {
  mode: "date" | "client" | "group";
  group: ProjectGroupSectionGroup;
  /** = getProjectDateFlagLayoutClassName(viewMode) */
  flagLayoutClassName: string;
  collapsed?: boolean;
  onToggleCollapse?: (key: string) => void;
  /** Date mode passes "data-project-date-group-label"; client/group pass undefined. */
  legacyHeaderDataAttr?: "data-project-date-group-label";
  /** Group-mode editable bucket only: visible kebab + right-click menu actions. Hidden for virtual + date/client. */
  headerActionGroups?: ActionMenuGroup[];
  onRenameGroup?: (key: string, name: string) => void;
  isReorderable?: boolean;
  onReorderDragStart?: (key: string, event: DragEvent<HTMLElement>) => void;
  onReorderDragEnd?: () => void;
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
  flagLayoutClassName,
  collapsed = false,
  onToggleCollapse,
  legacyHeaderDataAttr,
  headerActionGroups,
  onRenameGroup,
  isReorderable = false,
  onReorderDragStart,
  onReorderDragEnd,
}: ProjectGroupFlagProps) {
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameCommitStartedRef = useRef(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(group.label);
  const isGroupMode = mode === "group";
  const isVirtual = Boolean(group.isVirtual);
  const canCollapse = typeof onToggleCollapse === "function";
  const canRename = isGroupMode && !isVirtual && typeof onRenameGroup === "function";
  const hasActionMenu =
    isGroupMode &&
    !isVirtual &&
    Boolean(headerActionGroups?.some((actionGroup) => actionGroup.items.length > 0));

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

  useEffect(() => {
    if (!editingName) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editingName]);

  function beginRename() {
    if (!canRename) return;
    renameCommitStartedRef.current = false;
    setDraftName(group.label);
    setEditingName(true);
  }

  function cancelRename() {
    renameCommitStartedRef.current = true;
    setDraftName(group.label);
    setEditingName(false);
  }

  function commitRename() {
    if (renameCommitStartedRef.current) return;
    const nextName = draftName.trim();
    if (nextName.length === 0) {
      setDraftName(group.label);
      return;
    }
    renameCommitStartedRef.current = true;
    setEditingName(false);
    if (nextName === group.label) {
      setDraftName(group.label);
      return;
    }
    onRenameGroup?.(group.key, nextName);
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  }

  const caretButton = canCollapse ? (
    <button
      type="button"
      aria-label={collapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
      aria-expanded={!collapsed}
      className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs opacity-70 hover:bg-black/5 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      onClick={() => onToggleCollapse?.(group.key)}
    >
      {collapsed ? (
        <CaretRight size={10} weight="regular" aria-hidden="true" />
      ) : (
        <CaretDown size={10} weight="regular" aria-hidden="true" />
      )}
    </button>
  ) : null;

  const groupFlagLabel = isGroupMode ? (
    <div
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-b-xs border-x border-b p-1 text-[9px] font-medium leading-3 tracking-normal",
        hasActionMenu ? "cursor-context-menu" : undefined,
      )}
      data-project-group-label
      style={{
        backgroundColor,
        borderColor,
        ...(textColor ? { color: textColor } : {}),
      }}
      {...labelLegacyAttr}
    >
      {!isVirtual ? (
        isReorderable ? (
          <button
            type="button"
            aria-label={`Reorder ${group.label} group`}
            title={`Reorder ${group.label} group`}
            draggable
            className="inline-flex size-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-xs text-current opacity-85 hover:bg-white/45 hover:opacity-100 active:cursor-grabbing focus-visible:bg-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            data-project-group-drag-handle
            onDragStart={(event) => onReorderDragStart?.(group.key, event)}
            onDragEnd={onReorderDragEnd}
            onClick={(event) => event.preventDefault()}
          >
            <DotsSixVertical size={16} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-4 shrink-0 items-center justify-center opacity-80"
            data-project-group-drag-handle
          >
            <DotsSixVertical size={16} weight="bold" />
          </span>
        )
      ) : null}
      {caretButton}
      <h3 className="min-w-0 flex-1 text-[9px] font-medium leading-3">
        {editingName ? (
          <input
            ref={renameInputRef}
            aria-label={`Rename ${group.label} group`}
            className="h-4 w-full min-w-0 border-0 bg-transparent p-0 text-[9px] font-medium leading-3 text-current outline-none [appearance:none] focus:bg-transparent focus-visible:bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/50"
            data-project-group-rename-input
            value={draftName}
            onBlur={commitRename}
            onChange={(event) => setDraftName(event.currentTarget.value)}
            onKeyDown={handleRenameKeyDown}
          />
        ) : canRename ? (
          <button
            type="button"
            className="block w-full cursor-text truncate rounded-xs text-left text-[9px] font-medium leading-3 text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            aria-label={`Rename ${group.label} group`}
            title={`Rename ${group.label} group`}
            data-project-group-rename-trigger
            onClick={beginRename}
          >
            {group.label}
          </button>
        ) : (
          <span className="block truncate">{group.label}</span>
        )}
      </h3>
      {hasActionMenu ? (
        <ShadcnDropdownMenu>
          <ShadcnDropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="plain"
              size="icon-xs"
              className="size-5 min-h-5 shrink-0 rounded-xs p-0 text-current opacity-70 hover:bg-white/45 hover:text-current hover:opacity-100 focus-visible:bg-white/45 focus-visible:text-current"
              aria-label={`Group actions for ${group.label}`}
              title={`Group actions for ${group.label}`}
            >
              <DotsThreeVertical size={16} weight="regular" aria-hidden="true" />
            </Button>
          </ShadcnDropdownMenuTrigger>
          <ShadcnDropdownMenuContent align="end" sideOffset={4} className="min-w-36">
            {renderDropdownActionGroups(headerActionGroups ?? [])}
          </ShadcnDropdownMenuContent>
        </ShadcnDropdownMenu>
      ) : null}
    </div>
  ) : (
    <h3
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-b-xs border-x border-b p-1 text-[9px] font-medium leading-3 tracking-normal",
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
      {caretButton}
      <span className="min-w-0 flex-1 truncate">{group.label}</span>
    </h3>
  );

  return (
    <div data-project-group-flag>
      <div
        aria-hidden="true"
        className="h-px"
        data-project-group-rule
        style={{ backgroundColor: borderColor }}
      />
      <div className={cn("min-w-0 text-[9px] leading-3", flagLayoutClassName)}>
        {hasActionMenu ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>{groupFlagLabel}</ContextMenuTrigger>
            <ContextMenuContent alignOffset={4} data-project-group-context-menu="true">
              {renderContextActionGroups(headerActionGroups ?? [])}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          groupFlagLabel
        )}
      </div>
    </div>
  );
}

function renderDropdownActionGroups(groups: ActionMenuGroup[]) {
  const nodes: ReactNode[] = [];
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const directItems = visibleGroups.flatMap((group) => (group.label ? [] : group.items));
  const labeledGroups = visibleGroups.filter((group) => group.label);

  for (const group of labeledGroups) {
    if (nodes.length > 0) {
      nodes.push(<ShadcnDropdownMenuSeparator key={`${group.id}-separator`} />);
    }
    nodes.push(
      <ShadcnDropdownMenuSub key={group.id}>
        <ShadcnDropdownMenuSubTrigger>{group.label}</ShadcnDropdownMenuSubTrigger>
        <ShadcnDropdownMenuSubContent className="min-w-36">
          {group.items.map((item) => renderDropdownActionItem(item))}
        </ShadcnDropdownMenuSubContent>
      </ShadcnDropdownMenuSub>,
    );
  }

  if (directItems.length > 0 && nodes.length > 0) {
    nodes.push(<ShadcnDropdownMenuSeparator key="direct-items-separator" />);
  }
  for (const item of directItems) {
    nodes.push(renderDropdownActionItem(item));
  }

  return nodes;
}

function renderDropdownActionItem(item: ActionMenuItem) {
  return (
    <ShadcnDropdownMenuItem
      key={item.id}
      icon={item.icon}
      shortcut={item.shortcut}
      variant={item.tone === "destructive" ? "destructive" : "default"}
      disabled={item.disabled}
      title={item.disabled ? item.disabledReason : undefined}
      selected={item.selected}
      onSelect={() => {
        if (!item.disabled) item.onSelect();
      }}
    >
      {item.label}
    </ShadcnDropdownMenuItem>
  );
}

function renderContextActionGroups(groups: ActionMenuGroup[]) {
  const nodes: ReactNode[] = [];
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const directItems = visibleGroups.flatMap((group) => (group.label ? [] : group.items));
  const labeledGroups = visibleGroups.filter((group) => group.label);

  for (const group of labeledGroups) {
    if (nodes.length > 0) {
      nodes.push(<ContextMenuSeparator key={`${group.id}-separator`} />);
    }
    nodes.push(
      <ContextMenuSub key={group.id}>
        <ContextMenuSubTrigger>{group.label}</ContextMenuSubTrigger>
        <ContextMenuSubContent className="min-w-36">
          {group.items.map((item) => renderContextActionItem(item))}
        </ContextMenuSubContent>
      </ContextMenuSub>,
    );
  }

  if (directItems.length > 0 && nodes.length > 0) {
    nodes.push(<ContextMenuSeparator key="direct-items-separator" />);
  }
  for (const item of directItems) {
    nodes.push(renderContextActionItem(item));
  }

  return nodes;
}

function renderContextActionItem(item: ActionMenuItem) {
  return (
    <ContextMenuItem
      key={item.id}
      variant={item.tone === "destructive" ? "destructive" : "default"}
      disabled={item.disabled}
      title={item.disabled ? item.disabledReason : undefined}
      onSelect={() => {
        if (!item.disabled) item.onSelect();
      }}
    >
      {item.icon ? (
        <span className="flex size-3 shrink-0 items-center justify-center" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.shortcut ? <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut> : null}
      {item.selected ? (
        <span
          className="ml-auto flex size-3 shrink-0 items-center justify-center"
          data-action-menu-item-check="true"
        >
          <Check aria-hidden="true" weight="regular" />
        </span>
      ) : null}
    </ContextMenuItem>
  );
}
