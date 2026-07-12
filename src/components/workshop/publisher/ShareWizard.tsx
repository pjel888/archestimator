"use client";

import { useState } from "react";
import {
  ArrowClockwise,
  CheckCircle,
  LockSimple,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ControlField, ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { UnsavedChangesDialog } from "@/components/ui/overlays/confirm-dialog";
import { Drawer } from "@/components/ui/overlays/sheet-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipientEmailComposer } from "@/components/workshop/publication/RecipientEmailComposer";
import { SheetPickerList } from "@/components/workshop/publication/SheetPickerList";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";
import { ShareLinkDisplay } from "./ShareLinkDisplay";
import { usePublisherDrawer } from "./usePublisherDrawer";

type ShareWizardProps = {
  initialStep?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row: ProjectPublicationRosterRow | null;
};

type WizardFeedback = { text: string; tone: "success" | "error" };

function haveSameStringValues(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every((value) => rightValues.has(value));
}

export function ShareWizard({ onOpenChange, open, row }: ShareWizardProps) {
  const [selectedEstimateIdsOverride, setSelectedEstimateIdsOverride] = useState<string[] | null>(null);
  const [passwordRequiredOverride, setPasswordRequiredOverride] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<WizardFeedback | null>(null);
  const [complete, setComplete] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const drawer = usePublisherDrawer(row?.projectId ?? null, open);
  const summary = drawer.data?.summary;
  const estimates = drawer.data?.estimateSheets ?? [];
  const isLoading = drawer.query.isPending && !drawer.data;
  const loadFailed = drawer.query.isError || verificationPending;
  const retrying = loadFailed && drawer.query.isFetching;
  const defaultSelectedEstimateIds = summary?.selectedEstimateIds?.length
    ? summary.selectedEstimateIds
    : estimates.map((estimate) => estimate.id);
  const selectedEstimateIds = selectedEstimateIdsOverride ?? defaultSelectedEstimateIds;
  const defaultPasswordRequired = summary?.passwordRequired ?? row?.passwordRequired ?? false;
  const passwordRequired = passwordRequiredOverride ?? defaultPasswordRequired;
  const canManage = Boolean(row?.canManagePublication && (summary?.canManagePublication ?? true));
  const hasEstimates = estimates.length > 0;
  const canShare = Boolean(
    canManage
      && !isLoading
      && !loadFailed
      && !verificationPending
      && hasEstimates
      && selectedEstimateIds.length > 0
      && !drawer.isMutating,
  );
  const clientLinkPath = summary?.clientLinkPath;
  const hasUnsavedChanges = !complete && (
    (selectedEstimateIdsOverride !== null
      && !haveSameStringValues(selectedEstimateIdsOverride, defaultSelectedEstimateIds))
    || (passwordRequiredOverride !== null && passwordRequiredOverride !== defaultPasswordRequired)
    || password.trim().length > 0
  );

  if (!row) return null;

  const projectId = row.projectId;
  const previewHref = `/workshop/publisher/preview/${encodeURIComponent(row.projectId)}`;
  const isExistingLink = Boolean(summary?.publicationId ?? row.publicationId);
  const submitLabel = isExistingLink ? "Save changes" : "Create client link";

  function closeEditor() {
    onOpenChange(false);
  }

  function requestClose(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
      return;
    }
    closeEditor();
  }

  function reportVerificationFailure(text: string) {
    setFeedback({ text, tone: "error" });
  }

  async function verifySavedLink() {
    setVerificationPending(true);
    try {
      const verification = await drawer.query.refetch();
      const verifiedSummary = verification.data?.summary;
      if (verification.isError || !verifiedSummary?.publicationId || !verifiedSummary.clientLinkPath) {
        reportVerificationFailure("Your changes were saved, but the refreshed client link could not be verified. Retry the refresh; you do not need to save again.");
        return false;
      }
      setVerificationPending(false);
      setComplete(true);
      return true;
    } catch {
      reportVerificationFailure("Your changes were saved, but the refreshed client link could not be verified. Retry the refresh; you do not need to save again.");
      return false;
    }
  }

  async function retryProjectDetails() {
    try {
      const verification = await drawer.query.refetch();
      const verifiedSummary = verification.data?.summary;
      if (verificationPending && !verification.isError && verifiedSummary?.publicationId && verifiedSummary.clientLinkPath) {
        setVerificationPending(false);
        setComplete(true);
        return;
      }
      if (!verificationPending && !verification.isError) return;
    } catch {
      reportVerificationFailure("The saved link still could not be verified. Nothing else needs to be saved; retry the refresh when the connection recovers.");
      return;
    }
    reportVerificationFailure("The saved link still could not be verified. Nothing else needs to be saved; retry the refresh when the connection recovers.");
  }

  async function saveClientLink() {
    if (!canShare) return;
    setFeedback(null);
    try {
      const result = await drawer.republishMutation.mutateAsync({
        clearPassword: !passwordRequired,
        password: passwordRequired ? password.trim() || undefined : undefined,
        projectId,
        selectedEstimateIds,
      });
      setFeedback({ text: result.message, tone: result.ok ? "success" : "error" });
      if (!result.ok) return;
      if (await verifySavedLink()) {
        setPassword("");
        setPasswordRequiredOverride(null);
        setSelectedEstimateIdsOverride(null);
      }
    } catch {
      setFeedback({
        text: "The client link could not be saved. Please try again.",
        tone: "error",
      });
    }
  }

  const footer = complete ? (
    <div className="flex w-full justify-end">
      <Button type="button" variant="primary" size="sm" className="min-h-8 min-w-20 px-2.5 !text-[10px]" onClick={closeEditor}>
        Done
      </Button>
    </div>
  ) : (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button type="button" variant="secondary" size="sm" className="min-h-8 min-w-20 px-2.5 !text-[10px]" onClick={() => requestClose(false)}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="brand"
        size="sm"
        className="min-h-8 min-w-0 px-2.5 !text-[10px]"
        disabled={!canShare}
        onClick={() => void saveClientLink()}
      >
        <ShareNetwork size={14} aria-hidden="true" /> {drawer.isMutating ? "Saving…" : submitLabel}
      </Button>
    </div>
  );

  return (
    <>
      <Drawer
      open={open}
      onOpenChange={requestClose}
      title={complete ? "Client link ready" : `${isExistingLink ? "Edit" : "Create"} client link`}
      description={complete ? row.projectName : `Choose what ${row.clientName ?? "the client"} can see for ${row.projectName}.`}
      side="bottom"
      size="full"
      modal
      closeLabel="Close client link editor"
      contentId="share-wizard"
      contentClassName="h-[calc(100dvh_-_24px)] bg-white md:mx-auto md:h-[min(620px,calc(100dvh_-_48px))] md:max-w-3xl md:self-center"
      bodyClassName="min-h-0 overflow-auto p-0"
      headerClassName="min-h-11 px-3 py-2"
      titleClassName="text-[12px] font-medium leading-4"
      descriptionClassName="text-[10px] font-normal leading-4"
      closeButtonClassName="size-8"
      footerClassName="px-3 py-2 sm:px-4"
      footer={footer}
    >
      {complete ? (
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center space-y-3 p-3 sm:p-4" data-share-wizard="true">
          <div className="text-center">
            <CheckCircle size={24} weight="fill" className="mx-auto text-success" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-medium leading-4 text-ink">Ready to send</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Copy the link, preview the client page, or send it directly to recipients.</p>
          </div>
          {clientLinkPath ? (
            <ShareLinkDisplay clientLinkPath={clientLinkPath} previewHref={previewHref} projectName={row.projectName} />
          ) : (
            <p role="status" className="text-center text-[10px] leading-4 text-secondary">Refreshing the client link…</p>
          )}
          {summary?.publicationId ? (
            <div className="[&_button]:min-h-8 [&_button]:!text-[10px] [&_input]:min-h-8 [&_input]:!text-[10px] [&_label]:!text-[9px] [&_p]:!text-[9px]">
              <RecipientEmailComposer
                publicationId={summary.publicationId}
                baseClientLink={clientLinkPath ?? null}
                currentUserEmail={drawer.data?.currentUserEmail ?? null}
                projectName={row.projectName}
                isPublicationBusy={drawer.isMutating}
              />
            </div>
          ) : null}
        </div>
      ) : isLoading ? (
        <div className="grid min-h-full gap-0 md:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" data-share-wizard="true" aria-busy="true">
          <section className="border-b border-hairline p-3 md:border-b-0 md:border-r">
            <p className="text-[11px] font-medium text-ink">Loading project estimates…</p>
            <p className="mt-1 text-[10px] leading-4 text-secondary">The editor will open as soon as the project link settings are ready.</p>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </section>
          <aside className="space-y-3 p-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </aside>
        </div>
      ) : loadFailed ? (
        <div className="grid min-h-full place-items-center p-4 text-center" data-share-wizard="true">
          <div className="max-w-md">
            <WarningCircle size={28} className="mx-auto text-warning" aria-hidden="true" />
            <h3 className="mt-3 text-[12px] font-medium leading-4 text-ink">
              {verificationPending
                ? "Client link saved; verification is pending"
                : drawer.data
                  ? "Project settings could not be verified"
                  : "Project details could not load"}
            </h3>
            <p className="mt-1.5 text-[10px] leading-4 text-secondary">
              {verificationPending
                ? "Your changes were saved. Refresh the link details to confirm the current URL before sending it; you do not need to save again."
                : drawer.data
                  ? "The editor is locked so stale access settings cannot overwrite the current client link. Retry before making changes."
                  : "Nothing has been changed. Retry the project details before creating or editing this client link."}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 min-h-8 min-w-0 px-2.5 !text-[10px]"
              disabled={retrying}
              onClick={() => void retryProjectDetails()}
            >
              <ArrowClockwise size={14} aria-hidden="true" /> {retrying ? "Retrying…" : "Retry"}
            </Button>
            {verificationPending ? (
              <Button
                type="button"
                variant="plain"
                size="sm"
                className="mt-2 min-h-8 min-w-0 px-2.5 !text-[10px]"
                onClick={() => {
                  setVerificationPending(false);
                  void drawer.query.refetch();
                }}
              >
                Return to editor
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid min-h-full lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" data-share-wizard="true">
          <section className="border-b border-hairline p-3 lg:border-b-0 lg:border-r">
            <h3 className="text-[11px] font-medium leading-4 text-ink">Client-visible estimates</h3>
            <p className="mt-1 text-[10px] leading-4 text-secondary">Choose exactly which estimates the client can open from this link.</p>
            <div className="mt-3">
              <SheetPickerList
                estimates={estimates}
                selectedIds={selectedEstimateIds}
                onChange={setSelectedEstimateIdsOverride}
                disabled={!canManage || drawer.isMutating}
                density="comfortable"
                aria-label="Select estimates for the client link"
              />
            </div>
            {!hasEstimates ? (
              <p role="status" className="mt-3 border border-warning/30 bg-warningSoft px-2.5 py-2 text-[10px] leading-4 text-warning">
                This project has no estimates yet. Add an estimate before creating a client link.
              </p>
            ) : selectedEstimateIds.length === 0 ? (
              <p role="status" className="mt-3 border border-warning/30 bg-warningSoft px-2.5 py-2 text-[10px] leading-4 text-warning">Select at least one estimate.</p>
            ) : null}
          </section>

          <aside className="space-y-3 p-3">
            <section>
              <h3 className="text-[11px] font-medium leading-4 text-ink">Access</h3>
              <Checkbox
                label={<><LockSimple size={13} aria-hidden="true" /> Require a password</>}
                className="mt-2 min-h-9 border-y border-hairline py-1.5 text-[10px] text-ink"
                checked={passwordRequired}
                onChange={(event) => {
                    setPasswordRequiredOverride(event.currentTarget.checked);
                    if (!event.currentTarget.checked) setPassword("");
                }}
                disabled={!canManage || drawer.isMutating}
              />
              {passwordRequired ? (
                <ControlField label="Password" className="mt-3 [&>label]:!text-[9px]">
                  <ControlInput
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    className={cn("min-h-8 !text-[10px]", CONTROL_INPUT_SURFACE_CLASS)}
                    placeholder={summary?.passwordRequired ? "Leave blank to keep current password" : "Set a link password"}
                  />
                </ControlField>
              ) : null}
            </section>

            <section>
              <h3 className="text-[11px] font-medium leading-4 text-ink">Summary</h3>
              <dl className="mt-1.5 divide-y divide-hairline border-y border-hairline text-[10px] leading-4">
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Estimates</dt><dd className="font-medium text-ink">{selectedEstimateIds.length} of {estimates.length}</dd></div>
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Access</dt><dd className="text-right font-medium text-ink">{passwordRequired ? "Password required" : "Anyone with the link"}</dd></div>
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Action</dt><dd className="text-right font-medium text-ink">{isExistingLink ? "Update current link" : "Create new link"}</dd></div>
              </dl>
            </section>

            {feedback ? (
              <p
                role={feedback.tone === "error" ? "alert" : "status"}
                className={cn(
                  "border px-2.5 py-2 text-[10px] leading-4",
                  feedback.tone === "error"
                    ? "border-danger/30 bg-dangerSoft text-danger"
                    : "border-success/30 bg-surfaceMuted text-secondary",
                )}
              >
                {feedback.text}
              </p>
            ) : null}
          </aside>
        </div>
      )}
      </Drawer>
      <UnsavedChangesDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        title="Discard link changes?"
        description="Your estimate and access changes have not been saved."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        initialFocus="cancel"
        onConfirm={closeEditor}
      />
    </>
  );
}
