"use client";

import * as React from "react";

import {
  type ActionMenuGroup,
  ContextActionMenuContent,
} from "@/components/ui/action-menu";
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
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const menuId = React.useId();
  const groups = React.useMemo(() => buildActionGroups(children, () => setOpen(false)), [children]);

  const focusMenuItem = React.useCallback((direction: "first" | "last" | "next" | "previous") => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-dropdown-menu-item]:not([data-disabled='true'])")
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

    items[nextIndex]?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => focusMenuItem("first"));
    return () => cancelAnimationFrame(frame);
  }, [focusMenuItem, open]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const closeAndFocusTrigger = React.useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const handleMenuKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndFocusTrigger();
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
    [closeAndFocusTrigger, focusMenuItem]
  );

  const renderedTrigger = renderTrigger(trigger, {
    menuId,
    open,
    triggerRef,
    onOpen: () => setOpen((value) => !value),
    onKeyboardOpen: () => setOpen(true),
  });

  return (
    <div ref={rootRef} className="relative inline-flex" data-slot="dropdown-menu-root">
      {renderedTrigger}
      {open ? (
        <div
          id={menuId}
          aria-orientation="vertical"
          className={cn(
            "absolute z-[1050] min-w-32 overflow-hidden rounded-xs border border-hairline bg-white p-1 font-sans text-[10px] font-normal leading-3 text-ink shadow-[0_12px_32px_rgba(17,24,39,0.12)] outline-none",
            side === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
            align === "end" ? "right-0" : "left-0",
            className
          )}
          data-side={side}
          data-slot="dropdown-menu-content"
          role="menu"
          onKeyDown={handleMenuKeyDown}
        >
          <ContextActionMenuContent groups={groups} renderer={dropdownRenderer} />
        </div>
      ) : null}
    </div>
  );
}, { Item: DropdownMenuItem, Group: DropdownMenuGroup }) satisfies DropdownMenuComponent;

function renderTrigger(
  trigger: React.ReactNode,
  options: {
    menuId: string;
    open: boolean;
    triggerRef: React.MutableRefObject<HTMLElement | null>;
    onOpen: () => void;
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
      if (!event.defaultPrevented) options.onOpen();
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

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

export { DropdownMenu, DropdownMenuGroup, DropdownMenuItem };
