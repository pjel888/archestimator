"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { publishClientPortalDraftAction } from "@/lib/client-portal/composer-actions";
import {
  abandonClientPortalIssueDraftAction,
  markClientPortalIssueDraftReadyAction,
  openClientPortalIssueDraftAction,
  saveClientPortalIssueDraftAction,
} from "@/lib/client-portal/issue-draft-actions";
import { CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES, CLIENT_PORTAL_ISSUE_KINDS } from "@/lib/client-portal/issue-draft-contracts";
import type { ClientPortalIssueDraft } from "@/lib/client-portal/issue-draft-repository";
import type { ClientPortalIssueDraftSources } from "@/lib/client-portal/issue-draft-sources";
import {
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  parseClientPortalNarrativeResponse,
  type ClientPortalNarrativeResponse,
} from "@/lib/client-portal/narrative-ai";
import { carryForwardClientPortalThreadAction } from "@/lib/client-portal/publisher-discussion-actions";

type Props = {
  portalId: string;
  projectId: string;
  templateHasEstimateSection: boolean;
  templateSectionIds: string[];
  unresolvedThreads: Array<{ id: string; issueLabel: string; subject: string }>;
};

type NarrativeReview = {
  accepted: boolean;
  response: ClientPortalNarrativeResponse;
  text: string;
};

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "Issue package could not be saved.";
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function selected(set: Set<string>, id: string, checked: boolean) {
  const next = new Set(set);
  if (checked) next.add(id); else next.delete(id);
  return next;
}

