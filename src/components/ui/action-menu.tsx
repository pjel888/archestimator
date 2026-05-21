"use client";

import type { ReactNode } from "react";

import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

export type ActionMenuItem = {
  id: string;
  label: string;
  shortcut?: string;
  tone?: "default" | "destructive";
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
};

export type ActionMenuGroup = {
  id: string;
  items: ActionMenuItem[];
};

type ContextActionMenuContentProps = {
  groups: ActionMenuGroup[];
};

export function ContextActionMenuContent({ groups }: ContextActionMenuContentProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return visibleGroups.map((group, groupIndex) => (
    <MenuGroupFragment key={group.id} separator={groupIndex > 0}>
      <ContextMenuGroup>
        {group.items.map((item) => (
          <ContextMenuItem
            key={item.id}
            variant={item.tone === "destructive" ? "destructive" : "default"}
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : undefined}
            onSelect={() => {
              if (!item.disabled) item.onSelect();
            }}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcut ? <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut> : null}
          </ContextMenuItem>
        ))}
      </ContextMenuGroup>
    </MenuGroupFragment>
  ));
}

function MenuGroupFragment({
  separator,
  children,
}: {
  separator: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {separator ? <ContextMenuSeparator /> : null}
      {children}
    </>
  );
}
