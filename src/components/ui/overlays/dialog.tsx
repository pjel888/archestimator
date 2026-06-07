"use client";

import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  closeLabel: string;
  closeOnOverlayClick: boolean;
  modal: boolean;
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  closeLabel?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  modal?: boolean;
  returnFocusOnClose?: boolean;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${component} must be used inside Dialog`);
  return context;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  closeLabel = "Close dialog",
  closeOnEscape = true,
  closeOnOverlayClick = true,
  modal = true,
  returnFocusOnClose = true,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }

    if (!open && wasOpenRef.current && returnFocusOnClose) {
      openerRef.current?.focus?.();
      openerRef.current = null;
    }

    wasOpenRef.current = open;
  }, [open, returnFocusOnClose]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, onOpenChange, open]);

  const value = useMemo(
    () => ({ open, onOpenChange, titleId, descriptionId, closeLabel, closeOnOverlayClick, modal }),
    [closeLabel, closeOnOverlayClick, descriptionId, modal, onOpenChange, open, titleId],
  );

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogTriggerProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function DialogTrigger({ children, className, disabled }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext("DialogTrigger");

  return (
    <Button type="button" className={className} disabled={disabled} onClick={() => onOpenChange(true)}>
      {children}
    </Button>
  );
}

export function DialogPortal({ children }: { children: ReactNode }) {
  const { open } = useDialogContext("DialogPortal");
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

type DialogOverlayProps = HTMLAttributes<HTMLDivElement> & {
  blur?: boolean;
  transparent?: boolean;
};

export function DialogOverlay({ className, blur = false, transparent = false, onClick, ...props }: DialogOverlayProps) {
  const { onOpenChange, closeOnOverlayClick } = useDialogContext("DialogOverlay");

  return (
    <div
      {...props}
      data-archestimator-dialog-overlay
      className={cn(
        "absolute inset-0",
        transparent ? "bg-transparent" : "bg-black/25",
        blur && "backdrop-blur-md",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && closeOnOverlayClick) onOpenChange(false);
      }}
    />
  );
}

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  role?: "dialog" | "alertdialog";
  described?: boolean;
};

export function DialogContent({ className, role = "dialog", described = true, children, ...props }: DialogContentProps) {
  const { titleId, descriptionId, modal } = useDialogContext("DialogContent");
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={contentRef}
      role={role}
      aria-modal={modal ? "true" : undefined}
      aria-labelledby={titleId}
      aria-describedby={described ? descriptionId : undefined}
      tabIndex={-1}
      className={cn(
        "relative z-[1001] flex min-h-0 flex-col overflow-hidden rounded-xs border border-hairline bg-white text-ink shadow-2xl outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-h-10 items-start justify-between gap-3 border-b border-hairline px-3 py-2", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext("DialogTitle");

  return (
    <h2 id={titleId} className={cn("truncate text-[11px] font-medium leading-4 tracking-normal text-ink", className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext("DialogDescription");

  return (
    <p id={descriptionId} className={cn("mt-0.5 text-[10px] font-medium leading-4 tracking-normal text-tertiary", className)} {...props}>
      {children}
    </p>
  );
}

export function DialogBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto p-3 text-[10px] leading-4 tracking-normal text-secondary", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t border-hairline px-3 py-2", className)} {...props}>
      {children}
    </div>
  );
}

type DialogActionsProps = {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function DialogActions({ left, right, children, className }: DialogActionsProps) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-2", className)}>
      <div className="min-w-0">{left}</div>
      <div className="ml-auto flex shrink-0 items-center gap-1">{right ?? children}</div>
    </div>
  );
}

type DialogCloseButtonProps = {
  className?: string;
};

export function DialogCloseButton({ className }: DialogCloseButtonProps) {
  const { onOpenChange, closeLabel } = useDialogContext("DialogCloseButton");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("size-6 shrink-0 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink", className)}
      aria-label={closeLabel}
      onClick={() => onOpenChange(false)}
    >
      <X size={13} weight="regular" aria-hidden="true" />
    </Button>
  );
}
