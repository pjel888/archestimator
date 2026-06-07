"use client";

import type { ReactNode } from "react";

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
  size?: ModalSize;
  tone?: ModalTone;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  blurBackdrop?: boolean;
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

export function AppModal({
  open,
  onOpenChange,
  title,
  children,
  description,
  footer,
  size = "md",
  tone = "default",
  closeLabel = "Close modal",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  blurBackdrop = true,
  bodyClassName,
  contentClassName,
  className,
}: AppModalProps) {
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
          data-archestimator-modal-root
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <DialogOverlay blur={blurBackdrop} />
          <DialogContent
            role={tone === "destructive" || tone === "danger" ? "alertdialog" : "dialog"}
            described={Boolean(description)}
            className={cn(
              "max-h-[calc(100dvh-32px)] w-full",
              sizeClasses[size],
              toneClasses[tone],
              contentClassName,
              className,
            )}
          >
            <DialogHeader>
              <div className="min-w-0">
                <DialogTitle className={titleToneClasses[tone]}>{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </div>
              <DialogCloseButton />
            </DialogHeader>
            <DialogBody className={bodyClassName}>{children}</DialogBody>
            {footer ? (
              <DialogFooter>
                <DialogActions right={footer} />
              </DialogFooter>
            ) : null}
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

export function BlurModal(props: Omit<AppModalProps, "blurBackdrop"> & { blurBackdrop?: boolean }) {
  return <AppModal {...props} blurBackdrop={props.blurBackdrop ?? true} />;
}

export function Modal(props: AppModalProps) {
  return <AppModal {...props} />;
}
