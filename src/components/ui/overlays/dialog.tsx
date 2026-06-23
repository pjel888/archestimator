"use client";

import {
  createContext,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
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
  dialogId: string;
  titleId: string;
  descriptionId: string;
  closeLabel: string;
  closeOnEscape: boolean;
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
let openDialogStack: string[] = [];
let modalLockCount = 0;
let lockedShells = new Set<Element>();
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0,
  );
}

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
  const dialogId = useId();
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
    if (!open) return;
    openDialogStack = openDialogStack.filter((id) => id !== dialogId);
    openDialogStack.push(dialogId);
    return () => {
      openDialogStack = openDialogStack.filter((id) => id !== dialogId);
    };
  }, [dialogId, open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Popups hosted in the dialog (dropdown listboxes/menus) own Escape
      // while open: they prevent-default on the native event, so a handled
      // press must close only the popup, never the dialog underneath it.
      if (event.key === "Escape" && !event.defaultPrevented && openDialogStack.at(-1) === dialogId) {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, dialogId, onOpenChange, open]);

  // Body scroll lock + inert on background content
  useEffect(() => {
    if (!open || !modal) return;

    const body = document.body;
    if (modalLockCount === 0) {
      originalBodyOverflow = body.style.overflow;
      originalBodyPaddingRight = body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    modalLockCount += 1;

    // Add inert to main app shells so background content is hidden from assistive tech
    const shells = document.querySelectorAll("[data-workshop-page-shell-root], [data-public-page-shell-root]");
    shells.forEach((el) => {
      lockedShells.add(el);
      el.setAttribute("inert", "");
    });

    return () => {
      modalLockCount = Math.max(0, modalLockCount - 1);
      if (modalLockCount === 0) {
        body.style.overflow = originalBodyOverflow;
        body.style.paddingRight = originalBodyPaddingRight;
        lockedShells.forEach((el) => el.removeAttribute("inert"));
        lockedShells = new Set<Element>();
      }
    };
  }, [modal, open]);

  const value = useMemo(
    () => ({ open, onOpenChange, dialogId, titleId, descriptionId, closeLabel, closeOnEscape, closeOnOverlayClick, modal }),
    [closeLabel, closeOnEscape, closeOnOverlayClick, descriptionId, dialogId, modal, onOpenChange, open, titleId],
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
  initialFocus?: "content" | "first";
  role?: "dialog" | "alertdialog";
  described?: boolean;
};

export function DialogContent({
  className,
  role = "dialog",
  described = true,
  initialFocus = "first",
  children,
  onKeyDown,
  ...props
}: DialogContentProps) {
  const { titleId, descriptionId, modal, closeOnEscape, onOpenChange, dialogId } = useDialogContext("DialogContent");
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    window.requestAnimationFrame(() => {
      if (initialFocus === "content") {
        content.focus({ preventScroll: true });
        return;
      }

      const preferredFocusable = content.querySelector<HTMLElement>("[data-dialog-initial-focus]");
      const firstFocusable = getFocusableElements(content)[0];
      (preferredFocusable ?? firstFocusable ?? content).focus({ preventScroll: true });
    });
  }, [initialFocus]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && closeOnEscape && openDialogStack.at(-1) === dialogId) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key !== "Tab") return;

    const content = contentRef.current;
    if (!content) return;

    const focusableElements = getFocusableElements(content);
    if (focusableElements.length === 0) {
      event.preventDefault();
      content.focus({ preventScroll: true });
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements.at(-1);
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === firstFocusable || activeElement === content)) {
      event.preventDefault();
      lastFocusable?.focus({ preventScroll: true });
      return;
    }

    if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus({ preventScroll: true });
    }
  }

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
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-h-10 items-center justify-between gap-2 border-b border-hairline p-2", className)} {...props}>
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
    <p id={descriptionId} className={cn("mt-0.5 text-[10px] font-medium leading-4 tracking-normal text-secondary", className)} {...props}>
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
      className={cn(
        "size-6 shrink-0 rounded-xs p-0",
        "bg-transparent text-secondary",
        "hover:!bg-[#FBE8E8] hover:!text-[#B84646]",
        className
      )}
      aria-label={closeLabel}
      onClick={() => onOpenChange(false)}
    >
      <X size={13} weight="regular" aria-hidden="true" />
    </Button>
  );
}
