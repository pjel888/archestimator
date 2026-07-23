"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createSavedReplyAction,
  deleteSavedReplyAction,
} from "@/lib/admin/saved-replies-actions";
import type { AdminSavedReplyRow } from "@/lib/admin/saved-replies-repository";
import { Button } from "@/components/ui/button";

// F4 Saved replies: list + create + delete.
export function AdminSavedReplies({ initialReplies }: { initialReplies: AdminSavedReplyRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function create() {
    setNotice(null);
    startTransition(async () => {
      const result = await createSavedReplyAction({ label, body });
      if (!result.ok) {
        setNotice("Could not save reply.");
        return;
      }
      setLabel("");
      setBody("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteSavedReplyAction(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-xs border border-hairline p-1.5">
        <p className="text-[10px] font-medium leading-4 text-ink">New saved reply</p>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Reset password steps)"
          maxLength={120}
          className="w-full rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Label"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply body…"
          rows={3}
          maxLength={2000}
          className="w-full resize-y rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Reply body"
        />
        <div className="flex items-center justify-between">
          {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled={pending || label.trim().length === 0 || body.trim().length === 0}
            onClick={create}
          >
            {pending ? "Saving…" : "Save reply"}
          </Button>
        </div>
      </div>

      {initialReplies.length === 0 ? (
        <p className="text-[10px] leading-4 text-tertiary">No saved replies yet.</p>
      ) : (
        <ul className="space-y-1" aria-label="Saved replies">
          {initialReplies.map((reply) => (
            <li key={reply.id} className="rounded-xs border border-hairline p-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[10px] font-medium leading-4 text-ink text-pretty">{reply.label}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(reply.id)}
                  className="min-h-8 shrink-0 cursor-pointer rounded-xs px-2 text-[9px] font-medium leading-3 text-tertiary transition hover:bg-surfaceMuted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-7"
                  aria-label={`Delete ${reply.label}`}
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[9px] leading-3 text-secondary">
                {reply.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
