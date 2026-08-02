"use client";

import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ControlInput } from "@/components/ui/control-input";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import type { PendingTemplateSharedMutation } from "./use-template-editor";

export type TemplateEditorTextPrompt = {
  title: string;
  label: string;
  confirmLabel: string;
  initialValue: string;
  onSubmit: (value: string) => void;
};

export function TemplateEditorDialogs({
  deleteNodeTarget,
  onCloseDeleteNode,
  onConfirmDeleteNode,
  pendingSharedMutation,
  onCancelSharedMutation,
  onConfirmSharedMutation,
  textPrompt,
  textPromptValue,
  onCloseTextPrompt,
  onTextPromptValueChange,
  onSubmitTextPrompt,
}: {
  deleteNodeTarget: EstimateTreeNode | null;
  onCloseDeleteNode: () => void;
  onConfirmDeleteNode: () => void;
  pendingSharedMutation: PendingTemplateSharedMutation | null;
  onCancelSharedMutation: () => void;
  onConfirmSharedMutation: () => Promise<boolean>;
  textPrompt: TemplateEditorTextPrompt | null;
  textPromptValue: string;
  onCloseTextPrompt: () => void;
  onTextPromptValueChange: (value: string) => void;
  onSubmitTextPrompt: () => void;
}) {
  return (
    <>
      {deleteNodeTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) onCloseDeleteNode();
          }}
          title={`Delete ${deleteNodeTarget.kind === "group" ? "group" : "area"}?`}
          description={`"${deleteNodeTarget.name}" and its rows and child nodes are removed from this template.`}
          tone="destructive"
          confirmLabel="Delete"
          onConfirm={onConfirmDeleteNode}
        />
      ) : null}

      {pendingSharedMutation ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) onCancelSharedMutation();
          }}
          title={`${pendingSharedMutation.actionLabel}?`}
          description={
            `${pendingSharedMutation.impact.activeInstanceCount} linked ${pendingSharedMutation.impact.activeInstanceCount === 1 ? "instance" : "instances"} `
            + `across ${pendingSharedMutation.impact.affectedProjectCount} ${pendingSharedMutation.impact.affectedProjectCount === 1 ? "project" : "projects"} `
            + `and ${pendingSharedMutation.impact.affectedEstimateCount} ${pendingSharedMutation.impact.affectedEstimateCount === 1 ? "estimate" : "estimates"} will update.`
          }
          confirmLabel="Update linked instances"
          onConfirm={() => {
            void onConfirmSharedMutation();
          }}
        />
      ) : null}

      {textPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) onCloseTextPrompt();
          }}
          title={textPrompt.title}
          description="Enter a name and confirm to apply."
          confirmLabel={textPrompt.confirmLabel}
          onConfirm={onSubmitTextPrompt}
        >
          <label className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">{textPrompt.label}</span>
            <ControlInput
              aria-label={textPrompt.label}
              autoFocus
              value={textPromptValue}
              onChange={(event) => onTextPromptValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmitTextPrompt();
                }
              }}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
