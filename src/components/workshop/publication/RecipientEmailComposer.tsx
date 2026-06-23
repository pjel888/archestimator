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
  isPublicationBusy?: boolean;
  onMessage?: (msg: RecipientComposerMessage | null) => void;
};

type RecipientComposerMessage = {
  text: string;
  tone: "success" | "error";
};

type LocalRecipient = {
  id?: string;
  email: string;
  displayName?: string | null;
  delivery_status: "pending" | "sent" | "bounced" | "opened" | "responded";
  email_unsubscribed_at?: string | null;
  // AC-MOD-17 (MOD-REC-05): a server "duplicate" result is a UI-only treatment, not a real
  // persisted delivery status, so it rides on a separate flag instead of widening the
  // delivery_status union. The chip renders neutrally (not green "sent") when this is set.
  isDuplicate?: boolean;
  sendStatus?: "failed";
  sendError?: string;
};

type SharedLinkRecipient = Awaited<ReturnType<typeof listSharedLinkRecipients>>[number];
type RecipientEmailResult = Awaited<ReturnType<typeof addSharedLinkRecipients>>["emailResults"][number];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readSelfInviteBlockedMessage() {
  return "You cannot invite your own sign-in email to this shared link.";
}

// AC-MOD-13 (MOD-REC-06): only an already-engaged recipient (opened/responded) loses something
// when their token rotates on resend, so only those require a confirm. pending/sent resend directly.
function resendNeedsConfirm(rec: LocalRecipient) {
  return rec.delivery_status === "opened" || rec.delivery_status === "responded";
}

function isFailedRecipient(rec: LocalRecipient) {
  return rec.sendStatus === "failed" || rec.delivery_status === "bounced";
}

function applyRecipientEmailResults(
  recipients: LocalRecipient[],
  emailResults: RecipientEmailResult[],
) {
  const updated = recipients.map((chip) => {
    const match = emailResults.find((emailResult) => emailResult.email.toLowerCase() === chip.email.toLowerCase());
    if (match) {
      const isDuplicate = match.status === "duplicate";
      const isFailed = !isDuplicate && !match.ok;
      return {
        ...chip,
        id: match.id ?? chip.id,
        isDuplicate,
        sendStatus: isFailed ? "failed" : undefined,
        sendError: isFailed ? match.error : undefined,
        delivery_status: isDuplicate ? chip.delivery_status : match.ok ? "sent" : "pending",
      } as LocalRecipient;
    }
    return chip;
  });

  const existingEmails = new Set(updated.map((c) => c.email.toLowerCase()));
  for (const er of emailResults) {
    if (!existingEmails.has(er.email.toLowerCase())) {
      const isDuplicate = er.status === "duplicate";
      const isFailed = !isDuplicate && !er.ok;
      updated.push({
        id: er.id,
        email: er.email,
        isDuplicate,
        sendStatus: isFailed ? "failed" : undefined,
        sendError: isFailed ? er.error : undefined,
        delivery_status: isDuplicate ? "pending" : er.ok ? "sent" : "pending",
      });
    }
  }

  return updated;
}

