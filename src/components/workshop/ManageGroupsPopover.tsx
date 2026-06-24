"use client";

import type { Ref } from "react";
import { useState } from "react";
import { Check, GearSix, Plus, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownPopupPanel, useDropdownPopup } from "@/components/ui/dropdown-popup";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { cn } from "@/lib/ui/cn";
import { GROUP_ACCENT_SWATCHES, type GroupAccentId } from "@/lib/workshop/group-accent";
import { MAX_PROJECT_GROUPS, MAX_PROJECT_GROUP_NAME_LENGTH } from "@/lib/workshop/group-constants";
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";

// Caps are imported from the shared constants module (Phase 2 §2.0 — group-constants.ts),
// NOT re-declared, so the popover's at-limit/length guards can never drift from the
// server action (LD-8 DRY).

export type ManageGroupsPopoverProps = {
  groups: ProjectGroupSummary[];
  onCreate: (name: string, accentId: GroupAccentId | null) => void;
  onRename: (groupId: string, name: string) => void;
  onRecolor: (groupId: string, accentId: GroupAccentId | null) => void;
  onDelete: (groupId: string) => void;
  /** Optional controlled open-state so the section-header menu / empty-state CTA can open it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ManageGroupsPopover({
  groups,
  onCreate,
  onRename,
  onRecolor,
  onDelete,
  open: controlledOpen,
  onOpenChange,
}: ManageGroupsPopoverProps) {
  const [draftName, setDraftName] = useState("");
  const [draftAccent, setDraftAccent] = useState<GroupAccentId | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [recolorOpenId, setRecolorOpenId] = useState<string | null>(null);

  // useDropdownPopup gives Escape, outside-pointer dismissal, ancestor-scroll/resize
  // close, focus return to the trigger, and a positioned panel — the focus-trap and
  // a11y contract a hand-rolled <div role="dialog"> lacked (LD-10).
  const { open, position, rootRef, triggerRef, panelRef, openPopup, close } = useDropdownPopup({
    align: "end",
    side: "bottom",
    open: controlledOpen,
    onOpenChange,
  });

  const setOpen = (next: boolean) => {
    if (next) openPopup();
    else close("manual");
  };

  const atLimit = groups.length >= MAX_PROJECT_GROUPS;
  const trimmed = draftName.trim();
  const nameTooLong = trimmed.length > MAX_PROJECT_GROUP_NAME_LENGTH;
  const canCreate = trimmed.length > 0 && !nameTooLong && !atLimit;

  function submitCreate() {
    if (!canCreate) return;
    onCreate(trimmed, draftAccent);
    setDraftName("");
    setDraftAccent(null);
  }

  // rootRef anchors outside-pointer detection; triggerRef positions the panel and
  // receives focus on close. The ui/ button primitives do not forward a ref, so attach
  // triggerRef to a wrapping <span> around the primitive.
  return (
    <div ref={rootRef} className="relative inline-flex">
      <span ref={triggerRef as Ref<HTMLSpanElement>} className="inline-flex">
        <ToolbarIconButton
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          label="Manage groups"
          onClick={() => setOpen(!open)}
        >
          <GearSix size={14} weight="regular" aria-hidden="true" />
        </ToolbarIconButton>
      </span>
      <DropdownPopupPanel
        open={open}
        position={position}
        panelRef={panelRef}
        role="dialog"
        aria-label="Manage groups"
        className="w-64 rounded-xs border border-hairline bg-white p-2 shadow-[0_22px_54px_-30px_rgba(17,17,17,0.6)]"
      >
        <div className="space-y-1.5">
          <label className="block text-[9px] font-medium uppercase leading-3 text-tertiary" htmlFor="manage-groups-name">
            New group
          </label>
          <input
            id="manage-groups-name"
            value={draftName}
            maxLength={MAX_PROJECT_GROUP_NAME_LENGTH}
            placeholder="Group name"
            aria-label="New group name"
            className="h-7 w-full rounded-xs border border-hairline px-2 text-[10px] text-ink focus-visible:border-accent focus-visible:outline-none"
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCreate();
              }
            }}
          />
          <div className="flex items-center gap-1" role="radiogroup" aria-label="New group accent">
            {GROUP_ACCENT_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                role="radio"
                aria-checked={draftAccent === swatch.id}
                aria-label={swatch.label}
                title={swatch.label}
                className={cn(
                  // DESIGN.md: swatches use the standard app radius.
                  "size-4 cursor-pointer rounded-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                  draftAccent === swatch.id ? "border-ink" : "border-hairline",
                )}
                style={{ backgroundColor: swatch.dotColor }}
                onClick={() => setDraftAccent((current) => (current === swatch.id ? null : (swatch.id as GroupAccentId)))}
              />
            ))}
          </div>
          {nameTooLong ? (
            <p className="text-[9px] leading-3 text-danger" role="alert">
              Group names are limited to {MAX_PROJECT_GROUP_NAME_LENGTH} characters.
            </p>
          ) : null}
          {atLimit ? (
            <p className="text-[9px] leading-3 text-danger" role="alert" data-manage-groups-at-limit="">
              You have reached the {MAX_PROJECT_GROUPS}-group limit. Delete a group to add another.
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 w-full gap-1 px-2"
            disabled={!canCreate}
            onClick={submitCreate}
          >
            <Plus size={12} weight="regular" aria-hidden="true" />
            Add group
          </Button>
        </div>

        {groups.length > 0 ? (
          <ul className="mt-2 space-y-0.5 border-t border-hairline pt-2" aria-label="Existing groups">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center gap-1">
                <input
                  aria-label={`Rename ${group.name}`}
                  defaultValue={group.name}
                  maxLength={MAX_PROJECT_GROUP_NAME_LENGTH}
                  className="h-6 min-w-0 flex-1 rounded-xs border border-transparent px-1 text-[10px] text-ink hover:border-hairline focus-visible:border-accent focus-visible:outline-none"
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (next.length > 0 && next.length <= MAX_PROJECT_GROUP_NAME_LENGTH && next !== group.name) {
                      onRename(group.id, next);
                    }
                  }}
                />
                {recolorOpenId === group.id ? (
                  <div
                    className="flex items-center gap-0.5"
                    role="radiogroup"
                    aria-label={`Recolor ${group.name}`}
                  >
                    {GROUP_ACCENT_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.id}
                        type="button"
                        role="radio"
                        aria-checked={group.accentId === swatch.id}
                        aria-label={swatch.label}
                        title={swatch.label}
                        className={cn(
                          "relative size-4 cursor-pointer rounded-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                          group.accentId === swatch.id ? "border-ink" : "border-hairline",
                        )}
                        style={{ backgroundColor: swatch.dotColor }}
                        onClick={() => {
                          onRecolor(group.id, swatch.id as GroupAccentId);
                          setRecolorOpenId(null);
                        }}
                      >
                        {group.accentId === swatch.id ? (
                          <span
                            data-action-menu-item-check="true"
                            className="absolute inset-0 flex items-center justify-center text-white"
                          >
                            <Check size={10} weight="regular" aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      aria-label={`Clear color ${group.name}`}
                      onClick={() => {
                        onRecolor(group.id, null);
                        setRecolorOpenId(null);
                      }}
                    >
                      <X size={12} weight="regular" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    aria-label={`Recolor ${group.name}`}
                    onClick={() => setRecolorOpenId(group.id)}
                  >
                    <GearSix size={12} weight="regular" aria-hidden="true" />
                  </Button>
                )}
                {confirmingDeleteId === group.id ? (
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="danger"
                      size="icon-xs"
                      aria-label={`Confirm delete ${group.name}`}
                      onClick={() => {
                        onDelete(group.id);
                        setConfirmingDeleteId(null);
                      }}
                    >
                      <Check size={12} weight="regular" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      aria-label={`Cancel delete ${group.name}`}
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      <X size={12} weight="regular" aria-hidden="true" />
                    </Button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    aria-label={`Delete ${group.name}`}
                    onClick={() => setConfirmingDeleteId(group.id)}
                  >
                    <Trash size={12} weight="regular" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </DropdownPopupPanel>
    </div>
  );
}
