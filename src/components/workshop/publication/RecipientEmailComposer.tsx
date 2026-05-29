"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  addSharedLinkRecipients,
  listSharedLinkRecipients,
  removeSharedLinkRecipient,
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
 * - Backwards: does not affect Link/Sheets/Access flows.
 */
export type RecipientEmailComposerProps = {
  publicationId: string;
  baseClientLink?: string | null;
  projectName?: string | null;
  onMessage?: (msg: string | null) => void;
};

type LocalRecipient = {
  id?: string;
  email: string;
  displayName?: string | null;
  delivery_status: "pending" | "sent" | "bounced" | "opened" | "responded";
};

export function RecipientEmailComposer({ publicationId, baseClientLink, projectName, onMessage }: RecipientEmailComposerProps) {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<LocalRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Load existing recipients for this publication (status chips)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!publicationId) return;
      setIsLoadingList(true);
      try {
        const rows = await listSharedLinkRecipients({ publicationId });
        if (!cancelled) {
          const mapped: LocalRecipient[] = (rows || []).map((r: any) => ({
            id: r.id,
            email: r.email,
            displayName: r.display_name,
            delivery_status: r.delivery_status || "pending",
          }));
          setChips(mapped);
        }
      } catch (e) {
        // Non-fatal for tab; start empty (user can still add)
        if (!cancelled) setChips([]);
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
      const lower = p.toLowerCase();
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
    if (chips.length === 0 || isSending) return;
    setIsSending(true);
    setLocalMessage(null);
    if (onMessage) onMessage(null);

    try {
      const payload = chips
        .filter((c) => c.delivery_status === "pending" || !c.id) // only new/pending
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
        const match = result.emailResults.find((e: any) => e.email.toLowerCase() === chip.email.toLowerCase());
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
    } catch (e) {
      const msg = "Remove failed.";
      setLocalMessage(msg);
      if (onMessage) onMessage(msg);
    }
  }

  const pendingCount = chips.filter((c) => c.delivery_status === "pending").length;
  const canSend = pendingCount > 0 && !isSending;

  return (
    <div className="text-[10px]">
      <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Email recipients</h3>
      <p className="text-[9px] leading-3 text-tertiary mb-2">Add emails to receive the unique share link. Delivery is best-effort; link creation always succeeds.</p>

      {/* Chip input */}
      <div className="flex flex-wrap items-center gap-1 rounded-xs border border-hairline bg-white p-1 min-h-7">
        {chips.map((chip) => {
          const status = chip.delivery_status;
          const statusClass =
            status === "sent" ? "bg-successSoft text-success" :
            status === "bounced" ? "bg-dangerSoft text-danger" :
            status === "opened" ? "bg-accentSoft text-ink" :
            "bg-warningSoft text-warning";
          return (
            <span key={chip.id || chip.email} className="inline-flex items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted pl-1.5 pr-0.5 py-0 text-[9px] leading-4">
              <span className="truncate max-w-[140px]">{chip.displayName ? `${chip.displayName} <${chip.email}>` : chip.email}</span>
              <span className={`rounded-xs px-1 py-0 text-[8px] font-medium ${statusClass}`}>{status}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${chip.email}`}
                className="h-5 px-1 py-0 text-[9px] text-tertiary hover:text-danger"
                onClick={() => void handleRemove(chip)}
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
              parseAndAddEmails(input);
            }
            if (e.key === "Backspace" && !input && chips.length > 0) {
              // remove last
              setChips((p) => p.slice(0, -1));
            }
          }}
          onBlur={() => { if (input.trim()) parseAndAddEmails(input); }}
          disabled={isSending || isLoadingList}
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
    </div>
  );
}
