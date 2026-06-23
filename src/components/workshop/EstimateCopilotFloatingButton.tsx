"use client";

import Link from "next/link";
import { FormEvent, useCallback, useRef, useState } from "react";
import { ChatCircleDots, PaperPlaneRight, Plus, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import type { PackageBuilderApplyResult } from "@/lib/ai/package-builder/apply";
import type { PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

type EstimateCopilotFloatingButtonProps = {
  projectName?: string;
  estimateName?: string;
  selectedNodeName?: string | null;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  packageDraft?: PackageDraftPreviewState;
};

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

type AiAskResponse = {
  message?: string;
  error?: string;
  mode?: "draft" | "feedback" | "apply";
  draft?: PackageBuilderDraft;
  draftHash?: string;
  draftToken?: string;
  serverValidation?: {
    eligible: boolean;
    reasons: string[];
  };
};

type PackageBuilderApplyResponse = {
  mode?: "apply";
  result?: PackageBuilderApplyResult;
  error?: string;
};

type PackageBuilderFeedbackResponse = {
  mode?: "feedback";
  decision?: "rejected";
  productionWrite?: false;
  error?: string;
};

type PackageDraftPreviewState = {
  draft: PackageBuilderDraft;
  draftHash: string;
  draftToken: string;
  idempotencyKey: string;
  confirmed: boolean;
  applyStatus: "ready" | "applying" | "applied";
  feedbackStatus?: "rejecting" | "rejected";
  isStale?: boolean;
  applyResult?: PackageBuilderApplyResult;
  error?: string;
};

function createInitialSession(): ChatSession {
  return {
    id: "ask-flip-session-current-page",
    title: "Current page",
    messages: [],
  };
}

function makeMessageId() {
  return `ai-message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeSessionId() {
  return `ask-flip-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeSessionTitle(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New chat";
  return trimmed.length > 34 ? `${trimmed.slice(0, 31)}...` : trimmed;
}

function getSessionMeta(session: ChatSession) {
  const userMessageCount = session.messages.filter((message) => message.role === "user").length;
  if (userMessageCount === 0) return "No questions yet";
  return userMessageCount === 1 ? "1 question" : `${userMessageCount} questions`;
}

function shouldUsePackageBuilder(prompt: string, routeContext?: Record<string, unknown>) {
  const normalized = prompt.toLowerCase();
  const hasDirectCreationVerb = /\b(assemble|build|create|generate|draft)\b/.test(normalized);
  const hasNaturalCreationPhrase =
    /\b(make|prepare|set\s*up|setup)\b/.test(normalized)
    && /\b(project|package|estimate\s+sheet)\b/.test(normalized);
  const hasCurrentRouteTarget = Boolean(routeContext?.projectId || routeContext?.selectedNodeId || routeContext?.estimateId);
  const hasFillCurrentEstimatePhrase =
    /\b(fill|populate|complete)\b.*\b(this|current|estimate|sheet)\b/.test(normalized)
    || /\b(add|insert)\b.*\b(rows?|components?|items?)\b.*\b(this|current|estimate|sheet)\b/.test(normalized);
  const hasCurrentEstimateUpdatePhrase =
    /\b(change|update|adjust|revise|set)\b.*\b(rows?|items?|quantity|qty|misc\s+cost|contingency|cost)\b/.test(normalized)
    || /\b(quantity|qty|misc\s+cost|contingency)\b.*\b(to|is|=)\b/.test(normalized);
  const hasCurrentTemplateInsertPhrase =
    /\b(insert|add|apply|copy|use)\b.*\b(template|templates|reusable estimate|starter)\b.*\b(this|current|estimate|sheet)\b/.test(normalized)
    || /\b(insert|add|apply|copy|use)\b.*\b(this|current|estimate|sheet)\b.*\b(template|templates|reusable estimate|starter)\b/.test(normalized);
  const hasCurrentTemplateRowCopyPhrase =
    /\b(copy|use|add|insert)\b.*\b(template|templates|starter)\b.*\b(rows?|items?|lines?|finish|component)\b.*\b(this|current|estimate|sheet)\b/.test(normalized)
    || /\b(copy|use|add|insert)\b.*\b(rows?|items?|lines?|finish|component)\b.*\b(template|templates|starter)\b.*\b(this|current|estimate|sheet)\b/.test(normalized);
  const hasCurrentEstimateReplacementPhrase =
    /\b(replace|swap|switch)\b.*\b(rows?|items?|components?|library|current|estimate|sheet)\b/.test(normalized);
  const hasCurrentEstimateDeletePhrase =
    /\b(delete|remove)\b.*\b(rows?|items?|components?|current|estimate|sheet)\b/.test(normalized);
  const hasCurrentEstimateNodeRenamePhrase =
    /\brename\b.*\b(area|room|node|group|space|section|bedroom|toilet|bath|kitchen|living|dining|current|selected)\b/.test(normalized);
  const hasLibraryComponentCreatePhrase =
    /\b(add|create|draft|make|save)\b.*\b(component|item|material|product)\b.*\b(library|catalog|cost\s+library|component\s+library)\b/.test(normalized)
    || /\b(add|create|draft|make|save)\b.*\bto my library\b/.test(normalized);

  return (
    hasLibraryComponentCreatePhrase
    || ((hasDirectCreationVerb || hasNaturalCreationPhrase)
      && /\b(package|estimate|budget|bedroom|bedrooms|condo|unit)\b/.test(normalized))
    || (hasCurrentRouteTarget && hasFillCurrentEstimatePhrase)
    || (hasCurrentRouteTarget && hasCurrentEstimateUpdatePhrase)
    || (hasCurrentRouteTarget && hasCurrentEstimateReplacementPhrase)
    || (hasCurrentRouteTarget && hasCurrentEstimateDeletePhrase)
    || (hasCurrentRouteTarget && hasCurrentEstimateNodeRenamePhrase)
    || (hasCurrentRouteTarget && hasCurrentTemplateRowCopyPhrase)
    || (hasCurrentRouteTarget && hasCurrentTemplateInsertPhrase)
  );
}

function shouldRevisePendingPackageDraft(prompt: string, pendingDraft?: PackageDraftPreviewState | null) {
  if (!pendingDraft || pendingDraft.applyStatus === "applied" || pendingDraft.feedbackStatus === "rejected" || pendingDraft.isStale) return false;
  const normalized = prompt.toLowerCase();
  return /\b(also|add|include|revise|change|update|remove|delete|replace|swap|instead|make it)\b/.test(normalized)
    && /\b(draft|package|estimate|sheet|row|area|room|bedroom|living|dining|kitchen|toilet|bath|component|item|allowance|console|cabinet|wardrobe|closet|cheaper|cost|budget)\b/.test(normalized);
}

function getLatestRevisablePackageDraft(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const packageDraft = messages[index]?.packageDraft;
    if (packageDraft && packageDraft.applyStatus !== "applied" && packageDraft.feedbackStatus !== "rejected" && !packageDraft.isStale) {
      return { messageId: messages[index]?.id ?? "", packageDraft };
    }
  }
  return null;
}

function shouldUseRefineMode(prompt: string, pendingDraft?: PackageDraftPreviewState | null) {
  if (!pendingDraft || pendingDraft.applyStatus === "applied" || pendingDraft.feedbackStatus === "rejected" || pendingDraft.isStale) return false;
  const normalized = prompt.toLowerCase();
  return /\b(cheaper|less expensive|lower cost|reduce|decrease|trim|remove|delete|drop|omit|exclude)\b/.test(normalized)
    || /\bmake it\b.*\b(cheap|cheaper|budget|cost)\b/.test(normalized);
}

function getRouteContextIds() {
  if (typeof window === "undefined") return {};
  const match = window.location.pathname.match(/^\/workshop\/projects\/([^/]+)(?:\/estimates\/([^/]+))?/);
  const activeEstimateTab = document.querySelector<HTMLElement>(
    "[data-estimate-tab-strip] [role='tab'][aria-selected='true'][data-estimate-tab-id]",
  );
  return {
    projectId: match?.[1],
    selectedNodeId: match?.[2],
    activeTabId: activeEstimateTab?.dataset.estimateTabId,
  };
}

function formatPeso(value: number, currencyCode = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function countTreeAreas(draft: PackageBuilderDraft) {
  return draft.treeDraft.filter((node) => node.kind === "area").length;
}

function countRowChanges(draft: PackageBuilderDraft) {
  const templateRows = (draft.templateInsertDraft ?? []).reduce((sum, templateInsert) => sum + templateInsert.expectedRowCount, 0);
  return draft.rowDraft.length + (draft.rowUpdateDraft?.length ?? 0) + (draft.rowReplacementDraft?.length ?? 0) + (draft.rowDeleteDraft?.length ?? 0) + (draft.templateRowCopyDraft?.length ?? 0) + templateRows;
}

function countComponentCreates(draft: PackageBuilderDraft) {
  return draft.componentCreateDraft?.length ?? 0;
}

function countNodeRenames(draft: PackageBuilderDraft) {
  return draft.nodeRenameDraft?.length ?? 0;
}

function formatRowChangeCount(count: number) {
  return `${count} row ${count === 1 ? "change" : "changes"}`;
}

function formatNodeRenameCount(count: number) {
  return `${count} node ${count === 1 ? "rename" : "renames"}`;
}

function formatComponentCreateCount(count: number) {
  return `${count} component ${count === 1 ? "create" : "creates"}`;
}

function formatAppliedRowChanges(insertedRows: number, updatedRows: number, replacedRows: number, deletedRows: number, insertedTemplateRows: number, renamedNodes: number) {
  const parts = [];
  if (renamedNodes > 0) parts.push(`${renamedNodes} node ${renamedNodes === 1 ? "rename" : "renames"}`);
  if (insertedRows > 0) parts.push(`${insertedRows} ${insertedRows === 1 ? "row" : "rows"}`);
  if (updatedRows > 0) parts.push(`${updatedRows} ${updatedRows === 1 ? "update" : "updates"}`);
  if (replacedRows > 0) parts.push(`${replacedRows} ${replacedRows === 1 ? "replacement" : "replacements"}`);
  if (deletedRows > 0) parts.push(`${deletedRows} ${deletedRows === 1 ? "delete" : "deletes"}`);
  if (insertedTemplateRows > 0) parts.push(`${insertedTemplateRows} template ${insertedTemplateRows === 1 ? "row" : "rows"}`);
  return parts.length ? parts.join(" · ") : "0 rows";
}

function formatRowUpdatePatch(update: NonNullable<PackageBuilderDraft["rowUpdateDraft"]>[number], currencyCode: string) {
  const patchParts = [];
  if (typeof update.patch.quantity === "number") patchParts.push(`Qty ${update.patch.quantity}`);
  if (typeof update.patch.miscCost === "number") patchParts.push(`Misc ${formatPeso(update.patch.miscCost, currencyCode)}`);
  if (typeof update.patch.contingencyPercentage === "number") patchParts.push(`Contingency ${update.patch.contingencyPercentage}%`);
  return patchParts.join(" · ");
}

function formatRowReplacementLabel(replacement: NonNullable<PackageBuilderDraft["rowReplacementDraft"]>[number]) {
  return replacement.clientDraftId
    .replace(/^replace-row-/, "Replace ")
    .replace("-with-", " with ")
    .replaceAll("-", " ");
}

function formatRowDeleteLabel(deletion: NonNullable<PackageBuilderDraft["rowDeleteDraft"]>[number]) {
  return deletion.clientDraftId
    .replace(/^delete-row-/, "Delete ")
    .replaceAll("-", " ");
}

function getAppliedEstimateHref(result: PackageBuilderApplyResult) {
  if (!result.projectId) return null;
  const projectEstimatesHref = `/workshop/projects/${encodeURIComponent(result.projectId)}/estimates`;
  return result.selectedNodeId ? `${projectEstimatesHref}/${encodeURIComponent(result.selectedNodeId)}` : projectEstimatesHref;
}

function updateSessionMessage(
  sessions: ChatSession[],
  sessionId: string,
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage,
) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          messages: session.messages.map((message) => (message.id === messageId ? updater(message) : message)),
        }
      : session,
  );
}

