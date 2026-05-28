"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowClockwise, ArrowSquareOut, LinkBreak, LinkSimple, LockSimple, Prohibit, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  addSharedLinkRecipients,
  createProjectPublication,
  listSharedLinkRecipients,
  removeSharedLinkRecipient,
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import type { ProjectEstimateSheet, ProjectPublicationStatus, ProjectPublicationSummary } from "@/lib/publication/types";

type ProjectPublicationHeaderProps = {
  summary: ProjectPublicationSummary | null;
  projectEstimateSheets?: ProjectEstimateSheet[];
};

type PasswordDraft = {
  password: string;
  requirePassword: boolean;
  summaryKey: string;
};

type PublicationLocalResult = {
  clientLinkPath: string | null;
  passwordRequired: boolean;
  status: ProjectPublicationStatus;
  summaryKey: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function readPublicationStatusLabel(status: ProjectPublicationStatus | null | undefined) {
  if (!status || status === "unpublished") return "Link off";
  if (status === "expired") return "Expired";
  if (status === "revoked") return "Turned off";
  return "Link live";
}

function readSummaryKey(summary: ProjectPublicationSummary | null) {
  return summary?.projectId ?? "no-project";
}

function subscribeToOriginChange() {
  return () => undefined;
}

function readBrowserOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function readServerOrigin() {
  return "";
}

export function ProjectPublicationHeader({ summary, projectEstimateSheets = [] }: ProjectPublicationHeaderProps) {
  const summaryKey = readSummaryKey(summary);
  const [open, setOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<PublicationLocalResult | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(() => ({
    password: "",
    requirePassword: Boolean(summary?.passwordRequired),
    summaryKey,
  }));
  const [isPending, startTransition] = useTransition();

  // P1: selected sheets for the Sheets tab picker (defaults to all when estimates provided)
  const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([]);

  // P1/P4: 4-tab navigation inside the shared link modal (Link / Sheets / Access / Recipients)
  const [activeTab, setActiveTab] = useState<"link" | "sheets" | "access" | "recipients">("link");

  // Default picker to all sheets for the project (so republish keeps prior selection by default; user can adjust in Sheets tab).
  // Resets when project/summaryKey or the available sheets change.
  useEffect(() => {
    if (projectEstimateSheets.length > 0) {
      setSelectedEstimateIds(projectEstimateSheets.map((e) => e.id));
    } else {
      setSelectedEstimateIds([]);
    }
  }, [projectEstimateSheets, summaryKey]);
  const browserOrigin = useSyncExternalStore(subscribeToOriginChange, readBrowserOrigin, readServerOrigin);
  const hasLocalResult = localResult?.summaryKey === summaryKey;
  const hasPasswordDraft = passwordDraft.summaryKey === summaryKey;
  const requirePassword = hasPasswordDraft ? passwordDraft.requirePassword : Boolean(summary?.passwordRequired);
  const password = hasPasswordDraft ? passwordDraft.password : "";
  const clientLinkPath = hasLocalResult ? localResult.clientLinkPath ?? "" : summary?.clientLinkPath ?? "";
  const canManagePublication = summary?.canManagePublication ?? false;
  const effectiveStatus = hasLocalResult ? localResult.status : summary?.status ?? "unpublished";
  const effectivePasswordRequired = hasLocalResult ? localResult.passwordRequired : summary?.passwordRequired ?? false;
  const hasLiveClientLink = effectiveStatus === "published";
  const statusLabel = readPublicationStatusLabel(effectiveStatus);
  const absoluteClientLink = clientLinkPath && browserOrigin ? `${browserOrigin}${clientLinkPath}` : clientLinkPath;
  const passwordStateLabel = requirePassword ? "Password on" : "Open access";
  const passwordRequiredForSubmit = requirePassword && !effectivePasswordRequired && !password.trim();

  async function copyClientLink() {
    if (!clientLinkPath) {
      setActionMessage("Create a shared link first.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(absoluteClientLink);
      setActionMessage("Shared link copied.");
    } catch {
      setActionMessage("Copy unavailable. Select the link to copy it.");
    }
  }

  function openClientLink() {
    if (!clientLinkPath || typeof window === "undefined") {
      setActionMessage("Create a shared link first.");
      return;
    }

    window.open(clientLinkPath, "_blank", "noopener,noreferrer");
  }

  function runPublicationAction(action: () => Promise<{ ok: boolean; message: string; clientLinkPath?: string | null }>) {
    setActionMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.clientLinkPath !== undefined) {
          setLocalResult({
            clientLinkPath: result.clientLinkPath,
            passwordRequired: result.clientLinkPath ? requirePassword : false,
            status: result.clientLinkPath ? "published" : "revoked",
            summaryKey,
          });
        }
        setPasswordDraft({
          password: "",
          requirePassword: result.clientLinkPath === null ? false : requirePassword,
          summaryKey,
        });
        setActionMessage(result.message);
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Publication update failed.");
      }
    });
  }

  const hasSelectedEstimates = selectedEstimateIds.length > 0;
  const generateDisabled = !canManagePublication || !summary?.projectId || isPending || passwordRequiredForSubmit || !hasSelectedEstimates;

  return (
    <>
      <div className="flex h-full items-center justify-end gap-1 px-1" aria-label="Shared link">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-6 rounded-xs px-2 text-secondary hover:bg-surfaceMuted hover:text-ink"
          aria-label="Open shared link"
          onClick={() => {
            setActiveTab("link");
            setOpen(true);
          }}
        >
          <UploadSimple size={12} weight="regular" aria-hidden="true" />
          Shared link
        </Button>
      </div>

      <Modal
        open={open}
        title="Shared link"
        description="View-only project page"
        onOpenChange={(next) => {
          if (!next) setActiveTab("link");
          setOpen(next);
        }}
        className="max-w-xl"
        bodyClassName="p-0"
      >
        <div className="grid min-h-[340px] grid-cols-[160px_minmax(0,1fr)] divide-x divide-hairline">
          <aside className="bg-surfaceMuted p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Shared link</p>
            <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{statusLabel}</p>
            <p className="mt-0.5 text-[9px] leading-3 text-tertiary">
              {summary?.selectedEstimateCount ?? 0} estimates, version {summary?.snapshotVersion ?? 0}
            </p>
            <div className="mt-3 space-y-2 text-[9px] leading-3 text-tertiary">
              <p>
                Opened <span className="font-medium text-secondary">{summary?.openCount ?? 0}</span> times
              </p>
              <p>Latest open: {formatDate(summary?.latestOpenedAt ?? null)}</p>
              <p>Published: {formatDate(summary?.publishedAt ?? null)}</p>
              <p>Expires: {formatDate(summary?.expiresAt ?? null)}</p>
            </div>
          </aside>
          <div className="min-w-0 flex flex-col divide-y divide-hairline">
            {/* P1: 3-tab bar (Link / Sheets / Access) - compact 10px per design system */}
            <div className="flex border-b border-hairline bg-white px-1 text-[10px] font-medium" role="tablist" aria-label="Shared link settings">
              {(["link", "sheets", "access", "recipients"] as const).map((tab) => {
                const label = tab === "link" ? "Link" : tab === "sheets" ? "Sheets" : tab === "access" ? "Access" : "Recipients";
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`pub-tab-${tab}`}
                    className={`min-h-7 flex-1 rounded-xs px-2 py-1 transition-colors ${isActive ? "border-b-2 border-ink text-ink" : "text-tertiary hover:text-secondary hover:bg-surfaceMuted/60"}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-3" id={`pub-tab-${activeTab}`} role="tabpanel">
              {activeTab === "link" && (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[11px] font-medium leading-4 text-ink">Shared link</h3>
                      <p className="text-[9px] leading-3 text-tertiary">Anyone with this link can view this project page.</p>
                    </div>
                    <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                      {passwordStateLabel}
                    </span>
                  </div>
                  <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                    <label className="sr-only" htmlFor="project-publication-client-link">
                      Shared link
                    </label>
                    <input
                      id="project-publication-client-link"
                      className="min-h-7 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary outline-none placeholder:text-tertiary focus:border-focus"
                      aria-label="Shared link"
                      readOnly
                      placeholder="Create a shared link"
                      value={absoluteClientLink}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-7 rounded-xs px-2 text-[10px]"
                      aria-label="Open shared link"
                      disabled={!clientLinkPath}
                      onClick={openClientLink}
                    >
                      <ArrowSquareOut size={11} aria-hidden="true" />
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-7 rounded-xs px-2 text-[10px]"
                      aria-label="Copy shared link"
                      disabled={!clientLinkPath}
                      onClick={() => void copyClientLink()}
                    >
                      <LinkSimple size={11} aria-hidden="true" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "sheets" && (
                <div>
                  <h3 className="text-[10px] font-medium leading-3 text-ink mb-1">Estimate sheets to include</h3>
                  <SheetPickerList
                    estimates={projectEstimateSheets}
                    selectedIds={selectedEstimateIds}
                    onChange={setSelectedEstimateIds}
                    aria-label="Select estimate sheets to include in shared link"
                    disabled={isPending}
                  />
                  {!hasSelectedEstimates && projectEstimateSheets.length > 0 && (
                    <p className="mt-1 text-[9px] text-tertiary" role="status">0 estimates selected — generate is disabled</p>
                  )}
                </div>
              )}

              {activeTab === "access" && (
                <div>
                  <h3 className="text-[10px] font-medium leading-3 text-ink">Access</h3>
                  <label className="mt-2 flex min-h-7 items-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary">
                    <input
                      type="checkbox"
                      className="size-3 accent-ink"
                      checked={requirePassword}
                      onChange={(event) =>
                        setPasswordDraft({
                          password: event.currentTarget.checked ? password : "",
                          requirePassword: event.currentTarget.checked,
                          summaryKey,
                        })
                      }
                    />
                    <LockSimple size={11} aria-hidden="true" />
                    Require password
                  </label>
                  {requirePassword ? (
                    <div className="mt-2">
                      <label className="sr-only" htmlFor="project-publication-password">
                        Link password
                      </label>
                      <input
                        id="project-publication-password"
                        className="min-h-7 w-full rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary outline-none placeholder:text-tertiary focus:border-focus"
                        aria-label="Link password"
                        type="password"
                        placeholder={summary?.passwordRequired ? "Enter a new password to change it" : "Set a link password"}
                        value={password}
                        onChange={(event) =>
                          setPasswordDraft({
                            password: event.currentTarget.value,
                            requirePassword: true,
                            summaryKey,
                          })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "recipients" && summary?.publicationId && canManagePublication && (
                <RecipientEmailComposer
                  publicationId={summary.publicationId}
                  baseClientLink={clientLinkPath}
                  projectName={null}
                  onMessage={(m) => setActionMessage(m)}
                />
              )}
              {activeTab === "recipients" && (!summary?.publicationId || !canManagePublication) && (
                <div className="text-[10px] text-tertiary">
                  Create or activate a shared link first to manage recipients.
                </div>
              )}
            </div>

            {/* Link controls — always visible below tabs so Generate can be disabled from Sheets tab state */}
            <section className="p-3">
              <h3 className="text-[10px] font-medium leading-3 text-ink">Link controls</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label={hasLiveClientLink ? "Update shared page" : "Generate shared link"}
                  disabled={generateDisabled}
                  onClick={() =>
                    summary?.projectId
                      ? runPublicationAction(() =>
                          hasLiveClientLink
                            ? republishProjectPublication({
                                projectId: summary.projectId,
                                selectedEstimateIds,
                                password: requirePassword && password.trim() ? password.trim() : undefined,
                                clearPassword: !requirePassword,
                              })
                            : createProjectPublication({
                                projectId: summary.projectId,
                                selectedEstimateIds,
                                password: requirePassword ? password.trim() : undefined,
                              }),
                        )
                      : undefined
                  }
                >
                  <ArrowClockwise size={11} aria-hidden="true" />
                  {hasLiveClientLink ? "Update shared page" : "Generate shared link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label="Create new shared link"
                  disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || isPending || passwordRequiredForSubmit}
                  onClick={() =>
                    summary?.projectId
                      ? runPublicationAction(() =>
                          rotateProjectPublicationLink({
                            projectId: summary.projectId,
                            password: requirePassword && password.trim() ? password.trim() : undefined,
                            clearPassword: !requirePassword,
                          }),
                        )
                      : undefined
                  }
                >
                  <LinkBreak size={11} aria-hidden="true" />
                  New link
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label="Turn off shared link"
                  disabled={!canManagePublication || !summary?.projectId || !hasLiveClientLink || isPending}
                  onClick={() =>
                    summary?.projectId ? runPublicationAction(() => revokeProjectPublication({ projectId: summary.projectId })) : undefined
                  }
                >
                  <Prohibit size={11} aria-hidden="true" />
                  Turn off link
                </Button>
              </div>
            </section>

            {actionMessage ? (
              <section className="p-3">
                <p className="rounded-xs bg-surfaceMuted px-2 py-1.5 text-[9px] leading-3 text-secondary" role="status">
                  {actionMessage}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}

/* P1: SheetPickerList — compact, a11y, keyboard-friendly picker for estimate sheets.
 * Used exclusively inside the "Sheets" tab of the publication modal.
 * Design: SF Pro via parent, 10-12px text, rounded-xs (3px), regular Phosphor if needed, native checkboxes for max keyboard.
 */
export type SheetPickerListProps = {
  estimates: ProjectEstimateSheet[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SheetPickerList({ estimates, selectedIds, onChange, disabled, "aria-label": ariaLabel = "Select estimate sheets to include in shared link" }: SheetPickerListProps) {
  const selectedSet = new Set(selectedIds);
  const allIds = estimates.map((e) => e.id);
  const allSelected = estimates.length > 0 && selectedIds.length === estimates.length;

  function toggle(id: string) {
    if (disabled) return;
    const next = selectedSet.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  }

  function selectAll() {
    if (disabled) return;
    onChange(allIds);
  }

  function clearAll() {
    if (disabled) return;
    onChange([]);
  }

  if (estimates.length === 0) {
    return (
      <div className="rounded-xs border border-dashed border-divider bg-surfaceMuted/60 p-3 text-center text-[10px] text-tertiary">
        No estimate sheets in this project.
      </div>
    );
  }

  return (
    <div aria-label={ariaLabel} className="text-[10px]">
      <div className="mb-1 flex items-center gap-2 text-[9px]">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled || allSelected}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled || selectedIds.length === 0}
          className="rounded-xs px-1.5 py-0.5 text-secondary hover:text-ink disabled:opacity-50"
        >
          Clear
        </button>
        <span className="ml-auto text-tertiary tabular-nums">
          {selectedIds.length} / {estimates.length} selected
        </span>
      </div>

      <div className="max-h-40 overflow-auto rounded-xs border border-hairline bg-white p-1 text-[10px] leading-4">
        {estimates.map((est) => {
          const checked = selectedSet.has(est.id);
          const label = est.sheetCode ? `${est.sheetCode} — ${est.name}` : est.name;
          return (
            <label
              key={est.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-xs px-1 py-0.5 hover:bg-surfaceMuted/70"
            >
              <input
                type="checkbox"
                className="size-3 accent-ink"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(est.id)}
                aria-label={label}
              />
              <span className="truncate">{label}</span>
            </label>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="mt-1 text-[9px] text-tertiary" role="status">
          0 estimates selected
        </p>
      )}
    </div>
  );
}

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
      <h3 className="text-[10px] font-medium leading-3 text-ink mb-1">Email recipients</h3>
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
              <button
                type="button"
                aria-label={`Remove ${chip.email}`}
                className="px-1 text-tertiary hover:text-danger rounded-xs"
                onClick={() => void handleRemove(chip)}
                disabled={isSending}
              >
                ×
              </button>
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
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="min-h-6 rounded-xs bg-ink px-2 py-0.5 text-[9px] font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? "Sending..." : `Send to ${pendingCount} recipient${pendingCount === 1 ? "" : "s"}`}
        </button>
        <button
          type="button"
          onClick={() => { setChips([]); setInput(""); setLocalMessage(null); }}
          disabled={isSending || chips.length === 0}
          className="min-h-6 rounded-xs px-1.5 text-[9px] text-tertiary hover:text-secondary disabled:opacity-50"
        >
          Clear
        </button>
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