export function IssuePackageComposer({ portalId, projectId, templateHasEstimateSection, templateSectionIds, unresolvedThreads }: Props) {
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<ClientPortalIssueDraft | null>(null);
  const [sources, setSources] = useState<ClientPortalIssueDraftSources | null>(null);
  const [narrativeMessage, setNarrativeMessage] = useState("");
  const [narrativeReview, setNarrativeReview] = useState<NarrativeReview | null>(null);
  const [narrativeReviewed, setNarrativeReviewed] = useState(false);
  const [narrativePending, setNarrativePending] = useState(false);
  const [message, setMessage] = useState("Opening issue draft…");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [selectedCarryForwardIds, setSelectedCarryForwardIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const draftRef = useRef<ClientPortalIssueDraft | null>(null);
  const serverRevisionRef = useRef(0);
  const editVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const templateSectionKey = templateSectionIds.join("\u001f");
  const estimateIntentKey = searchParams.getAll("estimateId").join("\u001f");
  const artifactIntentKey = searchParams.getAll("artifactVersionId").join("\u001f");
  const requestIntentKey = searchParams.getAll("requestVersionId").join("\u001f");
  const currentNarrativeFingerprint = draft && sources
    ? buildClientPortalNarrativeInputFingerprint({
        draftRevision: draft.draftRevision,
        changeSet: buildClientPortalNarrativeInput({ draft, sources }),
      })
    : null;
  const narrativeReviewStale = Boolean(
    narrativeReview
    && currentNarrativeFingerprint
    && narrativeReview.response.inputFingerprint !== currentNarrativeFingerprint,
  );

  async function flushAutosave() {
    if (savingRef.current) return true;
    savingRef.current = true;
    try {
      while (draftRef.current && savedVersionRef.current < editVersionRef.current) {
        const targetVersion = editVersionRef.current;
        const snapshot = { ...draftRef.current, draftRevision: serverRevisionRef.current };
        const saved = await saveClientPortalIssueDraftAction({ draft: snapshot, portalId, projectId });
        serverRevisionRef.current = saved.draftRevision;
        savedVersionRef.current = targetVersion;
        if (editVersionRef.current === targetVersion) {
          draftRef.current = saved;
          setDraft(saved);
        } else if (draftRef.current) {
          draftRef.current = { ...draftRef.current, draftRevision: saved.draftRevision, status: saved.status, updatedAt: saved.updatedAt };
          setDraft(draftRef.current);
        }
      }
      setMessage("All package changes saved.");
      return true;
    } catch (error) {
      setMessage(messageFor(error));
      return false;
    } finally {
      savingRef.current = false;
    }
  }

  function queueDraft(next: ClientPortalIssueDraft) {
    draftRef.current = next;
    setDraft(next);
    editVersionRef.current += 1;
    setMessage("Saving package changes…");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushAutosave(); }, 650);
  }

  useEffect(() => {
    let active = true;
    const currentTemplateSectionIds = templateSectionKey ? templateSectionKey.split("\u001f") : [];
    const intendedEstimateIds = new Set(estimateIntentKey ? estimateIntentKey.split("\u001f") : []);
    const intendedArtifactVersionIds = new Set(artifactIntentKey ? artifactIntentKey.split("\u001f") : []);
    const intendedRequestVersionIds = new Set(requestIntentKey ? requestIntentKey.split("\u001f") : []);
    startTransition(async () => {
      try {
        const opened = await openClientPortalIssueDraftAction({ portalId, projectId });
        if (!active) return;
        const hasSectionSnapshot = Array.isArray(opened.draft.sectionOverrides.includedSectionIds);
        const hasDecisionPolicy = Object.keys(opened.draft.decisionPolicy).length > 0;
        const estimates = opened.sources.estimates.flatMap((source, sortOrder) =>
          intendedEstimateIds.has(source.id) && !opened.draft.estimates.some((selection) => selection.estimateId === source.id)
            ? [{ estimateId: source.id, included: true, sortOrder: opened.draft.estimates.length + sortOrder }]
            : [],
        );
        const artifacts = opened.sources.artifacts.flatMap((source, sortOrder) =>
          intendedArtifactVersionIds.has(source.artifactVersionId) && !opened.draft.artifacts.some((selection) => selection.artifactVersionId === source.artifactVersionId)
            ? [{ artifactVersionId: source.artifactVersionId, commentable: true, decisionRelevant: false, description: null, displayTitle: source.title, downloadable: false, purpose: "reference" as const, sortOrder: opened.draft.artifacts.length + sortOrder }]
            : [],
        );
        const requests = opened.sources.requests.flatMap((source, sortOrder) =>
          intendedRequestVersionIds.has(source.requestVersionId) && !opened.draft.requests.some((selection) => selection.requestVersionId === source.requestVersionId)
            ? [{ relationship: "related" as const, requestId: source.requestId, requestVersionId: source.requestVersionId, sortOrder: opened.draft.requests.length + sortOrder }]
            : [],
        );
        let initialized = {
          ...opened.draft,
          artifacts: [...opened.draft.artifacts, ...artifacts],
          decisionPolicy: opened.draft.requestedDecision === "formal" && !hasDecisionPolicy
            ? { requiredApprovals: 1, rule: "any_approver", scope: "issue" }
            : opened.draft.decisionPolicy,
          estimates: [...opened.draft.estimates, ...estimates],
          requests: [...opened.draft.requests, ...requests],
          sectionOverrides: hasSectionSnapshot
            ? opened.draft.sectionOverrides
            : { ...opened.draft.sectionOverrides, includedSectionIds: currentTemplateSectionIds },
        };
        if (!hasSectionSnapshot || (opened.draft.requestedDecision === "formal" && !hasDecisionPolicy) || estimates.length > 0 || artifacts.length > 0 || requests.length > 0) {
          initialized = await saveClientPortalIssueDraftAction({ draft: initialized, portalId, projectId });
          if (!active) return;
        }
        draftRef.current = initialized;
        serverRevisionRef.current = initialized.draftRevision;
        setDraft(initialized);
        setSources(opened.sources);
        setMessage("Issue package is open.");
      } catch (error) {
        if (active) setMessage(messageFor(error));
      }
    });
    return () => {
      active = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [artifactIntentKey, estimateIntentKey, portalId, projectId, requestIntentKey, templateSectionKey]);

  if (!draft || !sources) {
    return <section className="rounded-xl border border-hairline bg-white p-4"><p className="text-sm font-medium text-ink">Compose issue package</p><p role="status" className="mt-1 text-sm text-secondary">{message}</p></section>;
  }

  const includedEstimateIds = new Set(draft.estimates.filter((item) => item.included).map((item) => item.estimateId));
  const selectedArtifactIds = new Set(draft.artifacts.map((item) => item.artifactVersionId));
  const selectedRequestIds = new Set(draft.requests.map((item) => item.requestVersionId));
  const readiness = [
    ...(templateSectionIds.length === 0 ? ["Add at least one visible portal template section."] : []),
    ...(templateHasEstimateSection && includedEstimateIds.size === 0 ? ["Choose at least one estimate for the estimate sections."] : []),
    ...(includedEstimateIds.size === 0 && draft.artifacts.length === 0 && draft.requests.length === 0 ? ["Select at least one estimate, artifact, or request."] : []),
    ...(!draft.revisionNote?.trim() ? ["Add the final revision narrative."] : []),
    ...(draft.requestedDecision === "formal" && Object.keys(draft.decisionPolicy).length === 0 ? ["Configure the formal decision policy."] : []),
  ];

  function update(patch: Partial<ClientPortalIssueDraft>) {
    let next = { ...draftRef.current!, ...patch };
    if (narrativeReview?.accepted && !("revisionNote" in patch)) {
      const nextFingerprint = buildClientPortalNarrativeInputFingerprint({
        draftRevision: next.draftRevision,
        changeSet: buildClientPortalNarrativeInput({ draft: next, sources: sources! }),
      });
      if (nextFingerprint !== narrativeReview.response.inputFingerprint) {
        next = { ...next, revisionNote: null };
        setNarrativeReview({ ...narrativeReview, accepted: false });
        setNarrativeReviewed(false);
        setNarrativeMessage("The package changed, so the accepted AI draft was removed. Generate or write a fresh narrative.");
      }
    }
    queueDraft(next);
  }

  async function generateNarrative() {
    setNarrativePending(true);
    setNarrativeMessage("Preparing a source-backed draft...");
    try {
      if (!(await flushAutosave()) || !draftRef.current) return;
      const currentDraft = draftRef.current;
      const expectedFingerprint = buildClientPortalNarrativeInputFingerprint({
        draftRevision: currentDraft.draftRevision,
        changeSet: buildClientPortalNarrativeInput({ draft: currentDraft, sources: sources! }),
      });
      const result = await fetch("/api/ai/client-portal-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: currentDraft.id,
          draftRevision: currentDraft.draftRevision,
          portalId,
          projectId,
        }),
      });
      const payload = await result.json().catch(() => null) as unknown;
      if (!result.ok) {
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "AI-assisted narrative is unavailable.";
        throw new Error(error);
      }
      const response = parseClientPortalNarrativeResponse(payload);
      if (response.draftRevision !== currentDraft.draftRevision || response.inputFingerprint !== expectedFingerprint) {
        throw new Error("The issue draft changed while the narrative was generated. Generate again.");
      }
      setNarrativeReview({ accepted: false, response, text: response.narrative });
      setNarrativeReviewed(false);
      setNarrativeMessage(response.source === "ai"
        ? "Source-backed AI draft ready. Review or edit every line before accepting it."
        : "Deterministic source-backed draft ready. AI was not required.");
    } catch (error) {
      setNarrativeMessage(messageFor(error));
    } finally {
      setNarrativePending(false);
    }
  }

  function acceptNarrative() {
    if (!narrativeReview || narrativeReviewStale || !narrativeReviewed || !narrativeReview.text.trim()) return;
    update({ revisionNote: narrativeReview.text.trim() });
    setNarrativeReview({ ...narrativeReview, accepted: true, text: narrativeReview.text.trim() });
    setNarrativeMessage("Reviewed narrative accepted into the final revision note and queued for save.");
  }

  function markReady() {
    startTransition(async () => {
      if (!(await flushAutosave()) || !draftRef.current) return;
      try {
        const ready = await markClientPortalIssueDraftReadyAction({ draftId: draftRef.current.id, expectedRevision: serverRevisionRef.current, portalId, projectId });
        draftRef.current = ready;
        serverRevisionRef.current = ready.draftRevision;
        setDraft(ready);
        setMessage("Issue package is ready to publish.");
      } catch (error) {
        setMessage(messageFor(error));
      }
    });
  }

  function publish() {
    startTransition(async () => {
      try {
        const currentDraft = draftRef.current;
        if (!currentDraft) return;
        const issue = await publishClientPortalDraftAction({ draftId: currentDraft.id, idempotencyKey: crypto.randomUUID(), portalId, projectId });
        const carryForwardResults = await Promise.allSettled([...selectedCarryForwardIds].map((sourceThreadId) => carryForwardClientPortalThreadAction({ portalId, projectId, sourceThreadId, targetIssueId: issue.issueId })));
        const carriedForward = carryForwardResults.filter((result) => result.status === "fulfilled").length;
        setMessage(`${issue.versionLabel} published.${carriedForward ? ` Carried forward ${carriedForward} discussion${carriedForward === 1 ? "" : "s"}.` : ""}`);
        setPublishConfirmOpen(false);
        const opened = await openClientPortalIssueDraftAction({ portalId, projectId });
        draftRef.current = opened.draft;
        serverRevisionRef.current = opened.draft.draftRevision;
        editVersionRef.current = 0;
        savedVersionRef.current = 0;
        setDraft(opened.draft);
        setSources(opened.sources);
        setSelectedCarryForwardIds(new Set());
      } catch (error) {
        setMessage(messageFor(error));
      }
    });
  }

  function abandon() {
    startTransition(async () => {
      if (!(await flushAutosave()) || !draftRef.current) return;
      try {
        await abandonClientPortalIssueDraftAction({ draftId: draftRef.current.id, expectedRevision: serverRevisionRef.current, portalId, projectId });
        const opened = await openClientPortalIssueDraftAction({ portalId, projectId });
        draftRef.current = opened.draft;
        serverRevisionRef.current = opened.draft.draftRevision;
        editVersionRef.current = 0;
        savedVersionRef.current = 0;
        setDraft(opened.draft);
        setSources(opened.sources);
        setMessage("Previous package retained as abandoned. A new draft is open.");
      } catch (error) {
        setMessage(messageFor(error));
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-hairline bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-secondary">Compose</p><h2 className="mt-1 text-lg font-semibold text-ink">Issue package</h2><p className="mt-1 text-sm text-secondary">Select exact project evidence, write the client-safe narrative, then mark the package ready.</p></div><div className="rounded-md bg-surface px-3 py-2 text-xs text-secondary">Revision {draft.draftRevision} · {draft.status}</div></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-ink">Issue kind<select value={draft.issueKind} onChange={(event) => update({ issueKind: event.target.value as ClientPortalIssueDraft["issueKind"] })} className="rounded-md border border-hairline bg-white px-3 py-2 font-normal">{CLIENT_PORTAL_ISSUE_KINDS.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Version label<input value={draft.versionLabel ?? ""} onChange={(event) => update({ versionLabel: event.target.value || null })} placeholder="Issue 2 or CO-01" className="rounded-md border border-hairline px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Based on baseline<select value={draft.basedOnBaselineId ?? ""} onChange={(event) => update({ basedOnBaselineId: event.target.value || null })} className="rounded-md border border-hairline bg-white px-3 py-2 font-normal"><option value="">No baseline selected</option>{sources.baselines.map((baseline) => <option key={baseline.id} value={baseline.id}>{baseline.issueLabel}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Compare with issue<select value={draft.comparisonIssueId ?? ""} onChange={(event) => update({ comparisonIssueId: event.target.value || null })} className="rounded-md border border-hairline bg-white px-3 py-2 font-normal"><option value="">No comparison issue</option>{sources.issues.map((issue) => <option key={issue.id} value={issue.id}>#{issue.issueNumber} · {issue.versionLabel}</option>)}</select></label>
      </div>
      <fieldset><legend className="text-sm font-medium text-ink">Estimates</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{sources.estimates.map((source) => <label key={source.id} className="flex items-center gap-2 rounded-md border border-hairline p-2 text-sm text-secondary"><input type="checkbox" checked={includedEstimateIds.has(source.id)} onChange={(event) => { const ids = selected(includedEstimateIds, source.id, event.target.checked); update({ estimates: sources.estimates.flatMap((candidate, sortOrder) => ids.has(candidate.id) ? [{ estimateId: candidate.id, included: true, sortOrder }] : []) }); }} /><span>{source.name}{source.sheetCode ? ` · ${source.sheetCode}` : ""}</span></label>)}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-ink">Exact artifact versions</legend><div className="mt-2 grid gap-2 lg:grid-cols-2">{sources.artifacts.map((source) => { const current = draft.artifacts.find((item) => item.artifactVersionId === source.artifactVersionId); return <div key={source.artifactVersionId} className="rounded-md border border-hairline p-3"><label className="flex items-start gap-2 text-sm text-secondary"><input type="checkbox" checked={selectedArtifactIds.has(source.artifactVersionId)} onChange={(event) => { const remaining = draft.artifacts.filter((item) => item.artifactVersionId !== source.artifactVersionId); update({ artifacts: event.target.checked ? [...remaining, { artifactVersionId: source.artifactVersionId, commentable: true, decisionRelevant: false, description: null, displayTitle: source.title, downloadable: false, purpose: "reference", sortOrder: remaining.length }] : remaining.map((item, sortOrder) => ({ ...item, sortOrder })) }); }} /><span><span className="font-medium text-ink">{source.title}</span><br /><span className="text-xs">v{source.versionNumber}{source.revisionLabel ? ` · ${source.revisionLabel}` : ""} · {source.fileName}</span></span></label>{current ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs text-secondary">Purpose<select value={current.purpose} onChange={(event) => update({ artifacts: draft.artifacts.map((item) => item.artifactVersionId === current.artifactVersionId ? { ...item, purpose: event.target.value as typeof current.purpose } : item) })} className="rounded-md border border-hairline bg-white px-2 py-1">{CLIENT_PORTAL_ISSUE_ARTIFACT_PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}</select></label><div className="flex flex-wrap items-end gap-3 text-xs text-secondary"><label><input type="checkbox" checked={current.commentable} onChange={(event) => update({ artifacts: draft.artifacts.map((item) => item.artifactVersionId === current.artifactVersionId ? { ...item, commentable: event.target.checked } : item) })} /> Commentable</label><label><input type="checkbox" checked={current.downloadable} onChange={(event) => update({ artifacts: draft.artifacts.map((item) => item.artifactVersionId === current.artifactVersionId ? { ...item, downloadable: event.target.checked } : item) })} /> Downloadable</label><label><input type="checkbox" checked={current.decisionRelevant} onChange={(event) => update({ artifacts: draft.artifacts.map((item) => item.artifactVersionId === current.artifactVersionId ? { ...item, decisionRelevant: event.target.checked } : item) })} /> Decision relevant</label></div></div> : null}</div>; })}{!sources.artifacts.length ? <p className="text-sm text-secondary">No active project artifacts are available.</p> : null}</div></fieldset>
      <fieldset><legend className="text-sm font-medium text-ink">Change requests</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{sources.requests.map((source) => <label key={source.requestVersionId} className="flex items-start gap-2 rounded-md border border-hairline p-2 text-sm text-secondary"><input type="checkbox" checked={selectedRequestIds.has(source.requestVersionId)} onChange={(event) => { const remaining = draft.requests.filter((item) => item.requestVersionId !== source.requestVersionId); update({ requests: event.target.checked ? [...remaining, { relationship: "related", requestId: source.requestId, requestVersionId: source.requestVersionId, sortOrder: remaining.length }] : remaining.map((item, sortOrder) => ({ ...item, sortOrder })) }); }} /><span><span className="font-medium text-ink">{source.requestCode} · {source.title}</span><br /><span className="text-xs">{source.status.replaceAll("_", " ")}</span></span></label>)}</div></fieldset>
      <label className="grid gap-1 text-sm font-medium text-ink">Final revision narrative<textarea value={draft.revisionNote ?? ""} onChange={(event) => update({ revisionNote: event.target.value || null })} rows={4} className="rounded-md border border-hairline px-3 py-2 font-normal" placeholder="Explain what changed, why it changed, and what decision is requested." /></label>
      <section aria-labelledby="ai-revision-narrative-heading" className="rounded-lg border border-hairline bg-surface p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="ai-revision-narrative-heading" className="text-sm font-medium text-ink">AI-assisted revision draft</h3>
            <p className="mt-1 max-w-3xl text-xs text-secondary">AI only organizes facts already present in this draft. It cannot calculate costs, change package contents, make commitments, approve decisions, or publish. Review and explicitly accept the text before it is saved.</p>
          </div>
          <Button size="sm" variant="outline" disabled={narrativePending || isPending} onClick={() => { void generateNarrative(); }}>
            {narrativePending ? "Generating..." : narrativeReview ? "Regenerate draft" : "Generate source-backed draft"}
          </Button>
        </div>
        {narrativeReview ? (
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-secondary">
              <span className="rounded-full border border-hairline bg-white px-2 py-1">{narrativeReview.response.source === "ai" ? "AI organized" : "Deterministic fallback"}</span>
              <span className="rounded-full border border-hairline bg-white px-2 py-1">{narrativeReview.response.provider} · {narrativeReview.response.model}</span>
              <span className="rounded-full border border-hairline bg-white px-2 py-1">Input {narrativeReview.response.inputHash.slice(0, 10)}</span>
            </div>
            {narrativeReviewStale ? <p role="alert" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-ink">This generated draft is stale because the package changed. Regenerate before accepting it.</p> : null}
            <label className="grid gap-1 text-sm font-medium text-ink">Draft to review<textarea aria-label="AI-assisted narrative draft" value={narrativeReview.text} onChange={(event) => { setNarrativeReview({ ...narrativeReview, accepted: false, text: event.target.value }); setNarrativeReviewed(false); }} rows={6} className="rounded-md border border-hairline bg-white px-3 py-2 font-normal" /></label>
            <label className="flex items-start gap-2 text-xs text-secondary"><input type="checkbox" checked={narrativeReviewed} onChange={(event) => setNarrativeReviewed(event.target.checked)} /><span>I reviewed this text against the selected package evidence and accept responsibility for the final wording.</span></label>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="primary" disabled={narrativeReviewStale || !narrativeReviewed || !narrativeReview.text.trim()} onClick={acceptNarrative}>Use reviewed narrative</Button>
              {narrativeReview.accepted ? <span className="text-xs font-medium text-success">Accepted into the final revision narrative.</span> : null}
            </div>
          </div>
        ) : null}
        {narrativeMessage ? <p role="status" className="mt-3 text-xs text-secondary">{narrativeMessage}</p> : null}
      </section>
      <div className="grid gap-3 lg:grid-cols-3"><label className="grid gap-1 text-sm font-medium text-ink">Assumptions<textarea value={draft.assumptions.join("\n")} onChange={(event) => update({ assumptions: lines(event.target.value) })} rows={4} className="rounded-md border border-hairline px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium text-ink">Exclusions<textarea value={draft.exclusions.join("\n")} onChange={(event) => update({ exclusions: lines(event.target.value) })} rows={4} className="rounded-md border border-hairline px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-medium text-ink">Unresolved items<textarea value={draft.unresolvedItems.join("\n")} onChange={(event) => update({ unresolvedItems: lines(event.target.value) })} rows={4} className="rounded-md border border-hairline px-3 py-2 font-normal" /></label></div>
      <label className="grid gap-1 text-sm font-medium text-ink">Requested decision<select value={draft.requestedDecision} onChange={(event) => { const requestedDecision = event.target.value as ClientPortalIssueDraft["requestedDecision"]; update({ requestedDecision, decisionPolicy: requestedDecision === "formal" ? { requiredApprovals: 1, rule: "any_approver", scope: "issue" } : {} }); }} className="max-w-sm rounded-md border border-hairline bg-white px-3 py-2 font-normal"><option value="none">No decision</option><option value="acknowledgement">Acknowledgement</option><option value="formal">Formal decision</option></select></label>
      {unresolvedThreads.length ? <fieldset><legend className="text-sm font-medium text-ink">Carry unresolved discussions</legend><div className="mt-2 space-y-2">{unresolvedThreads.map((thread) => <label key={thread.id} className="flex items-start gap-2 text-sm text-secondary"><input type="checkbox" checked={selectedCarryForwardIds.has(thread.id)} onChange={(event) => setSelectedCarryForwardIds(selected(selectedCarryForwardIds, thread.id, event.target.checked))} /><span><span className="font-medium text-ink">{thread.subject}</span> from {thread.issueLabel}</span></label>)}</div></fieldset> : null}
      <div className="rounded-md border border-hairline bg-surface p-3 text-sm"><p className="font-medium text-ink">Readiness</p>{readiness.map((item) => <p key={item} className="mt-1 text-rose-700">{item}</p>)}{readiness.length === 0 ? <p className="mt-1 text-emerald-700">All package checks are satisfied.</p> : null}</div>
      <p role="status" className="text-sm text-secondary">{message}</p>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={markReady} disabled={isPending || readiness.length > 0 || draft.status === "ready"} variant="primary" size="md" className="min-h-0 min-w-0 rounded-md bg-ink px-3 py-2 !text-sm leading-5 text-white hover:bg-ink">Mark ready</Button><Button type="button" onClick={() => setPublishConfirmOpen(true)} disabled={isPending || draft.status !== "ready"} variant="primary" size="md" className="min-h-0 min-w-0 rounded-md bg-brand px-3 py-2 !text-sm leading-5 text-white hover:bg-brand">Publish to timeline</Button><Button type="button" onClick={abandon} disabled={isPending} variant="outline" size="md" className="min-h-0 min-w-0 rounded-md px-3 py-2 !text-sm leading-5">Abandon draft</Button></div>
      <ConfirmDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen} title="Publish immutable issue package?" description="The exact estimates, artifact versions, request versions, template sections, and narratives will be snapshotted." confirmLabel="Publish issue" busy={isPending} onConfirm={publish}>Publishing updates the current proposal but does not alter an accepted baseline.</ConfirmDialog>
    </section>
  );
}
