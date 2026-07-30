"use client";

import { Button } from "@/components/ui/button";
import type { ClientSafeQuotationAttachmentProjection } from "@/lib/commercial-terms/quotation-policy";

export type QuotationAttachmentControlProps = ClientSafeQuotationAttachmentProjection & {
  canEdit: boolean;
  pending?: boolean;
  error?: string | null;
  onLinkRequested: () => void;
  onUnlink: () => void;
};

const STATE_LABELS: Record<ClientSafeQuotationAttachmentProjection["attachmentState"], string> = {
  none: "No quotation attached",
  available: "Quotation attached",
  unavailable: "Quotation attachment unavailable",
};

export function QuotationAttachmentControl({
  attachmentState,
  hasAttachment,
  canEdit,
  pending = false,
  error,
  onLinkRequested,
  onUnlink,
}: QuotationAttachmentControlProps) {
  const interactionDisabled = !canEdit || pending;
  const linkLabel = attachmentState === "none" ? "Attach quotation" : "Replace quotation";

  return (
    <div className="grid gap-1" data-testid="quotation-attachment-control">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[9px] text-secondary">{STATE_LABELS[attachmentState]}</span>
        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            <Button
              size="xs"
              variant="secondary"
              disabled={interactionDisabled}
              aria-label={linkLabel}
              onClick={onLinkRequested}
            >
              {linkLabel}
            </Button>
            {attachmentState === "available" && hasAttachment ? (
              <Button
                size="xs"
                variant="danger"
                disabled={interactionDisabled}
                aria-label="Unlink quotation"
                onClick={onUnlink}
              >
                Unlink
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {pending ? <output className="text-[9px] text-muted" role="status">Saving quotation attachment</output> : null}
      {error ? <p className="text-[9px] leading-3 text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
