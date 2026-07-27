"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { ArtifactViewer } from "@/components/client-portal/ArtifactViewer";
import { ClientPortalActivitySection } from "@/components/client-portal/ClientPortalActivitySection";
import { ClientPortalDecisionSection } from "@/components/client-portal/ClientPortalDecisionSection";
import { ClientPortalDiscussionSection } from "@/components/client-portal/ClientPortalDiscussionSection";
import { ClientPortalFinancialSection } from "@/components/client-portal/ClientPortalFinancialSection";
import { ClientPortalRequestSection } from "@/components/client-portal/ClientPortalRequestSection";
import { ClientPortalTimeline } from "@/components/client-portal/ClientPortalTimeline";
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
  package?: {
    artifacts: Array<{
      contentType: string;
      description: string | null;
      downloadable: boolean;
      id: string;
      sizeBytes: number;
      title: string;
    }>;
  };
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

type ClientPortalSummary = {
  activeBaseline: {
    baselineNumber: number;
    currencyCode: string;
    establishedAt: string;
    issueNumber: number;
    totalMinorUnits: number;
    versionLabel: string;
  } | null;
  capabilities: string[];
  pendingIssue: {
    currencyCode: string;
    issueNumber: number;
    issuedAt: string;
    status: string;
    total: number;
    versionLabel: string;
  } | null;
  portal: { name: string; status: string };
  project: { code: string | null; currencyCode: string; name: string };
  recipient: { displayName: string | null; role: string } | null;
  schemaVersion: number;
  visibleCounts: { artifacts: number; issues: number; openRequests: number; timelineEvents: number };
};

type AccessState = "loading" | "ready" | "password" | "unavailable";
type PortalView = "timeline" | "overview" | "estimate" | "financials" | "documents" | "requests" | "discussion" | "decision";
type DiscussionTarget = { kind: "estimate" | "estimate_tab" | "area_group" | "row" | "component"; publicId: string; label: string; secondaryLabel: string | null; sectionId: string };

const PORTAL_VIEW_LABELS: Record<PortalView, string> = {
  timeline: "Timeline",
  overview: "Overview",
  estimate: "Estimate",
  financials: "Financials",
  documents: "Documents",
  requests: "Requests",
  discussion: "Discussion",
  decision: "Decision",
};

type PortalHashTarget =
  | { id: string; kind: "artifact" | "decision" | "request" | "section" | "thread" }
  | { kind: "view"; view: PortalView }
  | null;

