"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  recoverLegacyWorkspaceCutoverAction,
  runLegacyWorkspaceCutoverAction,
  type LegacyWorkspaceCutoverActionResult,
  type LegacyWorkspaceCutoverRecoveryActionResult,
} from "@/lib/admin/legacy-cutover-actions";
import type { LegacyWorkspaceCutoverReport } from "@/lib/client-portal/legacy-cutover-service";

function reportStatus(report: LegacyWorkspaceCutoverReport) {
  if (report.status === "cutover_complete") return "Cutover complete";
  return "Dry run ready";
}

export function AdminLegacyCutoverPanel() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [recoveryConfirmation, setRecoveryConfirmation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState<LegacyWorkspaceCutoverReport | null>(null);
  const [pending, startTransition] = useTransition();
  const normalizedWorkspaceId = workspaceId.trim();
  const confirmationPhrase = `CUTOVER ${normalizedWorkspaceId}`;
  const preflightReady = report?.dryRun === true
    && report.inventory.workspaceId === normalizedWorkspaceId
    && report.unresolved.length === 0;
  const canApply = preflightReady && confirmation.trim() === confirmationPhrase;

  function run(apply: boolean) {
    setNotice(null);
    startTransition(async () => {
      const result: LegacyWorkspaceCutoverActionResult = await runLegacyWorkspaceCutoverAction({
        apply,
        confirmation,
        ...(apply && report ? { expectedFingerprint: report.inventory.fingerprint } : {}),
        workspaceId: normalizedWorkspaceId,
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setReport(result.report);
      setNotice(apply
        ? "Workspace cutover completed and legacy writes are frozen."
        : result.report.unresolved.length > 0
          ? "Dry check found unresolved legacy records. Resolve them before applying."
          : "Dry check passed. This exact fingerprint is ready to apply.");
    });
  }

  function recover(action: "release" | "takeover") {
    if (!report) return;
    setNotice(null);
    startTransition(async () => {
      const result: LegacyWorkspaceCutoverRecoveryActionResult = await recoverLegacyWorkspaceCutoverAction({
        action,
        confirmation: recoveryConfirmation,
        expectedFingerprint: report.inventory.fingerprint,
        workspaceId: normalizedWorkspaceId,
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setReport(null);
      setRecoveryConfirmation("");
      setNotice(action === "takeover"
        ? "Pending cutover ownership transferred. Run a fresh dry check, then apply."
        : "Pending write barrier released after the no-modern-activity safety check. Run a fresh dry check before continuing.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label className="flex min-w-0 flex-col gap-1 text-[9px] font-medium leading-3 text-tertiary">
          Workspace ID
          <input
            aria-label="Workspace ID"
            autoComplete="off"
            className="min-h-9 w-full rounded-xs border border-hairline bg-white px-2 py-1.5 text-[10px] font-normal leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
            disabled={pending}
            maxLength={128}
            onChange={(event) => {
              setWorkspaceId(event.target.value);
              setConfirmation("");
              setRecoveryConfirmation("");
              setReport(null);
            }}
            placeholder="workspace_…"
            value={workspaceId}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[9px] font-medium leading-3 text-tertiary">
          Apply confirmation
          <input
            aria-describedby="legacy-cutover-confirmation-help"
            aria-label="Apply confirmation"
            autoComplete="off"
            className="min-h-9 w-full rounded-xs border border-hairline bg-white px-2 py-1.5 text-[10px] font-normal leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
            disabled={pending || normalizedWorkspaceId.length === 0}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={normalizedWorkspaceId ? confirmationPhrase : "Enter a workspace ID first"}
            value={confirmation}
          />
        </label>
        <div className="flex flex-wrap gap-1 lg:justify-end">
          <Button
            disabled={pending || normalizedWorkspaceId.length === 0}
            onClick={() => run(false)}
            size="sm"
            variant="secondary"
          >
            {pending ? "Checking…" : "Run dry check"}
          </Button>
          <Button
            disabled={pending || !canApply}
            onClick={() => run(true)}
            size="sm"
            variant="danger"
          >
            Apply cutover
          </Button>
        </div>
      </div>

      <p id="legacy-cutover-confirmation-help" className="text-[9px] leading-3 text-tertiary">
        Dry check inventories and verifies only. Apply first acquires the workspace write barrier, repeats the exact preflight under that barrier, migrates, verifies, and finalizes the freeze.
      </p>

      <div aria-live="polite" className="min-h-4 text-[9px] leading-4 text-secondary" role="status">
        {notice}
      </div>

      {report ? (
        <div className="flex flex-col gap-2 rounded-xs border border-hairline bg-surfaceMuted p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium leading-4 text-ink">{reportStatus(report)}</p>
              <p className="text-[9px] leading-3 text-tertiary">
                Captured {new Date(report.inventory.capturedAt).toLocaleString()} · fingerprint {report.inventory.fingerprint.slice(0, 12)}
              </p>
            </div>
            <Badge tone={report.status === "cutover_complete" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
              {report.dryRun ? "No changes" : report.freezeEnabled ? "Writes frozen" : "Not frozen"}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-xs border border-hairline bg-white sm:grid-cols-3 xl:grid-cols-6">
            {[
              ["Legacy links", report.inventory.legacyPublications],
              ["Modern portals", report.inventory.modernPortals],
              [report.dryRun ? "Planned" : "Migrated", report.migrated],
              ["Skipped", report.skipped],
              ["Unresolved", report.unresolved.length],
              ["Bad mappings", report.inventory.inconsistentMappings],
            ].map(([label, value]) => (
              <div className="min-w-0 border-b border-r border-hairline px-2 py-1.5 last:border-r-0 sm:[&:nth-last-child(-n+3)]:border-b-0 xl:border-b-0" key={label}>
                <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">{label}</dt>
                <dd className="text-[11px] font-medium leading-4 tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {report.unresolved.length > 0 ? (
            <ul aria-label="Unresolved legacy publications" className="space-y-1">
              {report.unresolved.map((item) => (
                <li className="rounded-xs border border-warningSoft bg-white px-2 py-1 text-[9px] leading-3 text-secondary" key={`${item.legacyPublicationId}:${item.reason}`}>
                  <span className="font-medium text-ink">{item.legacyPublicationId}</span> · {item.reason}
                </li>
              ))}
            </ul>
          ) : null}

          {report.barrier.mode === "pending" ? (
            <div className="grid gap-2 rounded-xs border border-warningSoft bg-white p-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <label className="flex min-w-0 flex-col gap-1 text-[9px] font-medium leading-3 text-tertiary">
                Pending-barrier recovery confirmation
                <input
                  aria-label="Pending-barrier recovery confirmation"
                  autoComplete="off"
                  className="min-h-9 w-full rounded-xs border border-hairline bg-white px-2 py-1.5 text-[10px] font-normal leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  disabled={pending}
                  onChange={(event) => setRecoveryConfirmation(event.target.value)}
                  placeholder={`TAKEOVER ${normalizedWorkspaceId} or RELEASE ${normalizedWorkspaceId}`}
                  value={recoveryConfirmation}
                />
              </label>
              <div className="flex flex-wrap gap-1 lg:justify-end">
                <Button
                  disabled={pending || recoveryConfirmation.trim() !== `TAKEOVER ${normalizedWorkspaceId}`}
                  onClick={() => recover("takeover")}
                  size="sm"
                  variant="secondary"
                >
                  Take over safely
                </Button>
                <Button
                  disabled={pending || recoveryConfirmation.trim() !== `RELEASE ${normalizedWorkspaceId}`}
                  onClick={() => recover("release")}
                  size="sm"
                  variant="danger"
                >
                  Release after safety check
                </Button>
              </div>
              <p className="text-[9px] leading-3 text-tertiary lg:col-span-2">
                Takeover preserves the freeze and records the new operator. Release succeeds only when no finalized mapping or modern workspace activity exists after the freeze; both actions are audited atomically.
              </p>
            </div>
          ) : null}

          <details className="rounded-xs border border-hairline bg-white px-2 py-1.5">
            <summary className="cursor-pointer text-[9px] font-medium leading-3 text-ink">Artifact-ready JSON</summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[8px] leading-3 text-secondary">
              {JSON.stringify(report, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
