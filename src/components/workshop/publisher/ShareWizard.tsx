"use client";

import { useEffect, useMemo, useState } from "react";
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

const WIZARD_STEPS = ["Select sheets", "Access settings", "Generate", "Success"] as const;

function clampStep(value: number | undefined) {
  return Math.min(Math.max(value ?? 1, 1), WIZARD_STEPS.length) - 1;
}

export function ShareWizard({ initialStep, onOpenChange, open, row }: ShareWizardProps) {
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [selectedEstimateIdsOverride, setSelectedEstimateIdsOverride] = useState<string[] | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const drawer = usePublisherDrawer(row?.projectId ?? null, open);
  const summary = drawer.data?.summary;
  const estimates = drawer.data?.estimateSheets ?? [];
  const selectedEstimateIds = selectedEstimateIdsOverride ?? summary?.selectedEstimateIds ?? estimates.map((estimate) => estimate.id);
  const canManage = row?.canManagePublication && (summary?.canManagePublication ?? true);
  const hasEstimates = estimates.length > 0;
  const canGenerate = Boolean(canManage && hasEstimates && selectedEstimateIds.length > 0 && !drawer.isMutating);
  const clientLinkPath = summary?.clientLinkPath;

  useEffect(() => {
    if (!open) return;
    setStep(clampStep(initialStep));
    setFeedback(null);
    setPasswordRequired(Boolean(summary?.passwordRequired));
    setPassword("");
    setSelectedEstimateIdsOverride(null);
  }, [initialStep, open, row?.projectId]);

  const description = useMemo(
    () => `Step ${step + 1} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[step]}`,
    [step],
  );

  if (!row) return null;

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

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Share ${row.projectName}`}
      description={description}
      side="bottom"
      size="wide"
      modal
      closeLabel="Close share wizard"
      contentId="share-wizard"
      contentClassName="bg-surface md:max-w-2xl md:self-center"
      bodyClassName="min-h-0 overflow-auto"
    >
      <div className="space-y-4" data-share-wizard="true">
        <ol className="grid grid-cols-4 gap-1" aria-label="Share wizard steps">
          {WIZARD_STEPS.map((label, index) => (
            <li key={label} className={cn("rounded-xs px-1 py-1 text-center text-[9px]", index === step ? "bg-ink text-white" : "bg-surfaceMuted text-secondary")}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">{description}</p>

        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] text-secondary">Choose the estimates clients can see.</p>
            <SheetPickerList estimates={estimates} selectedIds={selectedEstimateIds} onChange={setSelectedEstimateIdsOverride} disabled={!canManage || drawer.isMutating} />
            {!hasEstimates ? <p role="status" className="rounded-xs border border-warningSoft bg-warningSoft p-3 text-[10px] text-warning">Add an estimate before generating a shared link.</p> : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] text-ink">
              <input type="checkbox" checked={passwordRequired} onChange={(event) => setPasswordRequired(event.currentTarget.checked)} disabled={!canManage || drawer.isMutating} />
              <LockSimple size={14} aria-hidden="true" /> Require a password
            </label>
            {passwordRequired ? <ControlField label="Password"><ControlInput type="password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} className={CONTROL_INPUT_SURFACE_CLASS} placeholder={summary?.passwordRequired ? "Leave blank to keep current password" : "Set a link password"} /></ControlField> : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-[10px] text-secondary">Review the selected sheets and access settings, then generate the shared link.</p>
            <p className="rounded-xs bg-surfaceMuted p-2 text-[10px] text-ink">{selectedEstimateIds.length} of {estimates.length} estimates selected{passwordRequired ? "; password required" : ""}.</p>
            <Button type="button" variant="primary" disabled={!canGenerate} onClick={() => void generate()}>
              <Check size={14} aria-hidden="true" /> {summary?.publicationId ? "Update link" : "Generate link"}
            </Button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            {clientLinkPath ? <ShareLinkDisplay clientLinkPath={clientLinkPath} projectName={row.projectName} /> : <p role="status" className="text-[10px] text-secondary">Refreshing the generated link…</p>}
            {summary?.publicationId ? <RecipientEmailComposer publicationId={summary.publicationId} baseClientLink={clientLinkPath ?? null} currentUserEmail={drawer.data?.currentUserEmail ?? null} projectName={row.projectName} isPublicationBusy={drawer.isMutating} /> : null}
          </div>
        ) : null}

        {feedback ? <p role="status" className="text-[10px] text-secondary">{feedback}</p> : null}
        <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
          <Button type="button" variant="secondary" disabled={step === 0 || drawer.isMutating} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={14} aria-hidden="true" /> Back</Button>
          {step < 2 ? <Button type="button" variant="primary" disabled={(step === 0 && (!hasEstimates || selectedEstimateIds.length === 0)) || drawer.isMutating} onClick={() => setStep((current) => current + 1)}>Next <ArrowRight size={14} aria-hidden="true" /></Button> : null}
          {step === 3 ? <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>Done</Button> : null}
        </div>
      </div>
    </Drawer>
  );
}
