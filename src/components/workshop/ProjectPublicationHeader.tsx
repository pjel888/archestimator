"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowClockwise, ArrowSquareOut, LinkBreak, LinkSimple, LockSimple, Prohibit, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createProjectPublication,
  republishProjectPublication,
  revokeProjectPublication,
  rotateProjectPublicationLink,
} from "@/lib/publication/actions";
import type { ProjectPublicationStatus, ProjectPublicationSummary } from "@/lib/publication/types";

type ProjectPublicationHeaderProps = {
  summary: ProjectPublicationSummary | null;
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

export function ProjectPublicationHeader({ summary }: ProjectPublicationHeaderProps) {
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
      setActionMessage("Create a public link first.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(absoluteClientLink);
      setActionMessage("Public link copied.");
    } catch {
      setActionMessage("Copy unavailable. Select the link to copy it.");
    }
  }

  function openClientLink() {
    if (!clientLinkPath || typeof window === "undefined") {
      setActionMessage("Create a public link first.");
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

  return (
    <>
      <div className="flex h-full items-center justify-end gap-1 px-1" aria-label="Public client link">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-6 rounded-xs px-2 text-secondary hover:bg-surfaceMuted hover:text-ink"
          aria-label="Open public client link"
          onClick={() => setOpen(true)}
        >
          <UploadSimple size={12} weight="regular" aria-hidden="true" />
          Public link
        </Button>
      </div>

      <Modal
        open={open}
        title="Public client link"
        description="View-only project page"
        onOpenChange={setOpen}
        className="max-w-xl"
        bodyClassName="p-0"
      >
        <div className="grid min-h-[320px] grid-cols-[160px_minmax(0,1fr)] divide-x divide-hairline">
          <aside className="bg-surfaceMuted p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Public link</p>
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
          <div className="min-w-0 divide-y divide-hairline">
            <section className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[11px] font-medium leading-4 text-ink">Public link</h3>
                  <p className="text-[9px] leading-3 text-tertiary">Anyone with this link can view this project page.</p>
                </div>
                <span className="rounded-xs bg-surfaceMuted px-1.5 py-0.5 text-[8px] font-medium uppercase leading-[10px] text-tertiary">
                  {passwordStateLabel}
                </span>
              </div>
              <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                <label className="sr-only" htmlFor="project-publication-client-link">
                  Public link
                </label>
                <input
                  id="project-publication-client-link"
                  className="min-h-7 min-w-0 rounded-xs border border-hairline bg-white px-2 text-[10px] leading-3 text-secondary outline-none placeholder:text-tertiary focus:border-focus"
                  aria-label="Public link"
                  readOnly
                  placeholder="Create a public link"
                  value={absoluteClientLink}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label="Open public link"
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
                  aria-label="Copy public link"
                  disabled={!clientLinkPath}
                  onClick={() => void copyClientLink()}
                >
                  <LinkSimple size={11} aria-hidden="true" />
                  Copy
                </Button>
              </div>
            </section>
            <section className="p-3">
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
            </section>
            <section className="p-3">
              <h3 className="text-[10px] font-medium leading-3 text-ink">Link controls</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label={hasLiveClientLink ? "Update public page" : "Generate public link"}
                  disabled={!canManagePublication || !summary?.projectId || isPending || passwordRequiredForSubmit}
                  onClick={() =>
                    summary?.projectId
                      ? runPublicationAction(() =>
                          hasLiveClientLink
                            ? republishProjectPublication({
                                projectId: summary.projectId,
                                password: requirePassword && password.trim() ? password.trim() : undefined,
                                clearPassword: !requirePassword,
                              })
                            : createProjectPublication({
                                projectId: summary.projectId,
                                password: requirePassword ? password.trim() : undefined,
                              }),
                        )
                      : undefined
                  }
                >
                  <ArrowClockwise size={11} aria-hidden="true" />
                  {hasLiveClientLink ? "Update public page" : "Generate public link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-7 rounded-xs px-2 text-[10px]"
                  aria-label="Create new public link"
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
                  aria-label="Turn off public link"
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
