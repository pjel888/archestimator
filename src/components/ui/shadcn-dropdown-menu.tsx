"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CaretRight, Check } from "@phosphor-icons/react/dist/ssr";
import * as React from "react";

import { cn } from "@/lib/ui/cn";

function ShadcnDropdownMenu({
  modal = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" modal={modal} {...props} />;
}

function ShadcnDropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function ShadcnDropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function ShadcnDropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function ShadcnDropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function ShadcnDropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function ShadcnDropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex min-h-7 cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink outline-none transition-colors duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted data-[state=open]:bg-surface-muted data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <CaretRight weight="regular" className="ml-auto !size-2.5 text-tertiary" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function ShadcnDropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      sideOffset={4}
      alignOffset={-4}
      collisionPadding={8}
      className={cn(
        "z-[1050] min-w-32 origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-hidden rounded-xs border border-hairline bg-white p-1 text-ink shadow-[0_12px_32px_rgba(17,24,39,0.12)] outline-none data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  );
}

function ShadcnDropdownMenuContent({
  className,
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-[1050] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-32 origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-xs border border-hairline bg-white p-1 text-ink shadow-[0_12px_32px_rgba(17,24,39,0.12)] outline-none data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function ShadcnDropdownMenuItem({
  className,
  inset,
  icon,
  shortcut,
  variant = "default",
  selected,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  icon?: React.ReactNode;
  shortcut?: React.ReactNode;
  variant?: "default" | "destructive";
  selected?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      data-dropdown-menu-item="true"
      className={cn(
        "relative flex min-h-7 cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink outline-none transition-colors duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-muted data-[inset]:pl-8 data-[variant=destructive]:text-danger data-[variant=destructive]:data-[highlighted]:bg-danger-soft data-[variant=destructive]:data-[highlighted]:text-danger [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span className="flex size-3 shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <ShadcnDropdownMenuShortcut>{shortcut}</ShadcnDropdownMenuShortcut> : null}
      {selected ? (
        <span className="ml-auto flex size-3 shrink-0 items-center justify-center" data-action-menu-item-check="true">
          <Check aria-hidden="true" weight="regular" />
        </span>
      ) : null}
    </DropdownMenuPrimitive.Item>
  );
}

function ShadcnDropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2 py-1 text-[9px] font-medium leading-3 text-tertiary data-[inset]:pl-8", className)}
      {...props}
    />
  );
}

function ShadcnDropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-hairline", className)}
      {...props}
    />
  );
}

function ShadcnDropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-[9px] font-medium leading-3 text-tertiary", className)}
      {...props}
    />
  );
}

export {
  ShadcnDropdownMenu,
  ShadcnDropdownMenuTrigger,
  ShadcnDropdownMenuContent,
  ShadcnDropdownMenuItem,
  ShadcnDropdownMenuLabel,
  ShadcnDropdownMenuSeparator,
  ShadcnDropdownMenuShortcut,
  ShadcnDropdownMenuGroup,
  ShadcnDropdownMenuPortal,
  ShadcnDropdownMenuSub,
  ShadcnDropdownMenuSubContent,
  ShadcnDropdownMenuSubTrigger,
  ShadcnDropdownMenuRadioGroup,
};
