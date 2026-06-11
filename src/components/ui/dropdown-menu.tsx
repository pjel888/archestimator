"use client";

import * as React from "react";

import {
  type ActionMenuGroup,
  ContextActionMenuContent,
} from "@/components/ui/action-menu";
import {
  composeRefs,
  DropdownPopupPanel,
  scrollPopupItemIntoView,
  useDropdownPopup,
} from "@/components/ui/dropdown-popup";
import { cn } from "@/lib/ui/cn";

export type DropdownMenuItemProps = {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
};

export type DropdownMenuGroupProps = {
  id?: string;
  label?: string;
  children: React.ReactNode;
};

export type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
};

type DropdownRendererItemProps = {
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "destructive";
  onSelect: () => void;
};

function DropdownMenuItem(_props: DropdownMenuItemProps) {
  return null;
}

function DropdownMenuGroup(_props: DropdownMenuGroupProps) {
  return null;
}

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
    onSelect: () => {
      props.onClick();
      close();
    },
  };
}

const dropdownRenderer = {
  Group: ({ children }: { children: React.ReactNode }) => <div role="group">{children}</div>,
  Label: ({ children }: { children: React.ReactNode }) => (
    <div className="px-2 py-1 text-[9px] font-medium leading-3 text-tertiary" role="presentation">
      {children}
    </div>
  ),
  Separator: () => <div className="-mx-1 my-1 h-px bg-hairline" role="separator" />,
  Shortcut: ({ children }: { children: React.ReactNode }) => (
    <span className="ml-auto text-[9px] font-medium leading-3 text-tertiary">{children}</span>
  ),
  Item: ({ children, disabled, title, variant = "default", onSelect }: DropdownRendererItemProps) => (
    <button
      className={cn(
        "relative flex min-h-7 w-full cursor-default select-none items-center gap-2 rounded-xs px-2 py-1 text-left text-[10px] font-medium leading-3 text-ink outline-none transition focus:bg-surface-muted focus:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
        variant === "destructive" && "text-danger focus:bg-danger-soft focus:text-danger"
      )}
      data-disabled={disabled ? "true" : undefined}
      data-dropdown-menu-item="true"
      disabled={disabled}
      role="menuitem"
      tabIndex={-1}
      title={disabled ? title : undefined}
      type="button"
      onClick={() => {
        if (!disabled) onSelect();
      }}
    >
      {children}
    </button>
  ),
};

export { DropdownMenu, DropdownMenuGroup, DropdownMenuItem };
