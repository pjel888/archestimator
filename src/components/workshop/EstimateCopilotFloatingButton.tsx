"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
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
  mode?: "draft" | "apply";
  draft?: PackageBuilderDraft;
  draftHash?: string;
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

type PackageDraftPreviewState = {
  draft: PackageBuilderDraft;
  draftHash: string;
  idempotencyKey: string;
  confirmed: boolean;
  applyStatus: "ready" | "applying" | "applied";
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

function shouldUsePackageBuilder(prompt: string) {
  const normalized = prompt.toLowerCase();
  return (
    /\b(assemble|build|create|generate|draft)\b/.test(normalized)
    && /\b(package|estimate|budget|bedroom|bedrooms)\b/.test(normalized)
  );
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
}: {
  state: PackageDraftPreviewState;
  onConfirm: (confirmed: boolean) => void;
  onApply: () => void;
}) {
  const { draft } = state;
  const allowanceRows = draft.rowDraft.filter((row) => row.sourceType === "allowance");
  const linkedRows = draft.rowDraft.filter((row) => row.sourceType === "library_item");
  const canApply = draft.applyEligibility.eligible && state.confirmed && state.applyStatus !== "applying" && state.applyStatus !== "applied";

  return (
    <div className="mt-2 w-full max-w-full rounded-xs border border-hairline bg-white text-ink">
      <div className="border-b border-hairline px-2 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium leading-4 text-ink">{draft.projectDraft.name}</p>
            <p className="text-[9px] leading-3 text-tertiary">
              {countTreeAreas(draft)} areas · {draft.rowDraft.length} rows · {formatPeso(draft.budgetSummary.draftTotal, draft.budgetSummary.currencyCode)}
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
                <span className="text-tertiary">{node.kind === "group" ? "Group" : "Area"}</span>
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
        {state.error ? <p role="alert" className="mt-2 text-[10px] font-medium leading-4 text-danger">{state.error}</p> : null}
        {state.applyResult ? (
          <p className="mt-2 text-[10px] font-medium leading-4 text-success">
            Applied project {state.applyResult.projectId.slice(0, 8)} · {state.applyResult.insertedRowIds.length} rows
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-2 py-2">
        <label className="flex min-w-0 items-center gap-2 text-[10px] font-medium leading-4 text-ink">
          <input
            type="checkbox"
            className="size-3 rounded-xs border-hairline"
            checked={state.confirmed}
            disabled={state.applyStatus === "applying" || state.applyStatus === "applied"}
            onChange={(event) => onConfirm(event.target.checked)}
          />
          <span className="min-w-0">I reviewed this draft and approve Apply</span>
        </label>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="h-7 rounded-xs px-2 text-[10px]"
          disabled={!canApply}
          onClick={onApply}
        >
          {state.applyStatus === "applying" ? "Applying" : state.applyStatus === "applied" ? "Applied" : "Apply package"}
        </Button>
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

  const routeContext = useMemo(
    () => ({
      projectName,
      estimateName,
      selectedNodeName: selectedNodeName ?? undefined,
    }),
    [estimateName, projectName, selectedNodeName],
  );

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
      const usePackageBuilder = shouldUsePackageBuilder(prompt);
      const response = await fetch(usePackageBuilder ? "/api/ai/package-builder" : "/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usePackageBuilder ? { mode: "draft", message: prompt, routeContext } : { message: prompt, routeContext }),
      });
      const payload = (await response.json().catch(() => ({}))) as AiAskResponse;
      if (!response.ok) throw new Error(payload.error || "AI request failed.");
      const assistantMessageId = makeMessageId();
      const assistantMessage = payload.draft
        ? "I drafted a package for review."
        : payload.message?.trim() || "I could not produce a useful answer.";
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: assistantMessage,
                    packageDraft: payload.draft && payload.draftHash
                      ? {
                          draft: payload.draft,
                          draftHash: payload.draftHash,
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
          role="region"
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
