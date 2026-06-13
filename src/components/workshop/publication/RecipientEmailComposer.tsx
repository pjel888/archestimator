"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  addSharedLinkRecipients,
  listSharedLinkRecipients,
  removeSharedLinkRecipient,
  readSharedLinkEmailDeliveryReadiness,
  resendSharedLinkRecipientEmail,
} from "@/lib/publication/actions";

/* P4: RecipientEmailComposer — compact, design-system compliant email recipient manager.
 * Used inside the "Recipients" tab of the publication manager modal.
 * - Email chip input (type + Enter/ comma / blur adds; simple validation)
 * - Remove chips (×)
 * - Send action calls addSharedLinkRecipients (tokens + Resend + graceful)
 * - Remove calls remove
 * - Status chips: Pending / Sent / Bounced / Opened (small rounded-xs badges)
 * - SF Pro stack via parent, ≤12px (text-[10px]/ [9px]), rounded-xs, hairline borders, min-h-7
 * - No secrets; uses provided server actions.
 * - Backwards: does not affect Link/Estimates/Access flows.
 */
export type RecipientEmailComposerProps = {
  publicationId: string;
  baseClientLink?: string | null;
  currentUserEmail?: string | null;
  projectName?: string | null;
  onMessage?: (msg: string | null) => void;
};

type LocalRecipient = {
  id?: string;
  email: string;
  displayName?: string | null;
  delivery_status: "pending" | "sent" | "bounced" | "opened" | "responded";
  email_unsubscribed_at?: string | null;
};

type SharedLinkRecipient = Awaited<ReturnType<typeof listSharedLinkRecipients>>[number];
type RecipientEmailResult = Awaited<ReturnType<typeof addSharedLinkRecipients>>["emailResults"][number];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readSelfInviteBlockedMessage() {
  return "You cannot invite your own sign-in email to this shared link.";
}

