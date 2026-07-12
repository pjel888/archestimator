"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { ClientPortalRolePreview } from "@/components/workshop/publisher/ClientPortalRolePreview";
import { applyClientPortalComposerTemplateAction, createClientPortalSectionAction, publishClientPortalDraftAction, reorderClientPortalSectionsAction, saveClientPortalSectionDraftAction } from "@/lib/client-portal/composer-actions";
import { CLIENT_PORTAL_COMPOSER_TEMPLATES, type ClientPortalComposerData, type ClientPortalComposerTemplate } from "@/lib/client-portal/composer-contracts";
import { CLIENT_PORTAL_SECTION_KINDS, type ClientPortalSectionKind } from "@/lib/client-portal/contracts";
import { carryForwardClientPortalThreadAction } from "@/lib/client-portal/publisher-discussion-actions";
import { CLIENT_PORTAL_SECTION_REGISTRY, type ClientPortalSectionDraft } from "@/lib/client-portal/section-registry";

function updateDraft(draft: ClientPortalSectionDraft, patch: Partial<ClientPortalSectionDraft>) {
  return { ...draft, ...patch } as ClientPortalSectionDraft;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Client Portal changes could not be saved.";
}

export function ClientPortalComposer({ initialData, portalId, projectId }: { initialData: ClientPortalComposerData; portalId: string; projectId: string }) {
  const [drafts, setDrafts] = useState(initialData.drafts);
  const [selectedKind, setSelectedKind] = useState<ClientPortalSectionKind>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [selectedCarryForwardIds, setSelectedCarryForwardIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const hasVisibleSection = drafts.some((draft) => draft.enabled);
  const missingEstimateSources = drafts.some((draft) => draft.enabled && draft.kind === "estimate_browser" && !(draft.config.selectedEstimateIds?.length));
  const readiness = {
    blockers: initialData.readiness.blockers.filter((blocker) => blocker !== "Add at least one visible section before publishing." && blocker !== "Choose estimate sources for each Estimate Browser section before publishing."),
    warnings: initialData.readiness.warnings,
  };
  if (!hasVisibleSection) readiness.blockers.push("Add at least one visible section before publishing.");
  if (missingEstimateSources) readiness.blockers.push("Choose estimate sources for each Estimate Browser section before publishing.");
  const readyToPublish = readiness.blockers.length === 0;

  function replaceDraft(next: ClientPortalSectionDraft) {
    setDrafts((current) => current.map((draft) => draft.id === next.id ? next : draft));
  }

  function save(draft: ClientPortalSectionDraft) {
    startTransition(async () => {
      try {
        const saved = await saveClientPortalSectionDraftAction({ draft, portalId, projectId });
        replaceDraft(saved);
        setMessage(`${saved.title} saved.`);
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function addSection() {
    startTransition(async () => {
      try {
        const draft = await createClientPortalSectionAction({ kind: selectedKind, portalId, projectId });
        setDrafts((current) => [...current, draft]);
        setMessage(`${draft.title} added.`);
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function applyTemplate(template: ClientPortalComposerTemplate) {
    startTransition(async () => {
      try {
        const created = await applyClientPortalComposerTemplateAction({ portalId, projectId, template });
        setDrafts((current) => [...current, ...created]);
        setMessage(created.length ? `${template.replaceAll("_", " ")} template added.` : "This template's sections are already present.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function moveSection(id: string, direction: -1 | 1) {
    const index = drafts.findIndex((draft) => draft.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const reordered = next.map((draft, sortOrder) => updateDraft(draft, { sortOrder }));
    setDrafts(reordered);
    startTransition(async () => {
      try {
        await reorderClientPortalSectionsAction({ portalId, projectId, sectionIds: reordered.map((draft) => draft.id) });
        setMessage("Section order saved.");
      } catch (error) {
        setDrafts(drafts);
        setMessage(errorMessage(error));
      }
    });
  }

  function publish() {
    startTransition(async () => {
      try {
        const issue = await publishClientPortalDraftAction({ idempotencyKey: crypto.randomUUID(), portalId, projectId });
        const carryForwardResults = await Promise.allSettled([...selectedCarryForwardIds].map((sourceThreadId) => carryForwardClientPortalThreadAction({ portalId, projectId, sourceThreadId, targetIssueId: issue.issueId })));
        const carriedForward = carryForwardResults.filter((result) => result.status === "fulfilled").length;
        if (carriedForward) setSelectedCarryForwardIds((current) => new Set([...current].filter((id) => ![...selectedCarryForwardIds].includes(id))));
        const failed = carryForwardResults.length - carriedForward;
        setMessage(`${issue.reusedExistingIssue ? `${issue.versionLabel} was already published.` : `${issue.versionLabel} published.`}${carriedForward ? ` Carried forward ${carriedForward} selected thread${carriedForward === 1 ? "" : "s"}.` : ""}${failed ? ` ${failed} selected thread${failed === 1 ? "" : "s"} need retrying.` : ""}`);
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hairline bg-surface p-4 text-sm text-secondary">
        <p className="font-medium text-ink">Publish readiness</p>
        {readiness.blockers.map((item) => <p key={item} className="mt-1 text-rose-700">{item}</p>)}
        {readiness.warnings.map((item) => <p key={item} className="mt-1 text-amber-700">{item}</p>)}
        {!readiness.blockers.length && !readiness.warnings.length ? <p className="mt-1 text-emerald-700">Content is ready for the remaining publish checks.</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-4"><div><p className="text-sm font-medium text-ink">Publish immutable issue</p><p className="mt-1 text-xs text-secondary">Publishing snapshots the selected sources and current typed sections. Recipients can be invited from the People tab after issuance.</p></div><button type="button" onClick={() => setPublishConfirmOpen(true)} disabled={isPending || !readyToPublish} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Publish issue</button></div>
      {initialData.unresolvedThreads.length ? <fieldset className="rounded-xl border border-hairline bg-white p-4"><legend className="px-1 text-sm font-medium text-ink">Carry selected unresolved threads into the next issue</legend><p className="mt-1 text-xs text-secondary">Carried threads require revalidation in the new issue; source threads close only after the carry-forward succeeds.</p><div className="mt-3 space-y-2">{initialData.unresolvedThreads.map((thread) => <label key={thread.id} className="flex items-start gap-2 text-sm text-secondary"><input type="checkbox" checked={selectedCarryForwardIds.has(thread.id)} onChange={(event) => setSelectedCarryForwardIds((current) => { const next = new Set(current); if (event.target.checked) next.add(thread.id); else next.delete(thread.id); return next; })} /><span><span className="font-medium text-ink">{thread.subject}</span> <span className="text-xs">from {thread.issueLabel}</span></span></label>)}</div></fieldset> : null}
      {!drafts.length ? <div className="rounded-xl border border-hairline bg-white p-4"><p className="text-sm font-medium text-ink">Start from a typed template</p><p className="mt-1 text-xs text-secondary">Templates add only missing registry sections, so they cannot overwrite existing content.</p><div className="mt-3 flex flex-wrap gap-2">{(Object.keys(CLIENT_PORTAL_COMPOSER_TEMPLATES) as ClientPortalComposerTemplate[]).map((template) => <button key={template} type="button" onClick={() => applyTemplate(template)} disabled={isPending} className="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">{template.replaceAll("_", " ")}</button>)}</div></div> : null}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-hairline bg-white p-4">
        <label className="grid gap-1 text-xs font-medium text-secondary">Add section<select value={selectedKind} onChange={(event) => setSelectedKind(event.target.value as ClientPortalSectionKind)} className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm text-ink">{CLIENT_PORTAL_SECTION_KINDS.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label>
        <button type="button" onClick={addSection} disabled={isPending} className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add section</button>
      </div>
      {message ? <p role="status" className="text-sm text-secondary">{message}</p> : null}
      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const estimateConfig = draft.kind === "estimate_browser" ? draft.config : null;
          const selectedSourceIds = new Set(estimateConfig?.selectedEstimateIds ?? []);
          return <section key={draft.id} className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-secondary">{draft.kind.replaceAll("_", " ")}</p><input aria-label={`${draft.title} title`} value={draft.title} onChange={(event) => replaceDraft(updateDraft(draft, { title: event.target.value }))} className="mt-1 w-full rounded-md border border-hairline px-2 py-1 text-sm font-medium text-ink" /></div><div className="flex gap-1"><button type="button" onClick={() => moveSection(draft.id, -1)} disabled={isPending || index === 0} className="rounded-md border border-hairline px-2 py-1 text-xs disabled:opacity-50">Up</button><button type="button" onClick={() => moveSection(draft.id, 1)} disabled={isPending || index === drafts.length - 1} className="rounded-md border border-hairline px-2 py-1 text-xs disabled:opacity-50">Down</button></div></div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-secondary"><label><input type="checkbox" checked={draft.enabled} onChange={(event) => replaceDraft(updateDraft(draft, { enabled: event.target.checked }))} /> Visible</label><label><input type="checkbox" checked={draft.commentable} onChange={(event) => replaceDraft(updateDraft(draft, { commentable: event.target.checked }))} /> Commentable</label><label><input type="checkbox" checked={draft.downloadable} onChange={(event) => replaceDraft(updateDraft(draft, { downloadable: event.target.checked }))} /> Downloadable</label><label>Layout <select value={draft.layoutMode} onChange={(event) => replaceDraft(updateDraft(draft, { layoutMode: event.target.value as ClientPortalSectionDraft["layoutMode"] }))} className="rounded-md border border-hairline bg-white px-2 py-1">{CLIENT_PORTAL_SECTION_REGISTRY[draft.kind].allowedLayoutModes.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></label></div>
            {estimateConfig ? <fieldset className="mt-4"><legend className="text-sm font-medium text-ink">Estimate sources</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{initialData.sources.map((source) => <label key={source.id} className="flex items-center gap-2 rounded-md border border-hairline p-2 text-sm text-secondary"><input type="checkbox" checked={selectedSourceIds.has(source.id)} onChange={(event) => { const next = new Set(selectedSourceIds); if (event.target.checked) next.add(source.id); else next.delete(source.id); replaceDraft(updateDraft(draft, { config: { ...estimateConfig, selectedEstimateIds: [...next] } })); }} /><span>{source.name}{source.sheetCode ? ` · ${source.sheetCode}` : ""}</span></label>)}{!initialData.sources.length ? <p className="text-sm text-secondary">No project estimate sources are available.</p> : null}</div></fieldset> : null}
            <div className="mt-4"><button type="button" onClick={() => save(draft)} disabled={isPending || !draft.title.trim()} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save section</button></div>
          </section>;
        })}
        {!drafts.length ? <div className="rounded-xl border border-dashed border-hairline bg-white p-8 text-sm text-secondary">Add a typed section to begin composing this Client Portal.</div> : null}
      </div>
      <ClientPortalRolePreview portalId={portalId} projectId={projectId} />
      <ConfirmDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen} title="Publish immutable Client Portal issue?" description="The selected estimates and current typed sections will be snapshotted for recipients." confirmLabel="Publish issue" busy={isPending} onConfirm={publish}>
        Publishing does not send invitations automatically. Review recipients in the People tab after issuance.
      </ConfirmDialog>
    </div>
  );
}