function portalHashTarget(hash: string): PortalHashTarget {
  const value = hash.replace(/^#/, "");
  if (!value) return null;
  const [prefix, ...rest] = value.split("/");
  if ((prefix === "artifact" || prefix === "decision" || prefix === "request" || prefix === "thread") && rest.length > 0) {
    try {
      const id = decodeURIComponent(rest.join("/")).trim();
      return id ? { id, kind: prefix } : null;
    } catch {
      return null;
    }
  }
  if (Object.hasOwn(PORTAL_VIEW_LABELS, value)) return { kind: "view", view: value as PortalView };
  try {
    const id = decodeURIComponent(value).trim();
    return id ? { id, kind: "section" } : null;
  } catch {
    return null;
  }
}

function routePath(token: string, suffix = "") {
  return `/api/share/${encodeURIComponent(token)}${suffix}`;
}

function issuedRoutePath(token: string, suffix: string, issueNumber?: number) {
  const path = routePath(token, suffix);
  return issueNumber ? `${path}${path.includes("?") ? "&" : "?"}issue=${issueNumber}` : path;
}

function artifactContentPath(token: string, publicArtifactId: string, issueNumber?: number, download = false) {
  const path = issuedRoutePath(token, `/artifacts/${encodeURIComponent(publicArtifactId)}`, issueNumber);
  return download ? `${path}${path.includes("?") ? "&" : "?"}download=1` : path;
}

function fileSizeLabel(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sectionLabel(section: ManifestSection) {
  return section.title.trim() || section.kind.replace(/_/g, " ");
}

function isFinancialSection(kind: string): kind is "financial_summary" | "cost_breakdown" | "estimate_comparison" {
  return kind === "financial_summary" || kind === "cost_breakdown" || kind === "estimate_comparison";
}

function portalViewForSection(kind: string): PortalView {
  if (kind === "estimate_browser") return "estimate";
  if (isFinancialSection(kind)) return "financials";
  if (kind === "discussion") return "discussion";
  if (kind === "decision") return "decision";
  return "overview";
}

function formattedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function issuedBrandAssetId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const asset = value as Record<string, unknown>;
  return typeof asset.id === "string" && asset.id.startsWith("asset_") && typeof asset.width === "number" && asset.width > 0 && typeof asset.height === "number" && asset.height > 0 ? { height: asset.height, id: asset.id, width: asset.width } : null;
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

function ClientPortalPasswordForm({ onUnlocked, token }: { onUnlocked: () => void; token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const response = await fetch(routePath(token, "/password"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...createPublicationCsrfHeaders() },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setSubmitting(false);
    if (response?.status === 204) {
      onUnlocked();
      return;
    }
    const body = await response?.json().catch(() => null) as { error?: unknown } | null;
    setError(typeof body?.error === "string" ? body.error : "Unable to unlock this Client Portal.");
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={submit}>
      <label className="block text-[12px] font-medium text-secondary" htmlFor="client-portal-password">Portal password</label>
      <input
        id="client-portal-password"
        autoComplete="current-password"
        className="w-full rounded-md border border-hairline bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ink"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />
      {error ? <p className="text-[12px] text-destructive" role="alert">{error}</p> : null}
      <Button disabled={submitting} type="submit">{submitting ? "Unlocking…" : "Unlock portal"}</Button>
    </form>
  );
}

export function ClientPortalShell({ initialIssueNumber, token, recipientToken }: { initialIssueNumber?: number; token: string; recipientToken?: string }) {
  const [access, setAccess] = useState<AccessState>("loading");
  const [manifest, setManifest] = useState<ClientPortalManifest | null>(null);
  const [summary, setSummary] = useState<ClientPortalSummary | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [section, setSection] = useState<ClientPortalSection | null>(null);
  const [sectionState, setSectionState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [contextOpen, setContextOpen] = useState(false);
  const [discussionTarget, setDiscussionTarget] = useState<DiscussionTarget | null>(null);
  const [unlockVersion, setUnlockVersion] = useState(0);
  const [selectedViewOverride, setSelectedViewOverride] = useState<PortalView | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (recipientToken) {
        const verificationResponse = await fetch(routePath(token, "/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...createPublicationCsrfHeaders() },
          body: JSON.stringify({ verificationToken: recipientToken }),
        }).catch(() => null);
        if (!active) return;
        if (verificationResponse?.status === 423) {
          setAccess("password");
          return;
        }
        if (!verificationResponse?.ok) {
          setAccess("unavailable");
          return;
        }
        window.history.replaceState(null, "", `/share/${encodeURIComponent(token)}${initialIssueNumber ? `?issue=${initialIssueNumber}` : ""}${window.location.hash}`);
      }

      const [summaryResponse, manifestResponse] = await Promise.all([
        fetch(routePath(token, "/summary"), { cache: "no-store" }).catch(() => null),
        fetch(issuedRoutePath(token, "/manifest", initialIssueNumber), { cache: "no-store" }).catch(() => null),
      ]);
      if (!active) return;
      if (summaryResponse?.status === 423 || manifestResponse?.status === 423) {
        setAccess("password");
        return;
      }
      if (!summaryResponse?.ok) {
        setAccess("unavailable");
        return;
      }
      const nextSummary = await summaryResponse.json() as ClientPortalSummary;
      const nextManifest = manifestResponse?.ok ? await manifestResponse.json() as ClientPortalManifest : null;
      if (!active) return;
      setSummary(nextSummary);
      setManifest(nextManifest);
      const requestedTarget = portalHashTarget(window.location.hash);
      const requestedView = requestedTarget?.kind === "view" ? requestedTarget.view : null;
      const requestedArtifactId = requestedTarget?.kind === "artifact" && nextManifest?.package?.artifacts.some((artifact) => artifact.id === requestedTarget.id) ? requestedTarget.id : null;
      const requestedRequestId = requestedTarget?.kind === "request" ? requestedTarget.id : null;
      const requestedThreadId = requestedTarget?.kind === "thread" && nextSummary.capabilities.includes("thread:view") ? requestedTarget.id : null;
      const requestedDecisionId = requestedTarget?.kind === "decision" && nextSummary.capabilities.includes("decision:view") ? requestedTarget.id : null;
      setSelectedArtifactId(requestedArtifactId);
      setSelectedRequestId(requestedRequestId);
      setSelectedThreadId(requestedThreadId);
      setSelectedDecisionId(requestedDecisionId);
      setSelectedViewOverride(requestedArtifactId
        ? "documents"
        : requestedRequestId
          ? "requests"
          : requestedThreadId
            ? "discussion"
            : requestedDecisionId
              ? "decision"
              : requestedView === "timeline" || requestedView === "requests" || requestedView === "documents" || (!requestedTarget && nextSummary.capabilities.includes("timeline:view"))
                ? requestedView ?? "timeline"
                : null);
      setSelectedSectionId(
        nextManifest?.sections.find((item) => requestedTarget?.kind === "section" && item.id === requestedTarget.id)?.id
        ?? nextManifest?.sections.find((item) => requestedThreadId && item.kind === "discussion")?.id
        ?? nextManifest?.sections.find((item) => requestedDecisionId && item.kind === "decision")?.id
        ?? nextManifest?.sections.find((item) => requestedView && portalViewForSection(item.kind) === requestedView)?.id
        ?? nextManifest?.sections[0]?.id
        ?? null,
      );
      setAccess("ready");
    }

    void load();
    return () => { active = false; };
  }, [initialIssueNumber, recipientToken, token, unlockVersion]);

  useEffect(() => {
    function syncHash() {
      const target = portalHashTarget(window.location.hash);
      if (target?.kind === "artifact" && manifest?.package?.artifacts.some((artifact) => artifact.id === target.id)) {
        setSelectedArtifactId(target.id);
        setSelectedViewOverride("documents");
        return;
      }
      if (target?.kind === "request" && (summary?.capabilities.includes("request:view") || summary?.capabilities.includes("request:create"))) {
        setSelectedRequestId(target.id);
        setSelectedViewOverride("requests");
        return;
      }
      if (target?.kind === "thread" && summary?.capabilities.includes("thread:view")) {
        const discussionSection = manifest?.sections.find((item) => item.kind === "discussion");
        if (discussionSection) {
          setSelectedThreadId(target.id);
          setSelectedDecisionId(null);
          setSelectedViewOverride("discussion");
          setSelectedSectionId(discussionSection.id);
        }
        return;
      }
      if (target?.kind === "decision" && summary?.capabilities.includes("decision:view")) {
        const decisionSection = manifest?.sections.find((item) => item.kind === "decision");
        if (decisionSection) {
          setSelectedDecisionId(target.id);
          setSelectedThreadId(null);
          setSelectedViewOverride("decision");
          setSelectedSectionId(decisionSection.id);
        }
        return;
      }
      if (target?.kind === "view" && target.view === "timeline" && summary?.capabilities.includes("timeline:view")) {
        setSelectedViewOverride("timeline");
        return;
      }
      if (target?.kind === "view" && target.view === "requests" && (summary?.capabilities.includes("request:view") || summary?.capabilities.includes("request:create"))) {
        setSelectedRequestId(null);
        setSelectedViewOverride("requests");
        return;
      }
      if (target?.kind === "view" && target.view === "documents" && manifest?.package?.artifacts.length) {
        setSelectedArtifactId((current) => current ?? manifest.package!.artifacts[0]?.id ?? null);
        setSelectedViewOverride("documents");
        return;
      }
      const requestedView = target?.kind === "view" ? target.view : null;
      const requestedViewSection = requestedView ? manifest?.sections.find((item) => portalViewForSection(item.kind) === requestedView) : null;
      if (requestedViewSection) {
        setSelectedViewOverride(null);
        setSelectedSectionId(requestedViewSection.id);
        return;
      }
      if (target?.kind === "section" && manifest?.sections.some((item) => item.id === target.id)) {
        setSelectedViewOverride(null);
        setSelectedSectionId(target.id);
      }
    }
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [manifest, summary]);

  useEffect(() => {
    if (!selectedSectionId || access !== "ready") return;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setSectionState("loading");
        return fetch(issuedRoutePath(token, `/sections/${encodeURIComponent(selectedSectionId)}`, initialIssueNumber), { cache: "no-store" });
      })
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
  }, [access, initialIssueNumber, selectedSectionId, token]);

  const selectedSection = useMemo(() => manifest?.sections.find((item) => item.id === selectedSectionId) ?? null, [manifest, selectedSectionId]);
  const availableViews = useMemo(() => {
    if (!summary) return [];
    const views = new Set<PortalView>(manifest?.sections.map((item) => portalViewForSection(item.kind)) ?? []);
    if (manifest?.package?.artifacts.length) views.add("documents");
    if (summary.capabilities.includes("request:view") || summary.capabilities.includes("request:create")) views.add("requests");
    if (summary.capabilities.includes("timeline:view")) views.add("timeline");
    return (["timeline", "overview", "estimate", "financials", "documents", "requests", "discussion", "decision"] as const).filter((view) => views.has(view));
  }, [manifest, summary]);
  const selectedView = selectedViewOverride ?? (selectedSection ? portalViewForSection(selectedSection.kind) : availableViews[0] ?? "overview");
  const sectionsInSelectedView = manifest?.sections.filter((item) => portalViewForSection(item.kind) === selectedView) ?? [];
  const selectedArtifact = manifest?.package?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? manifest?.package?.artifacts[0] ?? null;

  function selectSection(sectionId: string) {
    setSelectedThreadId(null);
    setSelectedDecisionId(null);
    setSelectedViewOverride(null);
    setSelectedSectionId(sectionId);
    window.history.replaceState(null, "", `#${encodeURIComponent(sectionId)}`);
  }

  function selectView(view: PortalView) {
    setSelectedThreadId(null);
    setSelectedDecisionId(null);
    if (view === "timeline") {
      setSelectedViewOverride("timeline");
      window.history.replaceState(null, "", "#timeline");
      return;
    }
    if (view === "requests") {
      setSelectedRequestId(null);
      setSelectedViewOverride("requests");
      window.history.replaceState(null, "", "#requests");
      return;
    }
    if (view === "documents") {
      const artifact = selectedArtifact ?? manifest?.package?.artifacts[0] ?? null;
      setSelectedArtifactId(artifact?.id ?? null);
      setSelectedViewOverride("documents");
      window.history.replaceState(null, "", artifact ? `#artifact/${encodeURIComponent(artifact.id)}` : "#documents");
      return;
    }
    const nextSection = manifest?.sections.find((item) => portalViewForSection(item.kind) === view);
    if (nextSection) selectSection(nextSection.id);
  }

  function discussEstimateTarget(target: Omit<DiscussionTarget, "sectionId">, sectionId: string) {
    setDiscussionTarget({ ...target, sectionId });
    selectView("discussion");
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
          <ClientPortalPasswordForm onUnlocked={() => { setAccess("loading"); setUnlockVersion((version) => version + 1); }} token={token} />
        </section>
      </main>
    );
  }

  if (access === "unavailable" || !summary) {
    return <main aria-label="Client Portal unavailable" className="grid min-h-dvh place-items-center bg-canvas px-4 text-secondary">This Client Portal is unavailable.</main>;
  }

  const validThrough = formattedDate(manifest?.issue.validThrough ?? null);
  const brand = manifest?.brand ?? {};
  const brandTheme = brand.theme && typeof brand.theme === "object" && !Array.isArray(brand.theme) ? brand.theme as Record<string, unknown> : null;
  const accentColor = typeof brandTheme?.accentColor === "string" ? brandTheme.accentColor : "#1E40AF";
  const backgroundColor = typeof brandTheme?.backgroundColor === "string" ? brandTheme.backgroundColor : "#FFFFFF";
  const textColor = typeof brandTheme?.textColor === "string" ? brandTheme.textColor : "#111827";
  const owner = brand.owner && typeof brand.owner === "object" && !Array.isArray(brand.owner) ? brand.owner as Record<string, unknown> : null;
  const client = brand.client && typeof brand.client === "object" && !Array.isArray(brand.client) ? brand.client as Record<string, unknown> : null;
  const ownerLogoId = issuedBrandAssetId(owner?.logo);
  const clientLogoId = issuedBrandAssetId(client?.logo);
  const coBrandingMode = brand.coBrandingMode === "client_only" || brand.coBrandingMode === "co_branded" || brand.coBrandingMode === "owner_only" || brand.coBrandingMode === "prepared_by_for" ? brand.coBrandingMode : "prepared_by_for";
  const logos = coBrandingMode === "client_only" ? [{ asset: clientLogoId, label: "Client logo" }, { asset: ownerLogoId, label: "Prepared by logo" }] : [{ asset: ownerLogoId, label: "Owner logo" }, { asset: clientLogoId, label: "Client logo" }];

  return (
    <main aria-label="Client Portal" className="min-h-dvh bg-canvas text-ink" style={{ backgroundColor, color: textColor }}>
      <header className="sticky top-0 z-20 border-b border-hairline bg-white/95 backdrop-blur" style={{ borderTopColor: accentColor, borderTopWidth: 3 }}>
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {logos.filter((logo): logo is { asset: { height: number; id: string; width: number }; label: string } => Boolean(logo.asset)).map((logo, index) => (
              <div key={logo.asset.id} className={`flex items-center gap-3 ${coBrandingMode === "co_branded" && index > 0 ? "border-l border-hairline pl-3" : ""}`}>
                <Image unoptimized src={routePath(token, `/assets/${encodeURIComponent(logo.asset.id)}`)} alt={logo.label} width={logo.asset.width} height={logo.asset.height} className="h-8 w-auto max-w-28 object-contain" />
              </div>
            ))}
            <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-tertiary">{summary.portal.name}</p>
            <h1 className="truncate text-[16px] font-medium tracking-tight">{summary.project.name}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-right">
            <div className="hidden text-[11px] leading-4 text-secondary sm:block">
              <p>{summary.pendingIssue?.versionLabel ?? summary.activeBaseline?.versionLabel ?? "Commitment timeline"}</p>
              <p className="capitalize text-tertiary">{summary.pendingIssue?.status.replace(/_/g, " ") ?? "Current agreement"}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </header>

      <nav aria-label="Client presentation views" className="share-print-hidden sticky top-16 z-10 border-b border-hairline bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div role="tablist" className="flex gap-0 overflow-x-auto">
          {availableViews.map((view) => <button key={view} type="button" role="tab" aria-selected={selectedView === view} className={`cursor-pointer shrink-0 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${selectedView === view ? "border-accent text-ink" : "border-transparent text-secondary hover:border-hairline hover:text-ink"}`} onClick={() => selectView(view)}>{PORTAL_VIEW_LABELS[view]}</button>)}
        </div>
      </nav>

      <div className="grid gap-0 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <nav aria-label={`${PORTAL_VIEW_LABELS[selectedView]} sections`} className="hidden border-r border-hairline bg-white p-3 lg:sticky lg:top-[7.1rem] lg:block lg:h-[calc(100dvh-7.1rem)]">
          <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wide text-tertiary">{PORTAL_VIEW_LABELS[selectedView]} views</p>
          <div className="grid gap-1">
            {selectedView === "documents" ? manifest?.package?.artifacts.map((artifact) => (
              <Button key={artifact.id} variant={artifact.id === selectedArtifact?.id ? "soft" : "ghost"} size="sm" className="justify-start !min-w-0" onClick={() => { setSelectedArtifactId(artifact.id); window.history.replaceState(null, "", `#artifact/${encodeURIComponent(artifact.id)}`); }}>
                {artifact.title}
              </Button>
            )) : sectionsInSelectedView.map((item) => (
              <Button key={item.id} variant={item.id === selectedSectionId ? "soft" : "ghost"} size="sm" className="justify-start !min-w-0" onClick={() => selectSection(item.id)}>
                {sectionLabel(item)}
              </Button>
            ))}
          </div>
        </nav>

        <section className="min-w-0 p-4 pb-20 sm:p-6 sm:pb-20 lg:p-8">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label={`${PORTAL_VIEW_LABELS[selectedView]} sections`}>
            {selectedView === "documents" && (manifest?.package?.artifacts.length ?? 0) > 1 ? manifest?.package?.artifacts.map((artifact) => (
              <Button key={artifact.id} variant={artifact.id === selectedArtifact?.id ? "soft" : "secondary"} size="sm" onClick={() => { setSelectedArtifactId(artifact.id); window.history.replaceState(null, "", `#artifact/${encodeURIComponent(artifact.id)}`); }}>{artifact.title}</Button>
            )) : sectionsInSelectedView.length > 1 ? sectionsInSelectedView.map((item) => (
              <Button key={item.id} variant={item.id === selectedSectionId ? "soft" : "secondary"} size="sm" onClick={() => selectSection(item.id)}>{sectionLabel(item)}</Button>
            )) : null}
          </div>
          <div id={selectedView === "requests" || selectedView === "timeline" || selectedView === "documents" ? selectedView : selectedSection?.id} className="border border-hairline bg-white p-4 shadow-sm sm:p-6">
            {selectedView === "timeline" ? <ClientPortalTimeline issueNumber={manifest?.issue.number ?? initialIssueNumber ?? summary.pendingIssue?.issueNumber} token={token} /> : selectedView === "requests" ? <ClientPortalRequestSection capabilities={summary.capabilities} initialRequestId={selectedRequestId} token={token} /> : selectedView === "documents" ? selectedArtifact ? <ArtifactViewer contentUrl={artifactContentPath(token, selectedArtifact.id, manifest?.issue.number ?? initialIssueNumber)} downloadUrl={selectedArtifact.downloadable ? artifactContentPath(token, selectedArtifact.id, manifest?.issue.number ?? initialIssueNumber, true) : null} fileName={`${selectedArtifact.title}.pdf`} sizeLabel={fileSizeLabel(selectedArtifact.sizeBytes)} title={selectedArtifact.title} /> : <p className="text-[13px] text-secondary">No issued documents are available.</p> : <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Issued section</p>
                <h2 className="mt-1 text-[20px] font-medium tracking-tight">{selectedSection ? sectionLabel(selectedSection) : "No section selected"}</h2>
              </div>
              {manifest ? <p className="text-[11px] text-tertiary">Issue {manifest.issue.number}</p> : null}
            </div>
            {sectionState === "loading" ? <p aria-live="polite" className="text-[13px] text-secondary">Loading issued section…</p> : null}
            {sectionState === "unavailable" ? <p role="alert" className="text-[13px] text-secondary">This issued section is unavailable.</p> : null}
            {sectionState === "ready" && section && manifest ? section.section.kind === "estimate_browser"
              ? <EstimateBrowserSection payload={section.section.payload} sectionId={section.section.id} token={token} onDiscussTarget={summary.capabilities.includes("thread:create") && manifest.sections.some((item) => item.kind === "discussion") ? (target) => discussEstimateTarget(target, section.section.id) : undefined} />
              : isFinancialSection(section.section.kind)
                ? <ClientPortalFinancialSection kind={section.section.kind} payload={section.section.payload} />
                : section.section.kind === "discussion"
                  ? <ClientPortalDiscussionSection capabilities={summary.capabilities} composeTarget={discussionTarget} initialThreadId={selectedThreadId} issueId={manifest.issue.id} projectName={summary.project.name} sectionId={section.section.id} token={token} />
                  : section.section.kind === "activity"
                    ? <ClientPortalActivitySection payload={section.section.payload} sectionId={section.section.id} token={token} />
                    : section.section.kind === "decision"
                      ? <ClientPortalDecisionSection capabilities={summary.capabilities} initialDecisionId={selectedDecisionId} issue={manifest.issue} token={token} />
                      : <ClientPortalPayload payload={section.section.payload} /> : null}
            </>}
          </div>
        </section>

        <aside className="hidden border-l border-hairline bg-white p-4 xl:block">
          <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Review context</p>
          <dl className="mt-3 grid gap-3 text-[12px]">
            <div><dt className="text-tertiary">Current agreement</dt><dd className="mt-1 text-ink">{summary.activeBaseline?.versionLabel ?? "Not established"}</dd></div>
            {summary.pendingIssue ? <div><dt className="text-tertiary">Pending issue</dt><dd className="mt-1 text-ink">{summary.pendingIssue.versionLabel}</dd></div> : null}
            <div><dt className="text-tertiary">Currency</dt><dd className="mt-1 text-ink">{summary.project.currencyCode}</dd></div>
            {validThrough ? <div><dt className="text-tertiary">Valid through</dt><dd className="mt-1 text-ink">{validThrough}</dd></div> : null}
            {summary.recipient ? <div><dt className="text-tertiary">Viewing as</dt><dd className="mt-1 text-ink">{summary.recipient.displayName ?? summary.recipient.role}</dd></div> : null}
          </dl>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-hairline bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
        <Button size="sm" variant="ghost" className="!min-w-0" onClick={() => setContextOpen(true)}>Review context</Button>
        {summary.capabilities.includes("thread:create") && manifest?.sections.some((item) => item.kind === "discussion") ? <Button size="sm" variant="secondary" onClick={() => selectView("discussion")}>Discuss</Button> : null}
        {(summary.capabilities.includes("decision:submit_review") || summary.capabilities.includes("decision:submit_formal")) && manifest?.sections.some((item) => item.kind === "decision") ? <Button size="sm" variant="secondary" onClick={() => selectView("decision")}>Decision</Button> : null}
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
              <div><dt className="text-tertiary">Current agreement</dt><dd className="mt-1 text-ink">{summary.activeBaseline?.versionLabel ?? "Not established"}</dd></div>
              {summary.pendingIssue ? <div><dt className="text-tertiary">Pending issue</dt><dd className="mt-1 text-ink">{summary.pendingIssue.versionLabel}</dd></div> : null}
              <div><dt className="text-tertiary">Currency</dt><dd className="mt-1 text-ink">{summary.project.currencyCode}</dd></div>
              {validThrough ? <div><dt className="text-tertiary">Valid through</dt><dd className="mt-1 text-ink">{validThrough}</dd></div> : null}
              {summary.recipient ? <div><dt className="text-tertiary">Viewing as</dt><dd className="mt-1 text-ink">{summary.recipient.displayName ?? summary.recipient.role}</dd></div> : null}
            </dl>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
