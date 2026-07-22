"use client";

import { useState, useTransition } from "react";

import { askAdminCopilot } from "@/lib/admin/copilot-action";
import { Button } from "@/components/ui/button";

// F10 Admin Copilot. When DEEPSEEK_API_KEY is configured this is a real,
// read-only, grounded assistant; otherwise it shows the activation gate.
export function AdminCopilot({ configured }: { configured: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask() {
    setNotice(null);
    setAnswer(null);
    startTransition(async () => {
      const result = await askAdminCopilot(question);
      if (!result.ok) {
        const messages: Record<string, string> = {
          not_configured: "AI provider is not configured (DEEPSEEK_API_KEY).",
          validation: "Question is empty or too long.",
          failed: "The AI request failed. Try again.",
        };
        setNotice(messages[result.error] ?? "Request failed.");
        return;
      }
      setAnswer(result.answer);
      setModel(result.model);
    });
  }

  if (!configured) {
    return (
      <p className="text-[10px] leading-4 text-tertiary">
        Not activated — <code className="font-mono">DEEPSEEK_API_KEY</code> is not configured. Set the
        key to enable this read-only, source-grounded copilot.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about open incidents, support load, signups, or what needs attention…"
          rows={2}
          maxLength={2000}
          className="w-full resize-y rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Copilot question"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[9px] leading-3 text-tertiary">{question.length}/2000 · read-only</span>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-9 w-full sm:w-auto"
            disabled={pending || question.trim().length === 0}
            onClick={ask}
          >
            {pending ? "Asking…" : "Ask copilot"}
          </Button>
        </div>
      </div>

      {notice && <p className="text-[9px] leading-3 text-tertiary">{notice}</p>}

      {answer && (
        <div className="rounded-xs border border-hairline bg-surfaceMuted/40 p-1.5">
          <p className="whitespace-pre-wrap break-words text-[10px] leading-4 text-ink">{answer}</p>
          {model && <p className="mt-1 text-[9px] leading-3 text-tertiary">via {model} · grounded in admin snapshot</p>}
        </div>
      )}
    </div>
  );
}
