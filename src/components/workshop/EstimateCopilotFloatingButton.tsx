"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { ChatCircleDots, PaperPlaneRight, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type EstimateCopilotFloatingButtonProps = {
  projectName?: string;
  estimateName?: string;
  selectedNodeName?: string | null;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AiAskResponse = {
  message?: string;
  error?: string;
};

function makeMessageId() {
  return `ai-message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function EstimateCopilotFloatingButton({
  projectName,
  estimateName,
  selectedNodeName,
}: EstimateCopilotFloatingButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-assistant-message",
      role: "assistant",
      content: "Ask me about Archestimator or the page you are viewing. This first version cannot create, edit, or apply changes.",
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, routeContext }),
      });
      const payload = (await response.json().catch(() => ({}))) as AiAskResponse;
      if (!response.ok) throw new Error(payload.error || "AI request failed.");
      const assistantMessage = payload.message?.trim() || "I could not produce a useful answer.";
      setMessages((current) => [...current, { id: makeMessageId(), role: "assistant", content: assistantMessage }]);
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : "AI request failed.";
      setError(errorMessage);
    } finally {
      setIsSending(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div data-estimate-copilot-root="true" className="fixed right-4 bottom-4 z-[900] flex flex-col items-end gap-2">
      {open ? (
        <section
          role="region"
          aria-label="Estimate Copilot"
          className="flex h-[min(520px,calc(100dvh-96px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-xs border border-hairline bg-white shadow-[0_18px_48px_rgba(17,24,39,0.18)]"
        >
          <div className="flex min-h-11 items-center justify-between gap-2 border-b border-hairline px-3">
            <div className="min-w-0">
              <h2 className="truncate text-[11px] font-medium leading-4 text-ink">Estimate Copilot</h2>
              <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Ask only</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
              aria-label="Close Estimate Copilot"
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
              placeholder="Ask about this estimate..."
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
        </section>
      ) : null}
      <Button
        type="button"
        variant="primary"
        className="grid size-14 place-items-center rounded-xs p-0 shadow-[0_14px_34px_rgba(17,24,39,0.28)]"
        aria-label="Open Estimate Copilot"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChatCircleDots size={23} weight="regular" aria-hidden="true" />
      </Button>
    </div>
  );
}
