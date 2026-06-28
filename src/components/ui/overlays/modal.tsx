"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "./dialog";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "fullscreen";
export type ModalTone = "default" | "success" | "warning" | "danger" | "destructive";

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  location?: ReactNode;
  size?: ModalSize;
  tone?: ModalTone;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  blurBackdrop?: boolean;
  transparentBackdrop?: boolean;
  initialFocus?: "content" | "first";
  bodyClassName?: string;
  contentClassName?: string;
  className?: string;
};

const sizeClasses: Record<ModalSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  fullscreen: "h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)]",
};

const toneClasses: Record<ModalTone, string> = {
  default: "",
  success: "border-successSoft",
  warning: "border-warningSoft",
  danger: "border-dangerSoft",
  destructive: "border-dangerSoft",
};

const titleToneClasses: Record<ModalTone, string> = {
  default: "",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  destructive: "text-danger",
};

let modalRootStack: HTMLElement[] = [];

function syncModalRootStack() {
  modalRootStack.forEach((element, index) => {
    const isTop = index === modalRootStack.length - 1;
    element.style.zIndex = String(1000 + index * 2);
    if (isTop) {
      element.removeAttribute("inert");
      element.setAttribute("data-archestimator-modal-top", "true");
    } else {
      element.setAttribute("inert", "");
      element.removeAttribute("data-archestimator-modal-top");
    }
  });
}

export function AppModal({
  open,
  onOpenChange,
  title,
  children,
  description,
  footer,
  location,
  size = "md",
  tone = "default",
  closeLabel = "Close modal",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  blurBackdrop = true,
  transparentBackdrop = false,
  initialFocus = "first",
  bodyClassName,
  contentClassName,
  className,
}: AppModalProps) {
  const modalRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !modalRootRef.current) return;
    const root = modalRootRef.current;
    modalRootStack = modalRootStack.filter((element) => element !== root);
    modalRootStack.push(root);
    syncModalRootStack();
    return () => {
      modalRootStack = modalRootStack.filter((element) => element !== root);
      root.removeAttribute("inert");
      root.removeAttribute("data-archestimator-modal-top");
      root.style.zIndex = "";
      syncModalRootStack();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={closeLabel}
      closeOnEscape={closeOnEscape}
      closeOnOverlayClick={closeOnOverlayClick}
      modal
    >
      <DialogPortal>
        <div
          ref={modalRootRef}
          data-archestimator-modal-root
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <DialogOverlay blur={blurBackdrop} transparent={transparentBackdrop} />
          <DialogContent
            role={tone === "destructive" || tone === "danger" ? "alertdialog" : "dialog"}
            described={Boolean(description)}
            initialFocus={initialFocus}
            className={cn(
              "max-h-[calc(100dvh-32px)] w-full",
              sizeClasses[size],
              toneClasses[tone],
              contentClassName,
              className,
            )}
          >
            <div
              data-archestimator-modal-close-header
              className="flex min-h-8 items-center justify-end border-b border-hairline bg-white p-1"
            >
              <DialogCloseButton />
            </div>
            <DialogHeader
              data-archestimator-modal-title-header
              className="min-h-14 justify-start"
            >
              <div className="min-w-0">
                <DialogTitle className={titleToneClasses[tone]}>{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </div>
            </DialogHeader>
            <DialogBody className={bodyClassName}>{children}</DialogBody>
            {footer ? (
              <DialogFooter>
                <DialogActions right={footer} />
              </DialogFooter>
            ) : null}
            <div
              data-archestimator-modal-location-footer
              className="flex min-h-[33px] items-center justify-start border-t border-hairline bg-white px-2 py-1"
            >
              {location ? (
                <div className="min-w-0 truncate text-[10px] font-medium leading-4 tracking-normal text-secondary">
                  {location}
                </div>
              ) : (
                <div className="min-h-4" aria-hidden="true" />
              )}
            </div>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

function BlurModal(props: Omit<AppModalProps, "blurBackdrop"> & { blurBackdrop?: boolean }) {
  return <AppModal {...props} blurBackdrop={props.blurBackdrop ?? true} />;
}

export function Modal(props: AppModalProps) {
  return <AppModal {...props} />;
}
