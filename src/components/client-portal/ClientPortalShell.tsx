"use client";

import { useEffect, useMemo, useState } from "react";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import { Button } from "@/components/ui/button";
import { EstimateBrowserSection } from "@/components/client-portal/EstimateBrowserSection";
import { createPublicationCsrfHeaders } from "@/lib/publication/client-csrf";

type ManifestSection = {
  id: string;
  kind: string;
  layoutMode: string;
  payloadHash: string;
  title: string;
};

type ClientPortalManifest = {
  brand: Record<string, unknown>;
  capabilities: string[];
  issue: {
    contentHash: string;
    id: string;
    number: number;
    status: string;
    validThrough: string | null;
    versionLabel: string;
  };
  portal: { id: string; name: string; status: string };
  project: { code: string | null; currencyCode: string; name: string };
  recipient: { displayName: string | null; role: string; verified: boolean } | null;
  schemaVersion: number;
  sections: ManifestSection[];
};

type ClientPortalSection = {
  section: {
    id: string;
    kind: string;
    layoutMode: string;
    payload: unknown;
    payloadHash: string;
    title: string;
  };
};

type AccessState = "loading" | "ready" | "password" | "unavailable";

function routePath(token: string, suffix = "") {
  return `/api/share/${encodeURIComponent(token)}${suffix}`;
}

function sectionLabel(section: ManifestSection) {
  return section.title.trim() || section.kind.replace(/_/g, " ");
}

function formattedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ClientPortalPayload({ payload }: { payload: unknown }) {
  if (!payload || typeof payload !== "object") return <p className="text-[12px] leading-5 text-secondary">No client-visible details were issued for this section.</p>;

  const entries = Object.entries(payload as Record<string, unknown>);
  if (entries.length === 0) return <p className="text-[12px] leading-5 text-secondary">No client-visible details were issued for this section.</p>;

  return (
    <dl className="grid gap-px overflow-hidden rounded-xs border border-hairline bg-hairline sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0 bg-white px-3 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-tertiary">{key.replace(/_/g, " ")}</dt>
          <dd className="mt-1 break-words text-[13px] leading-5 text-ink">
            {typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ClientPortalShell({ token, recipientToken }: { token: string; recipientToken?: string }) {
  const [access, setAccess] = useState<AccessState>("loading");
  const [manifest, setManifest] = useState<ClientPortalManifest | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [section, setSection] = useState<ClientPortalSection | null>(null);
  const [sectionState, setSectionState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (recipientToken) {
        await fetch(routePath(token, "/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...createPublicationCsrfHeaders() },
          body: JSON.stringify({ verificationToken: recipientToken }),
        });
        window.history.replaceState(null, "", `/share/${encodeURIComponent(token)}`);
      }

      const response = await fetch(routePath(token, "/manifest"), { cache: "no-store" }).catch(() => null);
      if (!active) return;
      if (response?.status === 423) {
        setAccess("password");
        return;
      }
      if (!response?.ok) {
        setAccess("unavailable");
        return;
      }
      const nextManifest = await response.json() as ClientPortalManifest;
      if (!active) return;
      setManifest(nextManifest);
      const requestedSectionId = window.location.hash.slice(1);
      setSelectedSectionId(nextManifest.sections.some((item) => item.id === requestedSectionId) ? requestedSectionId : nextManifest.sections[0]?.id ?? null);
      setAccess("ready");
    }

    void load();
    return () => { active = false; };
  }, [recipientToken, token]);

  useEffect(() => {
    function syncHash() {
      const nextSectionId = window.location.hash.slice(1);
      if (manifest?.sections.some((item) => item.id === nextSectionId)) setSelectedSectionId(nextSectionId);
    }
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [manifest]);

  useEffect(() => {
    if (!selectedSectionId || access !== "ready") return;
    let active = true;
    setSectionState("loading");
    void fetch(routePath(token, `/sections/${encodeURIComponent(selectedSectionId)}`), { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<ClientPortalSection> : null)
      .then((nextSection) => {
        if (!active) return;
        setSection(nextSection);
        setSectionState(nextSection ? "ready" : "unavailable");
      })
      .catch(() => {
        if (active) setSectionState("unavailable");
      });
    return () => { active = false; };
  }, [access, selectedSectionId, token]);

  const selectedSection = useMemo(() => manifest?.sections.find((item) => item.id === selectedSectionId) ?? null, [manifest, selectedSectionId]);

  function selectSection(sectionId: string) {
    setSelectedSectionId(sectionId);
    window.history.replaceState(null, "", `#${encodeURIComponent(sectionId)}`);
  }

  if (access === "loading") {
    return <main aria-busy="true" aria-label="Loading Client Portal" className="grid min-h-dvh place-items-center bg-canvas px-4 text-secondary">Loading Client Portal…</main>;
  }

  if (access === "password") {
    return (
      <main aria-label="Client Portal password" className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 text-ink">
        <section className="w-full max-w-md border border-hairline bg-white p-5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Client Portal</p>
          <h1 className="mt-2 text-[20px] font-medium tracking-tight">Enter portal password</h1>
          <p className="mt-2 text-[13px] leading-5 text-secondary">This issued portal is password protected.</p>
          <ProjectPublicationPasswordForm token={token} />
        </section>
      </main>
    );
  }

  if (access === "unavailable" || !manifest) {
    return <main aria-label="Client Portal unavailable" className="grid min-h-dvh place-items-center bg-canvas px-4 text-secondary">This Client Portal is unavailable.</main>;
  }

  const validThrough = formattedDate(manifest.issue.validThrough);

  return (
    <main aria-label="Client Portal" className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-hairline bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-tertiary">{manifest.portal.name}</p>
            <h1 className="truncate text-[16px] font-medium tracking-tight">{manifest.project.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="hidden text-[11px] leading-4 text-secondary sm:block">
              <p>{manifest.issue.versionLabel}</p>
              <p className="capitalize text-tertiary">{manifest.issue.status.replace(/_/g, " ")}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <nav aria-label="Portal sections" className="hidden border-r border-hairline bg-white p-3 lg:sticky lg:top-16 lg:block lg:h-[calc(100dvh-4rem)]">
          <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wide text-tertiary">Issued sections</p>
          <div className="grid gap-1">
            {manifest.sections.map((item) => (
              <Button key={item.id} variant={item.id === selectedSectionId ? "soft" : "ghost"} size="sm" className="justify-start !min-w-0" onClick={() => selectSection(item.id)}>
                {sectionLabel(item)}
              </Button>
            ))}
          </div>
        </nav>

        <section className="min-w-0 p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Portal sections">
            {manifest.sections.map((item) => (
              <Button key={item.id} variant={item.id === selectedSectionId ? "soft" : "secondary"} size="sm" onClick={() => selectSection(item.id)}>{sectionLabel(item)}</Button>
            ))}
          </div>
          <div id={selectedSection?.id} className="border border-hairline bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Issued section</p>
                <h2 className="mt-1 text-[20px] font-medium tracking-tight">{selectedSection ? sectionLabel(selectedSection) : "No section selected"}</h2>
              </div>
              <p className="text-[11px] text-tertiary">Issue {manifest.issue.number}</p>
            </div>
            {sectionState === "loading" ? <p aria-live="polite" className="text-[13px] text-secondary">Loading issued section…</p> : null}
            {sectionState === "unavailable" ? <p role="alert" className="text-[13px] text-secondary">This issued section is unavailable.</p> : null}
            {sectionState === "ready" && section ? section.section.kind === "estimate_browser" ? <EstimateBrowserSection payload={section.section.payload} /> : <ClientPortalPayload payload={section.section.payload} /> : null}
          </div>
        </section>

        <aside className="hidden border-l border-hairline bg-white p-4 xl:block">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Review context</p>
          <dl className="mt-3 grid gap-3 text-[12px]">
            <div><dt className="text-tertiary">Issue</dt><dd className="mt-1 text-ink">{manifest.issue.versionLabel}</dd></div>
            <div><dt className="text-tertiary">Currency</dt><dd className="mt-1 text-ink">{manifest.project.currencyCode}</dd></div>
            {validThrough ? <div><dt className="text-tertiary">Valid through</dt><dd className="mt-1 text-ink">{validThrough}</dd></div> : null}
            {manifest.recipient ? <div><dt className="text-tertiary">Viewing as</dt><dd className="mt-1 text-ink">{manifest.recipient.displayName ?? manifest.recipient.role}</dd></div> : null}
          </dl>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-hairline bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
        <Button size="sm" variant="ghost" className="!min-w-0" onClick={() => setContextOpen(true)}>Review context</Button>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>Print issue</Button>
      </div>
      {contextOpen ? (
        <div className="fixed inset-0 z-30 bg-black/30 p-4 lg:hidden" role="presentation" onMouseDown={() => setContextOpen(false)}>
          <aside aria-label="Review context" role="dialog" aria-modal="true" className="ml-auto flex h-full w-full max-w-sm flex-col bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
              <h2 className="text-[16px] font-medium tracking-tight">Review context</h2>
              <Button size="sm" variant="ghost" onClick={() => setContextOpen(false)}>Close</Button>
            </div>
            <dl className="mt-5 grid gap-4 text-[13px]">
              <div><dt className="text-tertiary">Issue</dt><dd className="mt-1 text-ink">{manifest.issue.versionLabel}</dd></div>
              <div><dt className="text-tertiary">Status</dt><dd className="mt-1 capitalize text-ink">{manifest.issue.status.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-tertiary">Currency</dt><dd className="mt-1 text-ink">{manifest.project.currencyCode}</dd></div>
              {validThrough ? <div><dt className="text-tertiary">Valid through</dt><dd className="mt-1 text-ink">{validThrough}</dd></div> : null}
              {manifest.recipient ? <div><dt className="text-tertiary">Viewing as</dt><dd className="mt-1 text-ink">{manifest.recipient.displayName ?? manifest.recipient.role}</dd></div> : null}
            </dl>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
