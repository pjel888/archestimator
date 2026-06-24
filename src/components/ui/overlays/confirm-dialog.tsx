"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { AppModal, type ModalTone } from "./modal";

type ConfirmTone = "default" | "warning" | "danger" | "destructive";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  error?: ReactNode;
  initialFocus?: "cancel" | "confirm" | "content" | "first";
  onConfirm?: () => void;
  onCancel?: () => void;
};

const modalToneByConfirmTone: Record<ConfirmTone, ModalTone> = {
  default: "default",
  warning: "warning",
  danger: "danger",
  destructive: "destructive",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy,
  error,
  initialFocus,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const destructive = tone === "danger" || tone === "destructive";
  const cancelHasInitialFocus = initialFocus === "cancel" || (!initialFocus && destructive);
  const confirmHasInitialFocus = initialFocus === "confirm";
  const modalInitialFocus = initialFocus === "content" ? "content" : "first";

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      tone={modalToneByConfirmTone[tone]}
      size="sm"
      initialFocus={modalInitialFocus}
      bodyClassName="space-y-3"
      footer={
        <>
          <Button
            variant="ghost"
            autoFocus={!destructive && !initialFocus}
            data-dialog-initial-focus={cancelHasInitialFocus ? "" : undefined}
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            aria-busy={busy ? "true" : undefined}
            disabled={busy}
            data-dialog-initial-focus={confirmHasInitialFocus ? "" : undefined}
            onClick={() => {
              if (busy) return;
              onConfirm?.();
              onOpenChange(false);
            }}
          >
            {busy ? "Working" : confirmLabel}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="border border-dangerSoft bg-dangerSoft px-2 py-1.5 text-[9px] leading-4 tracking-normal text-danger">
          {error}
        </div>
      ) : null}
      {children ? <div className="text-[10px] leading-4 tracking-normal text-secondary">{children}</div> : null}
    </AppModal>
  );
}

function AlertDialog({
  confirmLabel = "Acknowledge",
  tone = "warning",
  ...props
}: Omit<ConfirmDialogProps, "cancelLabel"> & { cancelLabel?: string }) {
  return <ConfirmDialog {...props} tone={tone} confirmLabel={confirmLabel} cancelLabel="Close" />;
}

export function DeleteConfirmDialog(props: Omit<ConfirmDialogProps, "tone" | "confirmLabel"> & { confirmLabel?: string }) {
  return <ConfirmDialog {...props} tone="destructive" confirmLabel={props.confirmLabel ?? "Delete"} />;
}

export function UnsavedChangesDialog(props: Omit<ConfirmDialogProps, "tone" | "confirmLabel"> & { confirmLabel?: string }) {
  return <ConfirmDialog {...props} tone="warning" confirmLabel={props.confirmLabel ?? "Discard changes"} />;
}

function ConfirmDialogMessage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[10px] leading-4 tracking-normal text-secondary", className)}>{children}</div>;
}
