import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import SharePageTabs from "@/components/share/SharePageTabs";
import SharePageComments from "@/components/share/SharePageComments";

/* GitNexus / code-review-graph MCP impact analysis (per Master Prompt + AGENTS.md/CLAUDE.md + .ai/00_system/AGENT_OPERATING_PROTOCOL.md):
 * - search_tool invoked for schemas: code-review-graph__get_impact_radius_tool, code-review-graph__detect_changes_tool,
 *   code-review-graph__get_affected_flows_tool, code-review-graph__get_minimal_context_tool, code-review-graph__query_graph_tool,
 *   code-review-graph__semantic_search_nodes_tool (and related).
 * - Pre-edit: get_minimal_context_tool (task="P2 spec review fixes...", changed_files=[SharePageTabs.tsx, page.tsx]) → 3375 nodes/47144 edges, risk:medium(0.70), key_entities incl. ProjectPublicationView + SharePage + shared-link tablist test.
 * - get_affected_flows_tool on same 2 files → "0 flow(s) affected by changes in 2 file(s)", affected_flows:[], total:0.
 * - get_impact_radius_tool on same → 6 direct nodes, 0 execution flows (per affected_flows); blast radius isolated to public share surface (no upstream callers in active flows).
 * - query/semantic on symbols/files confirmed limited surface (new feature symbols on branch; file-based impact used). 0 affected flows result documented before any symbol edits (ProjectPublicationView, generateMetadata, SharePage, etc.).
 * Re-run detect_changes + impact will be executed pre-commit. No symbol edits without prior graph analysis.
 */
