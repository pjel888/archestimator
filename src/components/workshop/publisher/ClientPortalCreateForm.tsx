"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClientPortalDraftAction } from "@/lib/client-portal/composer-actions";

export function ClientPortalCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createPortal() {
    startTransition(async () => {
      try {
        const created = await createClientPortalDraftAction({ name, projectId });
        router.push(`/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(created.portalId)}?tab=content`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Client Portal could not be created.");
      }
    });
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) createPortal(); }}>
      <label className="grid gap-1 text-xs font-medium text-secondary">Portal name<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="Client Cost Review" className="w-56 rounded-md border border-hairline bg-white px-2 py-1.5 text-sm text-ink" /></label>
      <button type="submit" disabled={isPending || !name.trim()} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{isPending ? "Creating…" : "Create portal"}</button>
      {error ? <p role="alert" className="basis-full text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}
