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

export type SheetSide = "right" | "left" | "bottom";
export type SheetSize = "narrow" | "md" | "wide" | "full";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  side?: SheetSide;
  size?: SheetSize;
  modal?: boolean;
  withScrim?: boolean;
  blurBackdrop?: boolean;
  closeLabel?: string;
  closeOnEscape?: boolean;
  returnFocusOnClose?: boolean;
  contentId?: string;
  bodyClassName?: string;
  contentClassName?: string;
};

const horizontalSizeClasses: Record<SheetSize, string> = {
  narrow: "w-80 max-w-[calc(100vw_-_24px)]",
  md: "w-[420px] max-w-[calc(100vw_-_24px)]",
  wide: "w-[640px] max-w-[calc(100vw_-_24px)]",
  full: "w-[calc(100vw_-_24px)]",
};

const bottomSizeClasses: Record<SheetSize, string> = {
  narrow: "h-[260px] max-h-[calc(100dvh_-_24px)]",
  md: "h-[360px] max-h-[calc(100dvh_-_24px)]",
  wide: "h-[520px] max-h-[calc(100dvh_-_24px)]",
  full: "h-[calc(100dvh_-_24px)]",
};

const rootPositionClasses: Record<SheetSide, string> = {
  right: "items-stretch justify-end",
  left: "items-stretch justify-start",
  bottom: "items-end justify-stretch",
};

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  description,
  footer,
  side = "right",
  size = "md",
  modal = false,
  withScrim = true,
  blurBackdrop = false,
  closeLabel = "Close panel",
  closeOnEscape = true,
  returnFocusOnClose = true,
  contentId,
  bodyClassName,
  contentClassName,
}: SheetProps) {
  const isBottom = side === "bottom";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      closeLabel={closeLabel}
      closeOnEscape={closeOnEscape}
      closeOnOverlayClick={withScrim || modal}
      modal={modal}
      returnFocusOnClose={returnFocusOnClose}
    >
      <DialogPortal>
        <div data-archestimator-sheet-root className={cn("fixed inset-0 z-[1000] flex p-3", rootPositionClasses[side])}>
          {withScrim || modal ? <DialogOverlay blur={blurBackdrop} transparent={!modal} /> : null}
          <DialogContent
            id={contentId}
            described={Boolean(description)}
            className={cn(
              "max-h-[calc(100dvh_-_24px)] shadow-[0_18px_48px_rgba(17,24,39,0.14)]",
              isBottom ? cn("w-full", bottomSizeClasses[size]) : cn("h-full", horizontalSizeClasses[size]),
              contentClassName,
            )}
            data-side={side}
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

export function Drawer(props: SheetProps) {
  return <Sheet {...props} />;
}

function SidePanel(props: SheetProps) {
  return <Sheet {...props} modal={props.modal ?? false} withScrim={props.withScrim ?? false} />;
}

export function InspectorDrawer(props: SheetProps) {
  return <Sheet {...props} side={props.side ?? "right"} size={props.size ?? "wide"} modal={props.modal ?? false} withScrim={props.withScrim ?? false} />;
}