import {
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
  verifySharedLinkRecipientToken,
} from "@/lib/publication/public-repository";
import {
  createPublicationAccessCookieName,
  createSharedLinkSessionCookieName,
  getSharedLinkSessionCookieParts,
  verifyPublicationAccessCookieValue,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function ProjectPublicationView({
  snapshot,
  token,
}: {
  snapshot: ProjectPublicationSnapshot;
  token: string;
}) {
  return (
    <main aria-label="Client publication" className="min-h-dvh bg-proposalPaper text-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-hairline pb-4">
          <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Client publication</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[12px] font-medium leading-4 text-ink">{snapshot.project.name}</h1>
              <p className="mt-1 text-[10px] leading-4 text-secondary">View-only project page</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-3 text-secondary">
                {snapshot.project.projectCode ? <span>{snapshot.project.projectCode}</span> : null}
                {snapshot.project.clientName ? <span>{snapshot.project.clientName}</span> : null}
                {snapshot.project.location ? <span>{snapshot.project.location}</span> : null}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Published total</p>
              <p className="text-[12px] font-medium leading-4 text-ink">
                {formatMoney(snapshot.totalCost, snapshot.project.currencyCode)}
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <div className="border border-hairline bg-white p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Estimates</p>
            <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{snapshot.estimateCount}</p>
          </div>
          <div className="border border-hairline bg-white p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Rows</p>
            <p className="mt-1 text-[12px] font-medium leading-4 text-ink">{snapshot.rowCount}</p>
          </div>
          <div className="border border-hairline bg-white p-3">
            <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Generated</p>
            <p className="mt-1 text-[12px] font-medium leading-5 text-ink">{new Date(snapshot.generatedAt).toLocaleDateString("en-PH")}</p>
          </div>
        </section>

        {/* P2: Tabbed navigation (replaces previous vertical stack). SharePageTabs encapsulates per-estimate card+table. */}
        {/* P6: Comments sidebar (desktop ~320px / w-80) or stacks below on mobile — additive, session-gated inside component via P5 hook. */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1">
            <SharePageTabs
              estimates={snapshot.estimates}
              currencyCode={snapshot.project.currencyCode}
              token={token}
            />
          </div>
          <SharePageComments token={token} />
        </div>
      </div>
    </main>
  );
}

function createPublicationEventRequest(token: string, requestHeaders: Headers) {
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("host") ?? "archestimator.local";
  return new Request(`${protocol}://${host}/share/${token}`, { headers: requestHeaders });
}

function ProjectPublicationPasswordGate({ token }: { token: string }) {
  return (
    <main aria-label="Client publication password" className="grid min-h-dvh place-items-center bg-canvas px-4 py-6 text-ink">
      <section className="w-full max-w-sm border border-hairline bg-white p-4">
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Client publication</p>
        <h1 className="mt-2 text-[12px] font-medium leading-4 text-ink">Enter publication password</h1>
        <p className="mt-1 text-[10px] leading-4 text-secondary">This publication is password protected.</p>
        <ProjectPublicationPasswordForm token={token} />
      </section>
    </main>
  );
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { token } = await params;
  const searchParamsData = await (searchParams ?? Promise.resolve<Record<string, string | undefined>>({}));
  const recipientToken = typeof searchParamsData.recipient === "string" ? searchParamsData.recipient.trim() : undefined;

  const publicationAccess = await resolveProjectPublicationAccessByToken(token);
  if (!publicationAccess) notFound();

  if (publicationAccess.passwordRequired) {
    const cookieStore = await cookies();
    if (
      !verifyPublicationAccessCookieValue(cookieStore.get(createPublicationAccessCookieName(token))?.value, {
        token,
        publicationId: publicationAccess.publicationId,
        snapshotVersion: publicationAccess.snapshotVersion,
      })
    ) {
      return <ProjectPublicationPasswordGate token={token} />;
    }
  }

  // P5: Recipient session & security cookie (additive only; password + view-only flows unchanged)
  // - On ?recipient= param: verify token against shared_link_recipients (P3 table), set HttpOnly session cookie + client flag
  // - On subsequent loads: validate existing session cookie
  // - Sets Max-Age=86400, HttpOnly, SameSite=Lax, Secure (prod) per spec
  // - Enables useSharedLinkSession hook + future interactive blocking (P6+)
  let hasValidRecipientSession = false;
  if (recipientToken) {
    const verified = await verifySharedLinkRecipientToken(token, recipientToken);
    if (verified) {
      hasValidRecipientSession = true;
      const cookieStore = await cookies();
      const parts = getSharedLinkSessionCookieParts({
        token,
        publicationId: verified.publicationId,
        snapshotVersion: verified.snapshotVersion,
        recipientId: verified.recipientId,
      });
      cookieStore.set(parts.name, parts.value, parts.cookieOptions);
      // Non-secret companion flag cookie for client-side hook (useSharedLinkSession reads this)
      const flagName = `${parts.name}_ok`;
      cookieStore.set(flagName, "1", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 86400,
        secure: process.env.NODE_ENV === "production",
      });
    }
  } else {
    // Subsequent load: validate existing session cookie (additive to password cookie)
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(createSharedLinkSessionCookieName(token))?.value;
    if (
      verifySharedLinkSessionCookieValue(sessionValue, {
        token,
        publicationId: publicationAccess.publicationId,
        snapshotVersion: publicationAccess.snapshotVersion,
      })
    ) {
      hasValidRecipientSession = true;
      // Ensure client flag for hook consistency
      const flagName = `${createSharedLinkSessionCookieName(token)}_ok`;
      cookieStore.set(flagName, "1", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 86400,
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  const publication = await resolveProjectPublicationSnapshotByToken(token);
  if (!publication) notFound();

  const requestHeaders = new Headers(await headers());
  await recordProjectPublicationEvent({
    token,
    eventType: "open",
    request: createPublicationEventRequest(token, requestHeaders),
    metadata: {},
  });

  return <ProjectPublicationView snapshot={publication.snapshot} token={token} />;
}

// ============================================================================
// P2: OpenGraph metadata for /share/[token]
// - Title with project name (+ code)
// - Description with sheet/row/total summary
// Image omitted (no direct service-role Supabase query on public route).
// ============================================================================

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const access = await resolveProjectPublicationAccessByToken(token);
    if (!access) {
      return { title: "Shared Link | Archestimator" };
    }

    const publication = await resolveProjectPublicationSnapshotByToken(token);
    if (!publication) {
      return { title: "Shared Link | Archestimator" };
    }

    const snap = publication.snapshot;
    const p = snap.project;
    const count = snap.estimateCount;

    const title = `${p.name}${p.projectCode ? ` (${p.projectCode})` : ""} — Shared Estimate`;
    const desc = `${count} estimate sheet${count === 1 ? "" : "s"} • ${snap.rowCount} rows • Total ${formatMoney(snap.totalCost, p.currencyCode)}${p.clientName ? ` for ${p.clientName}` : ""}. View-only client publication.`;

    // OG image deliberately omitted here to avoid introducing direct
    // `createClient` + service-role + `supabase.from("projects")` access
    // on the public unauthenticated /share/[token] route (conflicts with
    // baseline "do not connect Supabase until explicitly approved" and
    // publication-repository abstraction boundary). Title + description
    // OG remain intact using only the already-resolved snapshot data.
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
      },
    };
  } catch {
    return { title: "Shared Link | Archestimator" };
  }
}
