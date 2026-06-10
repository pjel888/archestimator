"use client";

import type { ReactNode } from "react";

import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

export type ActionMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  tone?: "default" | "destructive";
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
};

export type ActionMenuGroup = {
  id: string;
  label?: string;
  items: ActionMenuItem[];
};

type ActionMenuItemRendererProps = {
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "destructive";
  onSelect: () => void;
};

type ActionMenuRenderer = {
  Group: (props: { children: ReactNode }) => ReactNode;
  Item: (props: ActionMenuItemRendererProps) => ReactNode;
  Label: (props: { children: ReactNode }) => ReactNode;
  Separator: () => ReactNode;
  Shortcut: (props: { children: ReactNode }) => ReactNode;
};

type ContextActionMenuContentProps = {
  groups: ActionMenuGroup[];
  renderer?: ActionMenuRenderer;
};

const contextMenuRenderer: ActionMenuRenderer = {
  Group: ContextMenuGroup,
  Item: ContextMenuItem,
  Label: ContextMenuLabel,
  Separator: () => <ContextMenuSeparator />,
  Shortcut: ContextMenuShortcut,
};

export function ContextActionMenuContent({ groups, renderer = contextMenuRenderer }: ContextActionMenuContentProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const { Group, Item, Label, Separator, Shortcut } = renderer;
  // Mixed menus keep their labels on one vertical axis: once any item in the
  // menu carries an icon, every item reserves the icon slot.
  const reserveIconSlot = visibleGroups.some((group) => group.items.some((item) => item.icon));

  return visibleGroups.map((group, groupIndex) => (
    <MenuGroupFragment key={group.id} separator={groupIndex > 0} Separator={Separator}>
      <Group>
        {group.label ? <Label>{group.label}</Label> : null}
        {group.items.map((item) => (
          <Item
            key={item.id}
            variant={item.tone === "destructive" ? "destructive" : "default"}
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : undefined}
            onSelect={() => {
              if (!item.disabled) item.onSelect();
            }}
          >
            {item.icon || reserveIconSlot ? (
              <span className="flex size-3 shrink-0 items-center justify-center" aria-hidden={item.icon ? undefined : true}>
                {item.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcut ? <Shortcut>{item.shortcut}</Shortcut> : null}
          </Item>
        ))}
      </Group>
    </MenuGroupFragment>
  ));
}

function MenuGroupFragment({
  separator,
  Separator,
  children,
}: {
  separator: boolean;
  Separator: () => ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {separator ? <Separator /> : null}
      {children}
    </>
  );
}
