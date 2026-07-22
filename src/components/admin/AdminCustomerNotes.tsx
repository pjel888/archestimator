"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { addCustomerNoteAction } from "@/lib/admin/customer-notes-actions";
import type { AdminCustomerNoteRow, CustomerNoteTargetKind } from "@/lib/admin/customer-notes-repository";
import { formatAdminDateTime } from "@/lib/admin/datetime";
import { Button } from "@/components/ui/button";

// F3 founder notes for a customer (user or account). List is server-rendered
// into this client component as initial state; adding a note refreshes the route.
export function AdminCustomerNotes({
  targetKind,
  targetId,
  initialNotes,
}: {
  targetKind: CustomerNoteTargetKind;
  targetId: string;
  initialNotes: AdminCustomerNoteRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setNotice(null);
    startTransition(async () => {
      const result = await addCustomerNoteAction(targetKind, targetId, body);
      if (!result.ok) {
        setNotice("Could not save note.");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note about this customer (visible to admins only)…"
          maxLength={2000}
          rows={2}
          className="w-full resize-y rounded-xs border border-hairline bg-white p-1.5 text-[10px] leading-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Note body"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] leading-3 text-tertiary">{body.length}/2000</span>
          <Button size="sm" variant="secondary" disabled={pending || body.trim().length === 0} onClick={submit}>
            {pending ? "Saving…" : "Add note"}
          </Button>
        </div>
      </div>

      {notice && <p className="text-[9px] leading-3 text-tertiary">{notice}</p>}

      {initialNotes.length === 0 ? (
        <p className="text-[10px] leading-4 text-tertiary">No notes yet.</p>
      ) : (
        <ul className="space-y-1" aria-label="Customer notes">
          {initialNotes.map((note) => (
            <li key={note.id} className="rounded-xs border border-hairline p-1.5">
              <p className="whitespace-pre-wrap break-words text-[10px] leading-4 text-ink">{note.body}</p>
              <p className="mt-1 text-[9px] leading-3 text-tertiary">
                {note.created_by_email ?? note.created_by.slice(0, 8)} ·{" "}
                {formatAdminDateTime(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