export function RecipientEmailComposer({ publicationId, baseClientLink, currentUserEmail, projectName, isPublicationBusy = false, onMessage }: RecipientEmailComposerProps) {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<LocalRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [localMessage, setLocalMessage] = useState<RecipientComposerMessage | null>(null);
  const [resendingRecipientId, setResendingRecipientId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<LocalRecipient | null>(null);
  // AC-MOD-13 (MOD-REC-06): a recipient who has already opened/responded keeps their live token;
  // resending rotates it and downgrades their status. Gate those resends behind a confirm so the
  // owner doesn't silently invalidate an engaged recipient's link. pending/sent resend directly.
  const [pendingResend, setPendingResend] = useState<LocalRecipient | null>(null);
  const [emailDeliveryConfigured, setEmailDeliveryConfigured] = useState<boolean | null>(null);
  const [emailDeliveryMessage, setEmailDeliveryMessage] = useState<string | null>(null);
  const projectLabel = projectName?.trim() || "this project";
  const normalizedCurrentUserEmail = normalizeEmail(currentUserEmail ?? "");

  function setRecipientMessage(text: string, tone: RecipientComposerMessage["tone"]) {
    const next = { text, tone };
    setLocalMessage(next);
    onMessage?.(next);
  }

  function clearRecipientMessage() {
    setLocalMessage(null);
    onMessage?.(null);
  }

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
    if (emailDeliveryConfigured !== true || isPublicationBusy) return;
    const parts = raw.split(/[,;\s]+/).flatMap((part) => {
      const trimmed = part.trim();
      return trimmed ? [trimmed] : [];
    });
    const next = [...chips];
    let added = 0;
    for (const p of parts) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) continue;
      const lower = normalizeEmail(p);
      if (normalizedCurrentUserEmail && lower === normalizedCurrentUserEmail) {
        setRecipientMessage(readSelfInviteBlockedMessage(), "error");
        continue;
      }
      if (next.some((c) => c.email.toLowerCase() === lower)) continue;
      next.push({ email: lower, delivery_status: "pending" });
      added++;
    }
    if (added > 0) {
      setChips(next);
      setInput("");
      clearRecipientMessage();
    }
  }

  function removeChip(email: string) {
    setChips((prev) => prev.filter((c) => c.email.toLowerCase() !== email.toLowerCase()));
  }

  async function handleSend() {
    if (chips.length === 0 || isSending || emailDeliveryConfigured !== true) return;
    setIsSending(true);
    clearRecipientMessage();

    try {
      const payload = chips
        .filter((c) => !c.email_unsubscribed_at && (c.delivery_status === "pending" || !c.id)) // only new/pending
        .map((c) => ({ email: c.email, displayName: c.displayName || undefined }));

      if (payload.length === 0) {
        setRecipientMessage("All listed recipients already invited.", "success");
        setIsSending(false);
        return;
      }

      const result = await addSharedLinkRecipients({
        publicationId,
        recipients: payload,
        baseClientLink,
      });

      // Optimistic merge of results into chips with statuses. AC-MOD-17 (MOD-REC-05/MOD-ACT-04):
      // map by `match.status` first so a duplicate renders neutrally (never as a green "sent"),
      // and adopt `match.id` so a just-added chip immediately supports Resend/Remove (both require
      // an id) without waiting for a modal remount.
      const updated = applyRecipientEmailResults(chips, result.emailResults);

      setChips(updated);
      const msg = result.message || (result.ok ? "Recipients added." : "Some recipients could not be added.");
      setRecipientMessage(msg, result.ok ? "success" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add recipients.";
      setRecipientMessage(msg, "error");
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
      setRecipientMessage(msg, "success");
    } catch {
      const msg = "Remove failed.";
      setRecipientMessage(msg, "error");
    }
  }

  async function handleResend(rec: LocalRecipient) {
    const retryKey = rec.id ?? rec.email;
    if (!rec.id || resendingRecipientId || emailDeliveryConfigured !== true) return;
    setResendingRecipientId(retryKey);
    clearRecipientMessage();

    try {
      const result = await resendSharedLinkRecipientEmail({
        publicationId,
        recipientId: rec.id,
        baseClientLink,
      });
      setChips((prev) =>
        prev.map((chip) =>
          chip.id === rec.id
            ? {
                ...chip,
                delivery_status: result.ok ? "sent" : "pending",
                sendStatus: result.ok ? undefined : "failed",
                sendError: result.ok ? undefined : result.message,
              }
            : chip,
        ),
      );
      setRecipientMessage(result.message, result.ok ? "success" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recipient resend failed.";
      setRecipientMessage(msg, "error");
    } finally {
      setResendingRecipientId(null);
    }
  }

  async function handleRetryFailed(rec: LocalRecipient) {
    if (rec.id) {
      void handleResend(rec);
      return;
    }
    if (resendingRecipientId || emailDeliveryConfigured !== true) return;
    const retryKey = rec.email;
    setResendingRecipientId(retryKey);
    clearRecipientMessage();

    try {
      const result = await addSharedLinkRecipients({
        publicationId,
        recipients: [{ email: rec.email, displayName: rec.displayName || undefined }],
        baseClientLink,
      });
      setChips((prev) => applyRecipientEmailResults(prev, result.emailResults));
      const msg = result.message || (result.ok ? "Recipient sent." : "Recipient retry failed.");
      setRecipientMessage(msg, result.ok ? "success" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recipient retry failed.";
      setChips((prev) =>
        prev.map((chip) =>
          chip.email.toLowerCase() === rec.email.toLowerCase()
            ? { ...chip, sendStatus: "failed", sendError: msg }
            : chip,
        ),
      );
      setRecipientMessage(msg, "error");
    } finally {
      setResendingRecipientId(null);
    }
  }

  const pendingCount = chips.filter((c) => !c.email_unsubscribed_at && c.delivery_status === "pending").length;
  const emailDisabled = emailDeliveryConfigured !== true || isPublicationBusy;
  const canSend = pendingCount > 0 && !isSending && !emailDisabled;

  return (
    <div className="text-[10px]">
      <h3 className="text-[10px] font-medium uppercase leading-3 tracking-normal text-secondary">Email recipients</h3>
      <p className="text-[10px] leading-3 text-secondary mb-2">
        {isPublicationBusy
          ? "Publication updates are in progress. Recipient sending is paused until the link state is settled."
          : emailDisabled
          ? emailDeliveryMessage ?? "Checking email delivery configuration..."
          : `Add emails to receive the unique share link for ${projectLabel}. Delivery is best-effort; link creation always succeeds.`}
      </p>

      {/* Chip input */}
      <div className="flex flex-wrap items-center gap-1 rounded-xs border border-hairline bg-white p-1 min-h-7">
        {chips.map((chip) => {
          const status = chip.delivery_status;
          const isFailed = isFailedRecipient(chip);
          // AC-MOD-17 (MOD-REC-05): a duplicate is a neutral, already-invited treatment — never
          // the green "sent" style — so it takes precedence in both the label and the class map.
          const statusLabel = chip.isDuplicate
            ? "already invited"
            : chip.email_unsubscribed_at ? "unsubscribed" : isFailed ? "failed" : status;
          const statusClass =
            chip.isDuplicate ? "bg-surfaceMuted text-secondary" :
            chip.email_unsubscribed_at ? "bg-surfaceMuted text-secondary" :
            status === "sent" ? "bg-successSoft text-success" :
            isFailed ? "bg-dangerSoft text-danger" :
            status === "opened" ? "bg-accentSoft text-ink" :
            "bg-warningSoft text-warning";
          return (
            <span key={chip.id || chip.email} className="inline-flex items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted pl-1.5 pr-0.5 py-0 text-[9px] leading-4">
              <span className="truncate max-w-[140px]">{chip.displayName ? `${chip.displayName} <${chip.email}>` : chip.email}</span>
              <span className={`rounded-xs px-1 py-0 text-[8px] font-medium ${statusClass}`}>{statusLabel}</span>
              {isFailed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Retry ${chip.email}`}
                  className="h-5 px-1 py-0 text-[9px] font-medium text-danger hover:text-ink"
                  onClick={() => void handleRetryFailed(chip)}
                  disabled={emailDisabled || isSending || Boolean(resendingRecipientId) || Boolean(chip.email_unsubscribed_at)}
                  title={chip.sendError || "Retry recipient email"}
                >
                  Retry
                </Button>
              ) : chip.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Resend ${chip.email}`}
                  className="h-5 px-1 py-0 text-[9px] text-secondary hover:text-ink"
                  onClick={() => {
                    // AC-MOD-13 (MOD-REC-06): opened/responded recipients confirm first; the rest resend now.
                    if (resendNeedsConfirm(chip)) {
                      setPendingResend(chip);
                    } else {
                      void handleResend(chip);
                    }
                  }}
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
                className="h-5 px-1 py-0 text-[9px] text-secondary hover:text-danger"
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
                disabled={emailDisabled || isSending}
              >
                ×
              </Button>
            </span>
          );
        })}
        <input
          className="min-w-[120px] flex-1 bg-transparent text-[10px] leading-4 outline-none placeholder:text-secondary px-1"
          placeholder="name@company.com, another@..."
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              parseAndAddEmails(e.currentTarget.value);
            }
            if (e.key === "Backspace" && !input && chips.length > 0) {
              // AC-MOD-13 (MOD-RECIP-BACKSPACE-01): Backspace removes the last chip only when it is
              // local-only (no id). Persisted recipients must go through the confirm flow — dropping
              // them here only hides them from view, so the owner thinks an active recipient is gone.
              setChips((p) => (p[p.length - 1]?.id ? p : p.slice(0, -1)));
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
          onClick={() => {
            // AC-MOD-13 (MOD-ACT-05): "Clear" only discards local-only (unsent) chips. Persisted
            // recipients stay — they're removed only via the per-chip confirm flow, never bulk-cleared
            // (a bulk clear would just hide them until reopen and read as a silent removal).
            setChips((prev) => prev.filter((c) => c.id));
            setInput("");
            clearRecipientMessage();
          }}
          disabled={emailDisabled || isSending || chips.every((c) => Boolean(c.id))}
          className="min-h-6 px-1.5 py-0 text-[9px]"
        >
          Clear
        </Button>
        {isLoadingList && <span className="text-[9px] text-secondary">Loading…</span>}
      </div>

      {localMessage && (
        <p
          className={`mt-1.5 rounded-xs px-2 py-1 text-[9px] ${
            localMessage.tone === "error"
              ? "border border-dangerSoft bg-dangerSoft text-danger"
              : "bg-surfaceMuted text-secondary"
          }`}
          role={localMessage.tone === "error" ? "alert" : "status"}
        >
          {localMessage.text}
        </p>
      )}

      {chips.length === 0 && !isLoadingList && (
        <p className="mt-1 text-[9px] text-secondary">No recipients yet. Add emails above and send.</p>
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

      {/* AC-MOD-13 (MOD-REC-06): confirm before resending an opened/responded recipient, since
          the resend rotates their token and downgrades their status. */}
      <Modal
        open={pendingResend !== null}
        title="Resend a new link?"
        onOpenChange={(next) => {
          if (!next) setPendingResend(null);
        }}
        className="max-w-sm"
      >
        <div className="space-y-3">
          <p className="text-[10px] leading-4 text-secondary">
            <strong className="font-medium">{pendingResend?.email}</strong> has already opened this shared
            page. Resending replaces their current link — their existing link will stop working and their
            status resets.
          </p>
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              onClick={() => setPendingResend(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-7 rounded-xs px-2 text-[10px]"
              aria-label="Resend new link"
              onClick={() => {
                const target = pendingResend;
                setPendingResend(null);
                if (target) void handleResend(target);
              }}
            >
              Resend new link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
