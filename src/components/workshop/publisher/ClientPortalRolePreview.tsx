"use client";

import { useState, useTransition } from "react";

import { previewClientPortalAsRoleAction } from "@/lib/client-portal/preview-actions";
import { CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES, type ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";
import type { ClientPortalRolePreviewDto } from "@/lib/client-portal/preview-service";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Role preview could not be loaded.";
}

export function ClientPortalRolePreview({ portalId, projectId }: { portalId: string; projectId: string }) {
  const [role, setRole] = useState<ClientPortalRecipientRoleTemplate>("viewer");
  const [preview, setPreview] = useState<ClientPortalRolePreviewDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadPreview() {
    startTransition(async () => {
      try {
        const next = await previewClientPortalAsRoleAction({ portalId, projectId, role });
        setPreview(next);
        setMessage(next.issue ? `${next.issue.versionLabel} preview loaded.` : "Publish an issue to preview its recipient DTO.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  return <section className="rounded-xl border border-hairline bg-white p-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-ink">Preview as recipient role</p><p className="mt-1 text-xs text-secondary">Uses the same recipient policy and issued-section DTO rules as the public portal.</p></div><div className="flex items-center gap-2"><select aria-label="Recipient role preview" value={role} onChange={(event) => setRole(event.target.value as ClientPortalRecipientRoleTemplate)} className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm text-ink">{CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" onClick={loadPreview} disabled={isPending} className="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">Load preview</button></div></div>
    {message ? <p role="status" className="mt-3 text-sm text-secondary">{message}</p> : null}
    {preview?.issue ? <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><p className="font-medium text-ink">Visible sections</p><ul className="mt-1 space-y-1 text-secondary">{preview.sections.map((section) => <li key={section.id}>{section.title} <span className="text-xs">({section.kind.replaceAll("_", " ")})</span></li>)}{!preview.sections.length ? <li>No issued sections are visible to this role.</li> : null}</ul></div><div><p className="font-medium text-ink">Effective capabilities</p><p className="mt-1 text-xs text-secondary">{preview.capabilities.join(", ") || "None"}</p></div></div> : null}
  </section>;
}