export function RecipientEmailComposer({ publicationId, baseClientLink, currentUserEmail, projectName, onMessage }: RecipientEmailComposerProps) {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<LocalRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [resendingRecipientId, setResendingRecipientId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<LocalRecipient | null>(null);
  const [emailDeliveryConfigured, setEmailDeliveryConfigured] = useState<boolean | null>(null);
  const [emailDeliveryMessage, setEmailDeliveryMessage] = useState<string | null>(null);
  const projectLabel = projectName?.trim() || "this project";
  const normalizedCurrentUserEmail = normalizeEmail(currentUserEmail ?? "");

  // Load existing recipients for this publication (status chips)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicationId) return;
      setIsLoadingList(true);
      try {
        const [rows, readiness] = await Promise.all([
          listSharedLinkRecipients({ publicationId }),
          readSharedLinkEmailDeliveryReadiness(),
        ]);
        if (!cancelled) {
          const mapped: LocalRecipient[] = (rows || []).map((r: SharedLinkRecipient) => ({
            id: r.id,
            email: r.email,
            displayName: r.display_name,
            delivery_status: r.delivery_status || "pending",
            email_unsubscribed_at: r.email_unsubscribed_at,
          }));
          setChips(mapped);
          setEmailDeliveryConfigured(readiness.configured);
          setEmailDeliveryMessage(readiness.message);
        }
      } catch {
        // Fail closed: recipient management remains visible, but email sending stays disabled.
        if (!cancelled) {
          setChips([]);
          setEmailDeliveryConfigured(false);
          setEmailDeliveryMessage("Email delivery status could not be verified. Copy the share link manually.");
        }
      } finally {
        if (!cancelled) setIsLoadingList(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [publicationId]);

  function parseAndAddEmails(raw: string) {
    const parts = raw.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
    const next = [...chips];
    let added = 0;
    for (const p of parts) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) continue;
      const lower = normalizeEmail(p);
      if (normalizedCurrentUserEmail && lower === normalizedCurrentUserEmail) {
        setLocalMessage(readSelfInviteBlockedMessage());
        if (onMessage) onMessage(readSelfInviteBlockedMessage());
        continue;
      }
      if (next.some((c) => c.email.toLowerCase() === lower)) continue;
      next.push({ email: lower, delivery_status: "pending" });
      added++;
    }
    if (added > 0) {
      setChips(next);
      setInput("");
      setLocalMessage(null);
    }
  }

  function removeChip(email: string) {
    setChips((prev) => prev.filter((c) => c.email.toLowerCase() !== email.toLowerCase()));
  }

  async function handleSend() {
    if (chips.length === 0 || isSending || emailDeliveryConfigured !== true) return;
    setIsSending(true);
    setLocalMessage(null);
    if (onMessage) onMessage(null);

    try {
      const payload = chips
        .filter((c) => !c.email_unsubscribed_at && (c.delivery_status === "pending" || !c.id)) // only new/pending
        .map((c) => ({ email: c.email, displayName: c.displayName || undefined }));

      if (payload.length === 0) {
        setLocalMessage("All listed recipients already invited.");
        setIsSending(false);
        return;
      }

      const result = await addSharedLinkRecipients({
        publicationId,
        recipients: payload,
        baseClientLink,
      });

      // Optimistic merge of results into chips with statuses
      const updated = chips.map((chip) => {
        const match = result.emailResults.find((emailResult: RecipientEmailResult) => emailResult.email.toLowerCase() === chip.email.toLowerCase());
        if (match) {
          return {
            ...chip,
            delivery_status: match.ok ? "sent" : "pending",
          } as LocalRecipient;
        }
        return chip;
      });

      // Include any brand new that weren't in prior list
      const existingEmails = new Set(updated.map((c) => c.email.toLowerCase()));
      for (const er of result.emailResults) {
        if (!existingEmails.has(er.email.toLowerCase())) {
          updated.push({
            email: er.email,
            delivery_status: er.ok ? "sent" : "pending",
          });
        }
      }

      setChips(updated);
      const msg = result.message || (result.ok ? "Recipients added." : "Some recipients could not be added.");
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add recipients.";
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    } finally {
      setIsSending(false);
    }
  }

  async function handleRemove(rec: LocalRecipient) {
    if (!rec.id) {
      // Local only chip
      removeChip(rec.email);
      return;
    }
    try {
      await removeSharedLinkRecipient({ publicationId, recipientId: rec.id });
      setChips((prev) => prev.filter((c) => c.id !== rec.id));
      const msg = `Removed ${rec.email}`;
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    } catch {
      const msg = "Remove failed.";
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    }
  }

  async function handleResend(rec: LocalRecipient) {
    if (!rec.id || resendingRecipientId || emailDeliveryConfigured !== true) return;
    setResendingRecipientId(rec.id);
    setLocalMessage(null);
    if (onMessage) onMessage(null);

    try {
      const result = await resendSharedLinkRecipientEmail({
        publicationId,
        recipientId: rec.id,
        baseClientLink,
      });
      setChips((prev) =>
        prev.map((chip) =>
          chip.id === rec.id
            ? { ...chip, delivery_status: result.ok ? "sent" : "pending" }
            : chip,
        ),
      );
      setLocalMessage(result.message);
      if (onMessage) onMessage(result.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recipient resend failed.";
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    } finally {
      setResendingRecipientId(null);
    }
  }

  const pendingCount = chips.filter((c) => !c.email_unsubscribed_at && c.delivery_status === "pending").length;
  const emailDisabled = emailDeliveryConfigured !== true;
  const canSend = pendingCount > 0 && !isSending && !emailDisabled;

  return (
    <div className="text-[10px]">
      <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Email recipients</h3>
      <p className="text-[9px] leading-3 text-tertiary mb-2">
        {emailDisabled
          ? emailDeliveryMessage ?? "Checking email delivery configuration..."
          : `Add emails to receive the unique share link for ${projectLabel}. Delivery is best-effort; link creation always succeeds.`}
      </p>

      {/* Chip input */}
      <div className="flex flex-wrap items-center gap-1 rounded-xs border border-hairline bg-white p-1 min-h-7">
        {chips.map((chip) => {
          const status = chip.delivery_status;
          const statusLabel = chip.email_unsubscribed_at ? "unsubscribed" : status === "bounced" ? "failed" : status;
          const statusClass =
            chip.email_unsubscribed_at ? "bg-surfaceMuted text-tertiary" :
            status === "sent" ? "bg-successSoft text-success" :
            status === "bounced" ? "bg-dangerSoft text-danger" :
            status === "opened" ? "bg-accentSoft text-ink" :
            "bg-warningSoft text-warning";
          return (
            <span key={chip.id || chip.email} className="inline-flex items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted pl-1.5 pr-0.5 py-0 text-[9px] leading-4">
              <span className="truncate max-w-[140px]">{chip.displayName ? `${chip.displayName} <${chip.email}>` : chip.email}</span>
              <span className={`rounded-xs px-1 py-0 text-[8px] font-medium ${statusClass}`}>{statusLabel}</span>
              {chip.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Resend ${chip.email}`}
                  className="h-5 px-1 py-0 text-[9px] text-tertiary hover:text-ink"
                  onClick={() => void handleResend(chip)}
                  disabled={emailDisabled || isSending || Boolean(resendingRecipientId) || Boolean(chip.email_unsubscribed_at)}
                >
                  <ArrowClockwise size={10} aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${chip.email}`}
                className="h-5 px-1 py-0 text-[9px] text-tertiary hover:text-danger"
                onClick={() => {
                  // Persisted chips can destroy a recorded decision (cascade
                  // DELETE on shared_link_responses) — gate behind a confirm.
                  // Local-only chips have nothing persisted, so remove inline.
                  if (chip.id) {
                    setPendingRemoval(chip);
                  } else {
                    removeChip(chip.email);
                  }
                }}
                disabled={isSending}
              >
                ×
              </Button>
            </span>
          );
        })}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-[10px] leading-4 outline-none placeholder:text-tertiary px-1"
          placeholder="name@company.com, another@..."
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              parseAndAddEmails(e.currentTarget.value);
            }
            if (e.key === "Backspace" && !input && chips.length > 0) {
              // remove last
              setChips((p) => p.slice(0, -1));
            }
          }}
          onBlur={() => { if (input.trim()) parseAndAddEmails(input); }}
          disabled={emailDisabled || isSending || isLoadingList}
        />
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="min-h-6 px-2 py-0 text-[9px]"
        >
          {isSending ? "Sending..." : `Send to ${pendingCount} recipient${pendingCount === 1 ? "" : "s"}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setChips([]); setInput(""); setLocalMessage(null); }}
          disabled={isSending || chips.length === 0}
          className="min-h-6 px-1.5 py-0 text-[9px]"
        >
          Clear
        </Button>
        {isLoadingList && <span className="text-[9px] text-tertiary">Loading…</span>}
      </div>

      {localMessage && (
        <p className="mt-1.5 rounded-xs bg-surfaceMuted px-2 py-1 text-[9px] text-secondary" role="status">{localMessage}</p>
      )}

      {chips.length === 0 && !isLoadingList && (
        <p className="mt-1 text-[9px] text-tertiary">No recipients yet. Add emails above and send.</p>
      )}

      <Modal
        open={pendingRemoval !== null}
        title="Remove recipient?"
        tone={pendingRemoval?.delivery_status === "responded" ? "destructive" : "default"}
        onOpenChange={(next) => {
          if (!next) setPendingRemoval(null);
        }}
        className="max-w-sm"
      >
        <div className="space-y-3">
          {pendingRemoval?.delivery_status === "responded" ? (
            <p className="rounded-xs border border-dangerSoft bg-dangerSoft px-2 py-1.5 text-[10px] leading-4 text-danger" role="alert">
              <strong className="font-medium">{pendingRemoval?.email}</strong> has submitted a decision on this
              shared page. Removing them will <strong className="font-medium">permanently delete their recorded
              decision</strong> — this cannot be undone.
            </p>
          ) : (
            <p className="text-[10px] leading-4 text-secondary">
              Remove <strong className="font-medium">{pendingRemoval?.email}</strong>? Their personal link will stop
              working and they&apos;ll lose access to this shared page.
            </p>
          )}
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              onClick={() => setPendingRemoval(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              aria-label="Remove recipient"
              onClick={() => {
                if (pendingRemoval) void handleRemove(pendingRemoval);
                setPendingRemoval(null);
              }}
            >
              Remove recipient
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
