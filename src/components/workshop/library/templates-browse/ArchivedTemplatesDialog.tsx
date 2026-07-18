"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { EstimateTemplate } from "@/lib/component-library/estimate-templates";
import { restoreEstimateTemplate } from "@/lib/component-library/actions";
import { loadCurrentWorkspaceArchivedTemplates } from "@/lib/component-library/template-browse-actions";
import {
  permanentlyDeleteEstimateTemplate,
  previewPermanentDeleteEstimateTemplate,
} from "@/lib/component-library/template-lifecycle-actions";

type DeletePreview = Awaited<ReturnType<typeof previewPermanentDeleteEstimateTemplate>>;

export function ArchivedTemplatesDialog({
  open,
  onOpenChange,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (template: EstimateTemplate) => void;
}) {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EstimateTemplate | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [typedName, setTypedName] = useState("");

  const loadArchived = useCallback(() => {
    setStatus("loading");
    setMessage("");
    void loadCurrentWorkspaceArchivedTemplates()
      .then((items) => {
        setTemplates(items);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not load archived Templates.");
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = globalThis.setTimeout(loadArchived, 0);
    return () => globalThis.clearTimeout(timeout);
  }, [loadArchived, open]);

  return (
    <Modal
      open={open}
      title="Archived Templates"
      description="Restore Templates to Active, or permanently delete them after reviewing linked-instance impact."
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pendingTemplateId) onOpenChange(false);
      }}
      closeLabel="Close archived Templates"
      className="max-w-lg"
    >
      <div className="space-y-3">
        {status === "loading" ? <p className="text-[10px] text-tertiary">Loading archived Templates…</p> : null}
        {status === "error" ? (
          <div className="rounded-xs border border-dangerSoft p-2 text-[10px] text-danger">
            <p>{message || "Could not load archived Templates."}</p>
            <Button type="button" variant="secondary" size="xs" className="mt-2" onClick={loadArchived}>Retry</Button>
          </div>
        ) : null}
        {status === "idle" && templates.length === 0 ? (
          <p className="rounded-xs border border-hairline p-4 text-center text-[10px] text-tertiary">No archived Templates</p>
        ) : null}
        {templates.map((template) => (
          <div key={template.id} className="rounded-xs border border-hairline p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-ink">{template.name}</p>
                <p className="text-[9px] text-tertiary">Archived {template.archivedAt ? new Date(template.archivedAt).toLocaleDateString() : "recently"}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={Boolean(pendingTemplateId)}
                  onClick={() => {
                    setPendingTemplateId(template.id);
                    setMessage("");
                    void restoreEstimateTemplate({ intentId: globalThis.crypto.randomUUID(), templateId: template.id })
                      .then(() => {
                        setTemplates((items) => items.filter((item) => item.id !== template.id));
                        onRestored({ ...template, archivedAt: null, archivedBy: null });
                      })
                      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not restore the Template."))
                      .finally(() => setPendingTemplateId(null));
                  }}
                >
                  {pendingTemplateId === template.id ? "Restoring…" : "Restore"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="xs"
                  disabled={Boolean(pendingTemplateId)}
                  onClick={() => {
                    setPendingTemplateId(template.id);
                    setMessage("");
                    void previewPermanentDeleteEstimateTemplate({ templateId: template.id })
                      .then((preview) => {
                        setDeleteTarget(template);
                        setDeletePreview(preview);
                        setTypedName("");
                      })
                      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not preview permanent deletion."))
                      .finally(() => setPendingTemplateId(null));
                  }}
                >
                  Permanently delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {deleteTarget && deletePreview ? (
          <div className="rounded-xs border border-dangerSoft bg-dangerSoft/20 p-3">
            <p className="text-[10px] font-medium text-ink">Permanently delete {deleteTarget.name}?</p>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">
              {deletePreview.activeInstanceCount > 0
                ? `${deletePreview.activeInstanceCount} linked ${deletePreview.activeInstanceCount === 1 ? "instance" : "instances"} across ${deletePreview.affectedEstimateCount} ${deletePreview.affectedEstimateCount === 1 ? "Estimate" : "Estimates"} will be detached and kept as local content.`
                : "This Template has no active linked instances."}
            </p>
            <label className="mt-2 block text-[9px] font-medium text-ink">
              Type {deleteTarget.name}
              <input
                value={typedName}
                onChange={(event) => setTypedName(event.currentTarget.value)}
                className="mt-1 h-7 w-full rounded-xs border border-hairline px-2 text-[10px] outline-none focus:border-focus"
              />
            </label>
            <div className="mt-2 flex justify-end gap-1">
              <Button type="button" variant="secondary" size="xs" disabled={Boolean(pendingTemplateId)} onClick={() => {
                setDeleteTarget(null);
                setDeletePreview(null);
                setTypedName("");
              }}>Cancel</Button>
              <Button
                type="button"
                variant="danger"
                size="xs"
                disabled={Boolean(pendingTemplateId) || typedName !== deleteTarget.name}
                onClick={() => {
                  setPendingTemplateId(deleteTarget.id);
                  setMessage("");
                  void permanentlyDeleteEstimateTemplate({
                    intentId: globalThis.crypto.randomUUID(),
                    templateId: deleteTarget.id,
                    typedName,
                    expectedVersionNumber: deletePreview.currentVersionNumber,
                    impactFingerprint: deletePreview.fingerprint,
                  }).then(() => {
                    setTemplates((items) => items.filter((item) => item.id !== deleteTarget.id));
                    setDeleteTarget(null);
                    setDeletePreview(null);
                    setTypedName("");
                  }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not permanently delete the Template."))
                    .finally(() => setPendingTemplateId(null));
                }}
              >
                {pendingTemplateId === deleteTarget.id
                  ? "Deleting…"
                  : deletePreview.activeInstanceCount > 0
                    ? `Detach all ${deletePreview.activeInstanceCount} and delete`
                    : "Permanently delete"}
              </Button>
            </div>
          </div>
        ) : null}
        {message && status !== "error" ? <p role="alert" className="text-[9px] text-danger">{message}</p> : null}
      </div>
    </Modal>
  );
}
