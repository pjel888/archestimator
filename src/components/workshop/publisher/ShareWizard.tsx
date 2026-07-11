"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LockSimple } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Drawer } from "@/components/ui/overlays/sheet-drawer";
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

const WIZARD_STEPS = ["Select estimates", "Access settings", "Review", "Shared"] as const;

function clampStep(value: number | undefined) {
  return Math.min(Math.max(value ?? 1, 1), WIZARD_STEPS.length) - 1;
}

export function ShareWizard({ initialStep, onOpenChange, open, row }: ShareWizardProps) {
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [selectedEstimateIdsOverride, setSelectedEstimateIdsOverride] = useState<string[] | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(() => Boolean(row?.passwordRequired));
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const initializedPasswordProjectRef = useRef<string | null>(null);
  const drawer = usePublisherDrawer(row?.projectId ?? null, open);
  const summary = drawer.data?.summary;
  const estimates = drawer.data?.estimateSheets ?? [];
  const defaultSelectedEstimateIds = summary?.selectedEstimateIds?.length
    ? summary.selectedEstimateIds
    : estimates.map((estimate) => estimate.id);
  const selectedEstimateIds = selectedEstimateIdsOverride ?? defaultSelectedEstimateIds;
  const canManage = row?.canManagePublication && (summary?.canManagePublication ?? true);
  const hasEstimates = estimates.length > 0;
  const canGenerate = Boolean(canManage && hasEstimates && selectedEstimateIds.length > 0 && !drawer.isMutating);
  const clientLinkPath = summary?.clientLinkPath;

  useEffect(() => {
    if (!open) {
      initializedPasswordProjectRef.current = null;
      return;
    }
    setStep(clampStep(initialStep));
    setFeedback(null);
    setPasswordRequired(Boolean(row?.passwordRequired));
    setPassword("");
    setSelectedEstimateIdsOverride(null);
    initializedPasswordProjectRef.current = null;
  }, [initialStep, open, row?.passwordRequired, row?.projectId]);

  useEffect(() => {
    if (!open || !row || !summary || initializedPasswordProjectRef.current === row.projectId) return;
    setPasswordRequired(Boolean(summary.passwordRequired));
    initializedPasswordProjectRef.current = row.projectId;
  }, [open, row, summary]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [open, step]);

  const description = useMemo(
    () => `Step ${step + 1} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[step]}`,
    [step],
  );

  if (!row) return null;

  const previewHref = `/workshop/publisher/preview/${encodeURIComponent(row.projectId)}`;

  async function generate() {
    const projectId = row?.projectId;
    if (!canGenerate || !projectId) return;
    setFeedback(null);
    const result = await drawer.republishMutation.mutateAsync({
      clearPassword: !passwordRequired,
      password: passwordRequired ? password.trim() || undefined : undefined,
      projectId,
      selectedEstimateIds,
    });
    setFeedback(result.message);
    if (!result.ok) return;
    await drawer.query.refetch();
    setStep(3);
  }

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button type="button" variant="secondary" size="sm" className="min-h-11 min-w-0 px-3 sm:min-h-8" onClick={() => onOpenChange(false)}>
        {step === 3 ? "Close" : "Cancel"}
      </Button>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {step > 0 && step < 3 ? (
          <Button type="button" variant="secondary" size="sm" className="min-h-11 min-w-0 px-3 sm:min-h-8" disabled={drawer.isMutating} onClick={() => setStep((current) => current - 1)}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </Button>
        ) : null}
        {step < 2 ? (
          <Button type="button" variant="primary" size="sm" className="min-h-11 min-w-0 px-3 sm:min-h-8" disabled={(step === 0 && (!hasEstimates || selectedEstimateIds.length === 0)) || drawer.isMutating} onClick={() => setStep((current) => current + 1)}>
            Next <ArrowRight size={14} aria-hidden="true" />
          </Button>
        ) : null}
        {step === 2 ? (
          <Button type="button" variant="primary" size="sm" className="min-h-11 min-w-0 px-3 sm:min-h-8" disabled={!canGenerate} onClick={() => void generate()}>
            <Check size={14} aria-hidden="true" /> Share
          </Button>
        ) : null}
        {step === 3 ? (
          <Button type="button" variant="primary" size="sm" className="min-h-11 min-w-0 px-3 sm:min-h-8" onClick={() => onOpenChange(false)}>Done</Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Share ${row.projectName}`}
      description={description}
      side="bottom"
      size="full"
      modal
      closeLabel="Close share wizard"
      contentId="share-wizard"
      contentClassName="h-[calc(100dvh_-_24px)] bg-surface md:mx-auto md:h-[min(680px,calc(100dvh_-_48px))] md:max-w-2xl md:self-center"
      bodyClassName="min-h-0 overflow-auto p-0"
      footer={footer}
    >
      <div className="min-h-full" data-share-wizard="true">
        <div className="sticky top-0 z-10 border-b border-hairline bg-surface/95 px-3 py-2 backdrop-blur-sm">
          <ol
            className="grid grid-cols-4 gap-1"
            aria-label="Share wizard steps"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={WIZARD_STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={description}
          >
            {WIZARD_STEPS.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "min-w-0 rounded-xs px-1 py-1.5 text-center text-[9px] leading-3",
                  index === step
                    ? "bg-ink text-white"
                    : index < step
                      ? "bg-successSoft text-success"
                      : "bg-surfaceMuted text-secondary",
                )}
              >
                <span className="hidden sm:inline">{index + 1}. </span>{label}
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">{description}</p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-tertiary">Step {step + 1} of {WIZARD_STEPS.length}</p>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-[13px] font-medium leading-5 text-ink outline-none">{WIZARD_STEPS[step]}</h3>
          </div>

          {step === 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-4 text-secondary">Choose the estimates clients can see. All estimates are selected by default.</p>
              <SheetPickerList estimates={estimates} selectedIds={selectedEstimateIds} onChange={setSelectedEstimateIdsOverride} disabled={!canManage || drawer.isMutating} />
              {!hasEstimates ? <p role="status" className="rounded-xs border border-warningSoft bg-warningSoft p-3 text-[10px] text-warning">Add an estimate before sharing this project.</p> : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-4 text-secondary">Keep the link open for easy client access, or require a password for sensitive estimates.</p>
              <label className="flex min-h-11 items-center gap-2 rounded-xs border border-hairline bg-surfaceMuted/50 px-3 text-[10px] text-ink sm:min-h-9">
                <input type="checkbox" checked={passwordRequired} onChange={(event) => setPasswordRequired(event.currentTarget.checked)} disabled={!canManage || drawer.isMutating} />
                <LockSimple size={14} aria-hidden="true" /> Require a password
              </label>
              {passwordRequired ? <ControlField label="Password"><ControlInput type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} className={CONTROL_INPUT_SURFACE_CLASS} placeholder={summary?.passwordRequired ? "Leave blank to keep current password" : "Set a link password"} /></ControlField> : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <p className="text-[11px] leading-4 text-secondary">Review what the client will receive, then share the current project snapshot.</p>
              <dl className="divide-y divide-hairline rounded-xs border border-hairline bg-surfaceMuted/40 px-3 text-[10px] leading-4 text-ink">
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Estimates</dt><dd className="font-medium">{selectedEstimateIds.length} of {estimates.length}</dd></div>
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Access</dt><dd className="font-medium">{passwordRequired ? "Password required" : "Anyone with the link"}</dd></div>
                <div className="flex items-center justify-between gap-3 py-2"><dt className="text-secondary">Link</dt><dd className="font-medium">{summary?.publicationId ? "Update existing" : "Create new"}</dd></div>
              </dl>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-[11px] leading-4 text-secondary">The shared page is ready. Copy the link, preview it, or send it directly to recipients.</p>
              {clientLinkPath ? <ShareLinkDisplay clientLinkPath={clientLinkPath} previewHref={previewHref} projectName={row.projectName} /> : <p role="status" className="text-[10px] text-secondary">Refreshing the shared link…</p>}
              {summary?.publicationId ? <RecipientEmailComposer publicationId={summary.publicationId} baseClientLink={clientLinkPath ?? null} currentUserEmail={drawer.data?.currentUserEmail ?? null} projectName={row.projectName} isPublicationBusy={drawer.isMutating} /> : null}
            </div>
          ) : null}

          {feedback ? <p role="status" className="text-[10px] text-secondary">{feedback}</p> : null}
        </div>
      </div>
    </Drawer>
  );
}
