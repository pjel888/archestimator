"use client";

import type { CSSProperties, ReactNode } from "react";

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

export type ResizableModalSize = "sm" | "md" | "lg" | "xl" | "custom";
export type FloatingModalPosition = "center" | "top-right" | "bottom-right" | "top-left" | "bottom-left";

export type ResizableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  modal?: boolean;
  withOverlay?: boolean;
  overlayBlur?: boolean;
  transparentOverlay?: boolean;
  closeLabel?: string;
  position?: FloatingModalPosition;
  size?: ResizableModalSize;
  bodyClassName?: string;
  contentClassName?: string;
};

const sizeDefaults: Record<Exclude<ResizableModalSize, "custom">, { width: number; height: number }> = {
  sm: { width: 360, height: 280 },
  md: { width: 520, height: 380 },
  lg: { width: 720, height: 460 },
  xl: { width: 920, height: 560 },
};

const positionClasses: Record<FloatingModalPosition, string> = {
  center: "items-center justify-center",
  "top-right": "items-start justify-end",
  "bottom-right": "items-end justify-end",
  "top-left": "items-start justify-start",
  "bottom-left": "items-end justify-start",
};

export function ResizableModal({
  open,
  onOpenChange,
  title,
  children,
  description,
  footer,
  defaultWidth,
  defaultHeight,
  minWidth = 320,
  minHeight = 220,
  maxWidth,
  maxHeight,
  resizable = true,
  modal = false,
  withOverlay = false,
  overlayBlur = false,
  transparentOverlay = true,
  closeLabel = "Close popup",
  position = "center",
  size = "md",
  bodyClassName,
  contentClassName,
}: ResizableModalProps) {
  const preset = size === "custom" ? undefined : sizeDefaults[size];
  const width = defaultWidth ?? preset?.width ?? 520;
  const height = defaultHeight ?? preset?.height ?? 380;
  const style: CSSProperties = {
    width,
    height,
    minWidth,
    minHeight,
    maxWidth: maxWidth ?? "calc(100vw - 32px)",
    maxHeight: maxHeight ?? "calc(100dvh - 32px)",
    resize: resizable ? "both" : "none",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={closeLabel}
      closeOnOverlayClick={modal || withOverlay}
      modal={modal}
    >
      <DialogPortal>
        <div
          data-archestimator-resizable-modal-root
          className={cn(
            "fixed inset-0 z-[1000] flex p-4",
            positionClasses[position],
            !modal && !withOverlay && "pointer-events-none",
          )}
        >
          {withOverlay || modal ? <DialogOverlay blur={overlayBlur} transparent={transparentOverlay} /> : null}
          <DialogContent
            described={Boolean(description)}
            style={style}
            className={cn(
              "pointer-events-auto overflow-hidden shadow-[0_20px_64px_rgba(17,24,39,0.18)]",
              !modal && !withOverlay && "ring-1 ring-black/5",
              contentClassName,
            )}
          >
            <DialogHeader>
              <div className="min-w-0">
                <DialogTitle>{title}</DialogTitle>
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

export function FloatingModal(props: ResizableModalProps) {
  return <ResizableModal {...props} modal={props.modal ?? false} withOverlay={props.withOverlay ?? false} />;
}

export function PopupWindow(props: ResizableModalProps) {
  return <ResizableModal {...props} modal={props.modal ?? false} withOverlay={props.withOverlay ?? false} />;
}
