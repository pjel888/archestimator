"use client";

import * as React from "react";

import {
  type ActionMenuGroup,
  ContextActionMenuContent,
} from "@/components/ui/action-menu";
import {
  DropdownPopupPanel,
  useDropdownPopup,
} from "@/components/ui/dropdown-popup";
import { composeRefs, scrollPopupItemIntoView } from "@/components/ui/dropdown-popup-utils";
import { DropdownMenuGroup, type DropdownMenuGroupProps } from "./dropdown-menu-group";
import { DropdownMenuItem, type DropdownMenuItemProps } from "./dropdown-menu-item";
import { dropdownRenderer } from "./dropdown-menu-renderer";

export type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
};

type DropdownMenuComponent = ((props: DropdownMenuProps) => React.ReactElement) & {
  Item: typeof DropdownMenuItem;
  Group: typeof DropdownMenuGroup;
};

const DropdownMenu = Object.assign(function DropdownMenuRoot({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
}: DropdownMenuProps) {
  const menuId = React.useId();
  const { open, position, rootRef, triggerRef, panelRef, togglePopup, openPopup, close } =
    useDropdownPopup({ align, side });
  const groups = React.useMemo(() => buildActionGroups(children, () => close("select")), [children, close]);

  // Menu variant uses real roving DOM focus over the portaled items; the
  // select variant keeps DOM focus on its trigger instead (virtual focus via
  // aria-activedescendant in dropdown-select.tsx).
  const focusMenuItem = React.useCallback(
    (direction: "first" | "last" | "next" | "previous") => {
      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(
        panel.querySelectorAll<HTMLElement>("[data-dropdown-menu-item]:not([data-disabled='true'])")
      );
      if (items.length === 0) return;

      const activeIndex = items.findIndex((item) => item === document.activeElement);
      const nextIndex =
        direction === "first"
          ? 0
          : direction === "last"
            ? items.length - 1
            : direction === "next"
              ? activeIndex < 0
                ? 0
                : (activeIndex + 1) % items.length
              : activeIndex < 0
                ? items.length - 1
                : (activeIndex - 1 + items.length) % items.length;

      const nextItem = items[nextIndex];
      if (!nextItem) return;
      nextItem.focus({ preventScroll: true });
      scrollPopupItemIntoView(panel, nextItem);
    },
    [panelRef]
  );

  React.useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => focusMenuItem("first"));
    return () => cancelAnimationFrame(frame);
  }, [focusMenuItem, open]);

  const handleMenuKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Escape is handled by the popup core's capture-phase document
      // listener (native event), which closes and refocuses the trigger
      // before this handler could run.

      if (event.key === "Tab") {
        // Menu pattern: Tab closes without activating. Refocusing the
        // trigger first lets the default Tab move focus to the element
        // after it instead of wherever the portal sits in DOM order.
        triggerRef.current?.focus?.();
        close("manual");
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusMenuItem("next");
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusMenuItem("previous");
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusMenuItem("first");
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusMenuItem("last");
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const target = event.target as HTMLElement;
        const item = target.closest("[data-dropdown-menu-item]");
        if (!item) return;
        event.preventDefault();
        (item as HTMLElement).click();
      }
    },
    [close, focusMenuItem, triggerRef]
  );

  const renderedTrigger = renderTrigger(trigger, {
    menuId,
    open,
    triggerRef,
    onToggle: togglePopup,
    onKeyboardOpen: openPopup,
  });

  return (
    <div ref={rootRef} className="relative inline-flex" data-slot="dropdown-menu-root">
      {renderedTrigger}
      <DropdownPopupPanel
        open={open}
        position={position}
        panelRef={panelRef}
        id={menuId}
        aria-orientation="vertical"
        className={className}
        data-side={side}
        data-slot="dropdown-menu-content"
        role="menu"
        onKeyDown={handleMenuKeyDown}
      >
        <ContextActionMenuContent groups={groups} renderer={dropdownRenderer} />
      </DropdownPopupPanel>
    </div>
  );
}, { Item: DropdownMenuItem, Group: DropdownMenuGroup }) satisfies DropdownMenuComponent;

function renderTrigger(
  trigger: React.ReactNode,
  options: {
    menuId: string;
    open: boolean;
    triggerRef: React.MutableRefObject<HTMLElement | null>;
    onToggle: () => void;
    onKeyboardOpen: () => void;
  }
) {
  const triggerProps = {
    "aria-expanded": options.open,
    "aria-haspopup": "menu" as const,
    "aria-controls": options.open ? options.menuId : undefined,
    "data-slot": "dropdown-menu-trigger",
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      const originalOnClick = React.isValidElement(trigger)
        ? (trigger.props as { onClick?: (event: React.MouseEvent<HTMLElement>) => void }).onClick
        : undefined;
      originalOnClick?.(event);
      if (!event.defaultPrevented) options.onToggle();
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      const originalOnKeyDown = React.isValidElement(trigger)
        ? (trigger.props as { onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void }).onKeyDown
        : undefined;
      originalOnKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        options.onKeyboardOpen();
      }
    },
  };

  if (React.isValidElement(trigger)) {
    const existingRef = (trigger.props as { ref?: React.Ref<HTMLElement> }).ref;
    return React.cloneElement(trigger as React.ReactElement<Record<string, unknown> & { ref?: React.Ref<HTMLElement> }>, {
      ...triggerProps,
      ref: composeRefs(existingRef, (node: HTMLElement | null) => {
        options.triggerRef.current = node;
      }),
    });
  }

  return (
    <button
      ref={(node) => {
        options.triggerRef.current = node;
      }}
      type="button"
      className="cursor-pointer"
      {...triggerProps}
    >
      {trigger}
    </button>
  );
}

function buildActionGroups(children: React.ReactNode, close: () => void): ActionMenuGroup[] {
  const directItems: ActionMenuGroup["items"] = [];
  const groups: ActionMenuGroup[] = [];

  React.Children.forEach(children, (child, childIndex) => {
    if (!React.isValidElement(child)) return;

    if (child.type === DropdownMenuGroup) {
      const groupProps = child.props as DropdownMenuGroupProps;
      const items = collectItems(groupProps.children, close, `${childIndex}`);
      groups.push({
        id: groupProps.id ?? `group-${childIndex}`,
        label: groupProps.label,
        items,
      });
      return;
    }

    if (child.type === DropdownMenuItem) {
      directItems.push(toActionItem(child.props as DropdownMenuItemProps, close, `item-${childIndex}`));
    }
  });

  return directItems.length > 0 ? [{ id: "default", items: directItems }, ...groups] : groups;
}

function collectItems(children: React.ReactNode, close: () => void, groupKey: string) {
  const items: ActionMenuGroup["items"] = [];

  React.Children.forEach(children, (child, childIndex) => {
    if (!React.isValidElement(child) || child.type !== DropdownMenuItem) return;
    items.push(toActionItem(child.props as DropdownMenuItemProps, close, `${groupKey}-${childIndex}`));
  });

  return items;
}

function toActionItem(props: DropdownMenuItemProps, close: () => void, fallbackId: string): ActionMenuGroup["items"][number] {
  return {
    id: props.id ?? fallbackId,
    label: props.label,
    icon: props.icon,
    shortcut: props.shortcut,
    tone: props.destructive ? "destructive" : "default",
    disabled: props.disabled,
    selected: props.selected,
    onSelect: () => {
      props.onClick();
      close();
    },
  };
}

export { DropdownMenu, DropdownMenuGroup, DropdownMenuItem };
export type { DropdownMenuGroupProps } from "./dropdown-menu-group";
export type { DropdownMenuItemProps } from "./dropdown-menu-item";