function PackageDraftPreview({
  state,
  onConfirm,
  onApply,
  onReject,
}: {
  state: PackageDraftPreviewState;
  onConfirm: (confirmed: boolean) => void;
  onApply: () => void;
  onReject: () => void;
}) {
  const { draft } = state;
  const allowanceRows = draft.rowDraft.filter((row) => row.sourceType === "allowance");
  const linkedRows = draft.rowDraft.filter((row) => row.sourceType === "library_item");
  const rowUpdates = draft.rowUpdateDraft ?? [];
  const rowReplacements = draft.rowReplacementDraft ?? [];
  const rowDeletes = draft.rowDeleteDraft ?? [];
  const nodeRenames = draft.nodeRenameDraft ?? [];
  const templateRowCopies = draft.templateRowCopyDraft ?? [];
  const templateInserts = draft.templateInsertDraft ?? [];
  const componentCreates = draft.componentCreateDraft ?? [];
  const canApply = draft.applyEligibility.eligible
    && state.confirmed
    && !state.isStale
    && state.applyStatus !== "applying"
    && state.applyStatus !== "applied"
    && state.feedbackStatus !== "rejecting"
    && state.feedbackStatus !== "rejected";
  const canReject = !state.isStale
    && state.applyStatus !== "applying"
    && state.applyStatus !== "applied"
    && state.feedbackStatus !== "rejecting"
    && state.feedbackStatus !== "rejected";
  const appliedEstimateHref = state.applyResult ? getAppliedEstimateHref(state.applyResult) : null;
  const appliedInsertedRows = state.applyResult?.insertedRowIds.length ?? 0;
  const appliedUpdatedRows = state.applyResult?.updatedRowIds?.length ?? 0;
  const appliedReplacedRows = state.applyResult?.replacedRowIds?.length ?? 0;
  const appliedDeletedRows = state.applyResult?.deletedRowIds?.length ?? 0;
  const appliedRenamedNodes = state.applyResult?.renamedNodeIds?.length ?? 0;
  const appliedTemplateRows = state.applyResult?.insertedTemplateRowCount ?? 0;
  const appliedComponentCreates = state.applyResult?.createdComponentCount ?? state.applyResult?.createdComponentIds?.length ?? 0;
  const primaryChangeSummary = componentCreates.length > 0
    ? formatComponentCreateCount(countComponentCreates(draft))
    : nodeRenames.length > 0 && countRowChanges(draft) === 0
      ? formatNodeRenameCount(countNodeRenames(draft))
    : formatRowChangeCount(countRowChanges(draft));

  return (
    <div className="mt-2 w-full max-w-full rounded-xs border border-hairline bg-white text-ink">
      <div className="border-b border-hairline px-2 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium leading-4 text-ink">{draft.projectDraft.name}</p>
            <p className="text-[9px] leading-3 text-tertiary">
              {countTreeAreas(draft)} areas · {primaryChangeSummary} · {formatPeso(draft.budgetSummary.draftTotal, draft.budgetSummary.currencyCode)}
            </p>
          </div>
          <div className="shrink-0 text-right text-[9px] leading-3 text-tertiary">
            Budget {formatPeso(draft.budgetSummary.targetBudget, draft.budgetSummary.currencyCode)}
          </div>
        </div>
      </div>
      <div className="grid gap-2 px-2 py-2 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Tree</p>
          <div className="mt-1 space-y-1">
            {draft.treeDraft.slice(0, 8).map((node) => (
              <div key={node.clientDraftId} className="flex items-center gap-1 text-[10px] leading-4 text-ink">
                <span className="text-tertiary">Area</span>
                <span className="truncate">{node.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Budget</p>
          <div className="mt-1 space-y-1 text-[10px] leading-4">
            <div className="flex justify-between gap-2">
              <span className="text-tertiary">Draft total</span>
              <span className="font-medium text-ink">{formatPeso(draft.budgetSummary.draftTotal, draft.budgetSummary.currencyCode)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-tertiary">Variance</span>
              <span className="font-medium text-ink">{formatPeso(draft.budgetSummary.variance, draft.budgetSummary.currencyCode)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-tertiary">Allowances</span>
              <span className="font-medium text-ink">{formatPeso(draft.budgetSummary.allowanceTotal, draft.budgetSummary.currencyCode)}</span>
            </div>
          </div>
        </div>
      </div>
      {rowUpdates.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Row updates</p>
          <div className="mt-1 space-y-1">
            {rowUpdates.slice(0, 5).map((update) => (
              <div key={update.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{update.clientDraftId.replace(/^update-row-/, "").replaceAll("-", " ")}</span>
                <span className="shrink-0 text-tertiary">{formatRowUpdatePatch(update, draft.budgetSummary.currencyCode)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {rowReplacements.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Row replacements</p>
          <div className="mt-1 space-y-1">
            {rowReplacements.slice(0, 5).map((replacement) => (
              <div key={replacement.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{formatRowReplacementLabel(replacement)}</span>
                <span className="shrink-0 text-tertiary">{replacement.material}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {rowDeletes.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Row deletes</p>
          <div className="mt-1 space-y-1">
            {rowDeletes.slice(0, 5).map((deletion) => (
              <div key={deletion.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{formatRowDeleteLabel(deletion)}</span>
                <span className="shrink-0 text-tertiary">Existing row</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {nodeRenames.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Node renames</p>
          <div className="mt-1 space-y-1">
            {nodeRenames.slice(0, 5).map((rename) => (
              <div key={rename.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{rename.currentName}</span>
                <span className="shrink-0 text-tertiary">{rename.nextName}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {templateRowCopies.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Template row copies</p>
          <div className="mt-1 space-y-1">
            {templateRowCopies.slice(0, 5).map((copy) => (
              <div key={copy.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{copy.material}</span>
                <span className="shrink-0 text-tertiary">{copy.sourceTemplateName}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {templateInserts.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Template inserts</p>
          <div className="mt-1 space-y-1">
            {templateInserts.slice(0, 3).map((templateInsert) => (
              <div key={templateInsert.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{templateInsert.sourceTemplateName}</span>
                <span className="shrink-0 text-tertiary">{templateInsert.expectedNodeCount} nodes · {templateInsert.expectedRowCount} rows</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {componentCreates.length > 0 ? (
        <div className="border-t border-hairline px-2 py-2">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Library components</p>
          <div className="mt-1 space-y-1">
            {componentCreates.slice(0, 5).map((component) => (
              <div key={component.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
                <span className="min-w-0 truncate text-ink">{component.name}</span>
                <span className="shrink-0 text-tertiary">{component.unit} · {formatPeso(component.unitCost + component.miscCost, component.currencyCode)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="border-t border-hairline px-2 py-2">
        <p className="text-[9px] font-medium leading-3 text-tertiary">Matched components</p>
        <div className="mt-1 space-y-1">
          {linkedRows.length ? linkedRows.slice(0, 5).map((row) => (
            <div key={row.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
              <span className="min-w-0 truncate text-ink">{row.material}</span>
              <span className="shrink-0 text-tertiary">{formatPeso(row.unitCost, draft.budgetSummary.currencyCode)}</span>
            </div>
          )) : <p className="text-[10px] leading-4 text-tertiary">No scoped library matches.</p>}
        </div>
      </div>
      <div className="border-t border-hairline px-2 py-2">
        <p className="text-[9px] font-medium leading-3 text-tertiary">Allowances</p>
        <div className="mt-1 space-y-1">
          {allowanceRows.slice(0, 5).map((row) => (
            <div key={row.clientDraftId} className="flex justify-between gap-2 text-[10px] leading-4">
              <span className="min-w-0 truncate text-ink">{row.material}</span>
              <span className="shrink-0 text-tertiary">{formatPeso(row.unitCost, draft.budgetSummary.currencyCode)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-hairline px-2 py-2">
        <div className="space-y-1">
          {[...draft.assumptions, ...draft.warnings].slice(0, 4).map((item) => (
            <p key={item} className="text-[10px] leading-4 text-tertiary">{item}</p>
          ))}
        </div>
        {state.isStale ? <p className="mt-2 text-[10px] font-medium leading-4 text-tertiary">A newer refined draft replaced this preview.</p> : null}
        {state.feedbackStatus === "rejected" ? <p className="mt-2 text-[10px] font-medium leading-4 text-tertiary">Draft rejected. Ask Flip will not apply this preview.</p> : null}
        {state.error ? <p role="alert" className="mt-2 text-[10px] font-medium leading-4 text-danger">{state.error}</p> : null}
        {state.applyResult ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-medium leading-4 text-success">
              {appliedComponentCreates > 0
                ? `Created ${appliedComponentCreates} library ${appliedComponentCreates === 1 ? "component" : "components"}`
                : `Applied project ${state.applyResult.projectId?.slice(0, 8) ?? ""} · ${formatAppliedRowChanges(appliedInsertedRows, appliedUpdatedRows, appliedReplacedRows, appliedDeletedRows, appliedTemplateRows, appliedRenamedNodes)}`}
            </p>
            <Link
              href={appliedEstimateHref ?? "/workshop/library"}
              className="shrink-0 rounded-xs border border-hairline bg-white px-2 py-1 text-[10px] font-medium leading-4 text-ink hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {appliedEstimateHref ? "Open estimate" : "Open library"}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-2 py-2">
        <label className="flex min-w-0 items-center gap-2 text-[10px] font-medium leading-4 text-ink">
          <input
            type="checkbox"
            className="size-3 rounded-xs border-hairline"
            checked={state.confirmed}
            disabled={state.isStale || state.applyStatus === "applying" || state.applyStatus === "applied" || state.feedbackStatus === "rejecting" || state.feedbackStatus === "rejected"}
            onChange={(event) => onConfirm(event.target.checked)}
          />
          <span className="min-w-0">I reviewed this draft and approve Apply</span>
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="h-7 rounded-xs px-2 text-[10px]"
            disabled={!canReject}
            onClick={onReject}
          >
            {state.feedbackStatus === "rejecting" ? "Rejecting" : state.feedbackStatus === "rejected" ? "Rejected" : "Reject draft"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-7 rounded-xs px-2 text-[10px]"
            disabled={!canApply}
            onClick={onApply}
          >
            {state.applyStatus === "applying" ? "Applying" : state.applyStatus === "applied" ? "Applied" : componentCreates.length > 0 ? "Apply component" : nodeRenames.length > 0 && countRowChanges(draft) === 0 ? "Apply rename" : "Apply package"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AskFlipFooterAssistant({
  projectName,
  estimateName,
  selectedNodeName,
}: EstimateCopilotFloatingButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>(() => [createInitialSession()]);
  const [activeSessionId, setActiveSessionId] = useState("ask-flip-session-current-page");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const messages = activeSession?.messages ?? [];

  const getCurrentRouteContext = useCallback(() => ({
    projectName,
    estimateName,
    selectedNodeName: selectedNodeName ?? undefined,
    ...getRouteContextIds(),
  }), [estimateName, projectName, selectedNodeName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isSending) return;

    setError(null);
    setInput("");
    const userMessage: ChatMessage = { id: makeMessageId(), role: "user", content: prompt };
    setSessions((current) =>
      current.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              title: session.messages.some((message) => message.role === "user") ? session.title : makeSessionTitle(prompt),
              messages: [...session.messages, userMessage],
            }
          : session,
      ),
    );
    setIsSending(true);

    try {
      const pendingDraftEntry = getLatestRevisablePackageDraft(messages);
      const pendingDraft = pendingDraftEntry?.packageDraft ?? null;
      const refinesPendingDraft = shouldUseRefineMode(prompt, pendingDraft);
      const revisesPendingDraft = !refinesPendingDraft && shouldRevisePendingPackageDraft(prompt, pendingDraft);
      const usesPendingDraft = refinesPendingDraft || revisesPendingDraft;
      const routeContext = getCurrentRouteContext();
      const usePackageBuilder = usesPendingDraft || shouldUsePackageBuilder(prompt, routeContext);
      const response = await fetch(usePackageBuilder ? "/api/ai/package-builder" : "/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usePackageBuilder
          ? {
              mode: refinesPendingDraft ? "refine" : "draft",
              message: prompt,
              routeContext,
              ...(usesPendingDraft && pendingDraft
                ? {
                    baseDraft: pendingDraft.draft,
                    baseDraftHash: pendingDraft.draftHash,
                    baseDraftToken: pendingDraft.draftToken,
                  }
                : {}),
            }
          : { message: prompt, routeContext }),
      });
      const payload = (await response.json().catch(() => ({}))) as AiAskResponse;
      if (!response.ok) throw new Error(payload.error || "AI request failed.");
      const assistantMessageId = makeMessageId();
      const assistantMessage = payload.draft
        ? payload.draft.intent === "create_library_component"
          ? "I drafted a library component for review."
          : "I drafted a package for review."
        : payload.message?.trim() || "I could not produce a useful answer.";
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [
                  ...session.messages.map((message) =>
                    usesPendingDraft && pendingDraftEntry?.messageId === message.id && message.packageDraft
                      ? {
                          ...message,
                          packageDraft: {
                            ...message.packageDraft,
                            confirmed: false,
                            isStale: true,
                            error: undefined,
                          },
                        }
                      : message,
                  ),
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: assistantMessage,
                    packageDraft: payload.draft && payload.draftHash && payload.draftToken
                      ? {
                          draft: payload.draft,
                          draftHash: payload.draftHash,
                          draftToken: payload.draftToken,
                          idempotencyKey: `ask-flip-apply-${assistantMessageId}`,
                          confirmed: false,
                          applyStatus: "ready",
                          error: payload.serverValidation?.eligible === false ? payload.serverValidation.reasons.join(" ") : undefined,
                        }
                      : undefined,
                  },
                ],
              }
            : session,
        ),
      );
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : "AI request failed.";
      setError(errorMessage);
    } finally {
      setIsSending(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  async function handleConfirmDraft(messageId: string, confirmed: boolean) {
    setSessions((current) =>
      updateSessionMessage(current, activeSessionId, messageId, (message) =>
        message.packageDraft ? { ...message, packageDraft: { ...message.packageDraft, confirmed, error: undefined } } : message,
      ),
    );
  }

  async function handleApplyDraft(messageId: string, packageDraft: PackageDraftPreviewState) {
    setSessions((current) =>
      updateSessionMessage(current, activeSessionId, messageId, (message) =>
        message.packageDraft ? { ...message, packageDraft: { ...message.packageDraft, applyStatus: "applying", error: undefined } } : message,
      ),
    );

    try {
      const response = await fetch("/api/ai/package-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          draft: packageDraft.draft,
          draftHash: packageDraft.draftHash,
          draftToken: packageDraft.draftToken,
          confirmation: { confirmed: packageDraft.confirmed },
          idempotencyKey: packageDraft.idempotencyKey,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as PackageBuilderApplyResponse;
      if (!response.ok || !payload.result) throw new Error(payload.error || "Package Apply failed.");
      setSessions((current) =>
        updateSessionMessage(current, activeSessionId, messageId, (message) =>
          message.packageDraft
            ? { ...message, packageDraft: { ...message.packageDraft, applyStatus: "applied", applyResult: payload.result, error: undefined } }
            : message,
        ),
      );
    } catch (applyError) {
      const errorMessage = applyError instanceof Error ? applyError.message : "Package Apply failed.";
      setSessions((current) =>
        updateSessionMessage(current, activeSessionId, messageId, (message) =>
          message.packageDraft ? { ...message, packageDraft: { ...message.packageDraft, applyStatus: "ready", error: errorMessage } } : message,
        ),
      );
    }
  }

  async function handleRejectDraft(messageId: string, packageDraft: PackageDraftPreviewState) {
    setSessions((current) =>
      updateSessionMessage(current, activeSessionId, messageId, (message) =>
        message.packageDraft
          ? {
              ...message,
              packageDraft: {
                ...message.packageDraft,
                confirmed: false,
                feedbackStatus: "rejecting",
                error: undefined,
              },
            }
          : message,
      ),
    );

    try {
      const response = await fetch("/api/ai/package-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "feedback",
          decision: "rejected",
          draft: packageDraft.draft,
          draftHash: packageDraft.draftHash,
          draftToken: packageDraft.draftToken,
          routeContext: getCurrentRouteContext(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as PackageBuilderFeedbackResponse;
      if (!response.ok || payload.decision !== "rejected") throw new Error(payload.error || "Package draft feedback failed.");
      setSessions((current) =>
        updateSessionMessage(current, activeSessionId, messageId, (message) =>
          message.packageDraft
            ? {
                ...message,
                content: "Draft rejected. Ask Flip will not apply this preview.",
                packageDraft: undefined,
              }
            : message,
        ),
      );
    } catch (feedbackError) {
      const errorMessage = feedbackError instanceof Error ? feedbackError.message : "Package draft feedback failed.";
      setSessions((current) =>
        updateSessionMessage(current, activeSessionId, messageId, (message) =>
          message.packageDraft
            ? {
                ...message,
                packageDraft: {
                  ...message.packageDraft,
                  feedbackStatus: undefined,
                  error: errorMessage,
                },
              }
            : message,
        ),
      );
    }
  }

  function handleNewSession() {
    const nextSession: ChatSession = {
      id: makeSessionId(),
      title: "New chat",
      messages: [],
    };
    setSessions((current) => [nextSession, ...current]);
    setActiveSessionId(nextSession.id);
    setInput("");
    setError(null);
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div data-ask-flip-root="true" className="relative flex shrink-0 items-center justify-end">
      {open ? (
        <section
          aria-label="Ask Flip"
          className="absolute right-0 bottom-[calc(100%+8px)] z-[80] grid h-[min(520px,calc(100dvh-112px))] w-[min(720px,calc(100vw-32px))] grid-cols-1 overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_18px_48px_rgba(17,24,39,0.18)] sm:grid-cols-[188px_minmax(0,1fr)]"
        >
          <aside className="flex min-h-0 flex-col border-b border-hairline bg-surfaceMuted/40 sm:border-r sm:border-b-0" aria-label="Ask Flip chat sessions">
            <div className="flex min-h-11 items-center justify-end border-b border-hairline px-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 rounded-xs text-tertiary hover:bg-white hover:text-ink"
                aria-label="Start new Ask Flip chat"
                onClick={handleNewSession}
              >
                <Plus size={13} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <div className="space-y-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      className={cn(
                        "flex w-full min-w-0 flex-col items-start rounded-xs border px-2 py-2 text-left transition",
                        isActive ? "border-ink bg-white text-ink" : "border-transparent bg-transparent text-tertiary hover:border-hairline hover:bg-white hover:text-ink",
                      )}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setError(null);
                        window.requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                    >
                      <span className="w-full truncate text-[10px] font-medium leading-4">{session.title}</span>
                      <span className="text-[9px] leading-3 text-tertiary">{getSessionMeta(session)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex min-h-11 items-center justify-between gap-2 border-b border-hairline px-3">
              <div className="min-w-0">
                <h3 className="truncate text-[11px] font-medium leading-4 text-ink">Ask Flip</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
                aria-label="Close Ask Flip"
                onClick={() => setOpen(false)}
              >
                <X size={13} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-surfaceMuted/35 p-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[86%] rounded-xs border px-2 py-1.5 text-[10px] font-medium leading-4",
                    message.role === "user"
                      ? "ml-auto border-ink bg-ink text-white"
                      : "border-hairline bg-white text-ink",
                  )}
                >
                  {message.content}
                  {message.packageDraft ? (
                    <PackageDraftPreview
                      state={message.packageDraft}
                      onConfirm={(confirmed) => handleConfirmDraft(message.id, confirmed)}
                      onApply={() => handleApplyDraft(message.id, message.packageDraft as PackageDraftPreviewState)}
                      onReject={() => handleRejectDraft(message.id, message.packageDraft as PackageDraftPreviewState)}
                    />
                  ) : null}
                </div>
              ))}
              {isSending ? (
                <div className="max-w-[86%] rounded-xs border border-hairline bg-white px-2 py-1.5 text-[10px] font-medium leading-4 text-tertiary">
                  Thinking...
                </div>
              ) : null}
            </div>
            {error ? (
              <div role="alert" className="border-t border-dangerSoft bg-dangerSoft px-3 py-2 text-[10px] font-medium leading-4 text-danger">
                {error}
              </div>
            ) : null}
            <form className="flex min-h-12 gap-2 border-t border-hairline bg-white p-2" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                aria-label="Ask Flip message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Flip"
                className="min-w-0 flex-1 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink outline-none transition placeholder:text-tertiary focus:border-accent"
                maxLength={8_000}
              />
              <Button
                type="submit"
                variant="primary"
                size="icon-sm"
                className="size-8 rounded-xs"
                aria-label="Send message"
                disabled={!input.trim() || isSending}
              >
                <PaperPlaneRight size={13} weight="regular" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </section>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="h-8 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink shadow-none hover:bg-surfaceMuted"
        aria-label="Open Ask Flip"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChatCircleDots size={13} weight="regular" aria-hidden="true" />
        <span>Ask Flip</span>
      </Button>
    </div>
  );
}

export function EstimateCopilotFloatingButton(props: EstimateCopilotFloatingButtonProps) {
  return <AskFlipFooterAssistant {...props} />;
}
