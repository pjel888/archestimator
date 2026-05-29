"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowClockwise, ArrowSquareOut, LinkBreak, LinkSimple, LockSimple, Prohibit, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import {
  ControlField,
  ControlInput,
  CONTROL_INPUT_SURFACE_CLASS,
} from "@/components/ui/control-input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/ui/cn";
import {
  addSharedLinkRecipients,
  createProjectPublication,
  listSharedLinkRecipients,
  removeSharedLinkRecipient,
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import { RecipientEmailComposer } from "./publication/RecipientEmailComposer";
export { RecipientEmailComposer };
import SharedLinkActivityFeed from "@/components/share/SharedLinkActivityFeed";
import { WorkshopTreeTabs, type WorkshopTreeTabItem } from "./workshop-tree";
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

  // P1/P4/P8: 5-tab navigation (Link / Sheets / Access / Recipients / Activity owner-only)
  const [activeTab, setActiveTab] = useState<"link" | "sheets" | "access" | "recipients" | "activity">("link");

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
        className="max-w-5xl"
        bodyClassName="p-0"
      >
        <div className="grid min-h-[600px] grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="border-r border-hairline bg-surfaceMuted p-6">
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Shared link</p>
                <p className="mt-1.5 text-[12px] font-medium leading-4 text-ink">{statusLabel}</p>
                <p className="mt-1 text-[10px] leading-3 text-secondary">
                  {summary?.selectedEstimateCount ?? 0} estimates · version {summary?.snapshotVersion ?? 0}
                </p>
              </div>
              <div className="border-t border-hairline pt-4 space-y-3">
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Opened</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">
                    <span className="font-medium text-ink">{summary?.openCount ?? 0}</span> times
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Latest open</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(summary?.latestOpenedAt ?? null)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Published</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(summary?.publishedAt ?? null)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Expires</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-secondary">{formatDate(summary?.expiresAt ?? null)}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex flex-col bg-white">
            <WorkshopTreeTabs
              tabs={(
                [
                  { id: "link", label: "Link" },
                  { id: "sheets", label: "Sheets" },
                  { id: "access", label: "Access" },
                  { id: "recipients", label: "Recipients" },
                  { id: "activity", label: "Activity" },
                ] as const
              ).filter((tab) => tab.id !== "activity" || canManagePublication)}
              activeTab={activeTab}
              ariaLabel="Shared link settings"
              onTabChange={(tab) => setActiveTab(tab)}
            />

            <div className="flex-1 overflow-auto p-6">
              {activeTab === "activity" && canManagePublication && (
                <div className="space-y-2">
                  <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Shared link activity</h3>
                  <p className="text-[9px] text-tertiary">Comments, decisions, and events from recipients (internal notes visible to you only).</p>
                  <SharedLinkActivityFeed publicationToken={summary?.clientLinkPath?.split("/").pop() || ""} isOwner={true} onActivitySeen={() => { /* update local seen for badge future */ }} />
                </div>
              )}

              {activeTab === "link" && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <ControlField
                      label="Shared link"
                      helperText="Anyone with this link can view this project page."
                      className="min-w-0 flex-1"
                    >
                      <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                        <ControlInput
                          id="project-publication-client-link"
                          className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
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
                    </ControlField>
                    <span className="mt-5 shrink-0 rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                      {passwordStateLabel}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === "sheets" && (
                <div className="space-y-2">
                  <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Estimate sheets to include</h3>
                  <SheetPickerList
                    estimates={projectEstimateSheets}
                    selectedIds={selectedEstimateIds}
                    onChange={setSelectedEstimateIds}
                    aria-label="Select estimate sheets to include in shared link"
                    disabled={isPending}
                  />
                  {!hasSelectedEstimates && projectEstimateSheets.length > 0 && (
                    <p className="text-[9px] text-tertiary" role="status">0 estimates selected — generate is disabled</p>
                  )}
                </div>
              )}

              {activeTab === "access" && (
                <div className="space-y-3">
                  <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Access</h3>
                  <label className="flex min-h-7 items-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary transition hover:border-tertiary cursor-pointer">
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
                    <ControlField label="Link password" className="max-w-sm">
                      <ControlInput
                        id="project-publication-password"
                        className={cn("min-h-7", CONTROL_INPUT_SURFACE_CLASS)}
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
                    </ControlField>
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
            <div className="border-t border-hairline p-6">
              <h3 className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Link controls</h3>
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
            </div>

            {actionMessage ? (
              <div className="border-t border-hairline p-6">
                <p className="rounded-xs bg-surfaceMuted px-2 py-1.5 text-[9px] leading-3 text-secondary" role="status">
                  {actionMessage}
                </p>
              </div>
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

