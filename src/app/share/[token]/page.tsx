import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import { ShareContainer } from "@/components/share/ShareContainer";
import SharePageTabs from "@/components/share/SharePageTabs";
import SharePageComments from "@/components/share/SharePageComments";
import SharePageDecision from "@/components/share/SharePageDecision";
import SharePageHero from "@/components/share/SharePageHero";
import { SharePageProposalHeader } from "@/components/share/SharePageProposalHeader";
import { SharePageRecipientSessionInitializer } from "@/components/share/SharePageRecipientSessionInitializer";
import { SharePageSessionBanner } from "@/components/share/SharePageSessionBanner";
import { SharePageSummaryCard } from "@/components/share/SharePageSummaryCard";

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
  recordProjectPublicationAnalyticsEvent,
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
  resolveSharedLinkRecipientIdentity,
} from "@/lib/publication/public-repository";
import {
  createPublicationAccessCookieName,
  createSharedLinkSessionCookieName,
  readSharedLinkSessionCookieRecipientId,
  verifyPublicationAccessCookieValue,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import "../print.css";

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
  recipientEmail,
  recipientToken,
  snapshot,
  token,
}: {
  recipientEmail?: string | null;
  recipientToken?: string;
  snapshot: ProjectPublicationSnapshot;
  token: string;
}) {
  return (
    <main aria-label="Proposal review" className="min-h-dvh bg-white text-ink">
      {recipientToken ? <SharePageRecipientSessionInitializer recipientToken={recipientToken} token={token} /> : null}
      <SharePageSessionBanner recipientEmail={recipientEmail} token={token} />
      {/* T1-C MVP: single-column ShareContainer replaces the 960px cap (UX-14). Width
          ladder lives once in ShareContainer; share-print-content stays on this wrapper. */}
      <ShareContainer className="share-print-content flex flex-col gap-5 py-6">
        <SharePageProposalHeader project={snapshot.project} />
        <SharePageSummaryCard snapshot={snapshot} />
        <SharePageDecision token={token} />

        {/* P9: Hero cover (from snapshot.project.coverImageUrl populated from projects.metadata at publish).
            Next/Image + lazy. Null when absent (old snapshots / no cover) — additive, no layout shift. */}
        <SharePageHero project={snapshot.project} />

        <SharePageTabs
          estimates={snapshot.estimates}
          currencyCode={snapshot.project.currencyCode}
          token={token}
        />
        <SharePageComments token={token} />
        <footer className="share-print-hidden border-t border-hairline pt-3 text-[11px] leading-[15px] text-tertiary">
          Shared via Archestimator • Activity logged for security
        </footer>
      </ShareContainer>
    </main>
  );
}

function createPublicationEventRequest(token: string, requestHeaders: Headers) {
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("host") ?? "archestimator.local";
  return new Request(`${protocol}://${host}/share/${token}`, { headers: requestHeaders });
}

function decodeCookieValue(value: string | undefined) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ProjectPublicationPasswordGate({ token }: { token: string }) {
  return (
    <main aria-label="Proposal review password" className="share-print-hidden grid min-h-dvh place-items-center bg-white px-4 py-6 text-ink">
      <section className="w-full max-w-md rounded-xs border border-hairline bg-white p-4">
        <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-tertiary">Proposal Review</p>
        <h1 className="mt-2 text-[15px] font-medium leading-[20px] tracking-normal text-ink">Enter proposal password</h1>
        <p className="mt-1 text-[13px] leading-[18px] tracking-normal text-secondary">This proposal is password protected.</p>
        <p className="mt-2 text-[13px] leading-[18px] tracking-normal text-tertiary">Access attempts may be recorded for security. We do not store raw IP addresses, exact GPS location, or password values.</p>
        <ProjectPublicationPasswordForm token={token} />
      </section>
    </main>
  );
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { token } = await params;
  const searchParamsData = await (searchParams ?? Promise.resolve<Record<string, string | undefined>>({}));
  const canonicalRecipientToken =
    typeof searchParamsData.recipient === "string" ? searchParamsData.recipient.trim() : "";
  const legacyRecipientToken = typeof searchParamsData.rt === "string" ? searchParamsData.rt.trim() : "";
  const recipientToken = canonicalRecipientToken || legacyRecipientToken || undefined;

  const publicationAccess = await resolveProjectPublicationAccessByToken(token);
  if (!publicationAccess) notFound();

  if (publicationAccess.passwordRequired) {
    const cookieStore = await cookies();
    if (
      !verifyPublicationAccessCookieValue(cookieStore.get(createPublicationAccessCookieName(token))?.value, {
        token,
        publicationId: publicationAccess.publicationId,
        credentialVersion: publicationAccess.credentialVersion,
      })
    ) {
      const requestHeaders = new Headers(await headers());
      await recordProjectPublicationAnalyticsEvent({
        token,
        eventType: "open",
        accessStage: "password_gate_viewed",
        recipientKnown: false,
        request: createPublicationEventRequest(token, requestHeaders),
      });
      return <ProjectPublicationPasswordGate token={token} />;
    }
  }

  // P5: Recipient session & security cookie (additive only; password + view-only flows unchanged)
  // - On ?recipient= / legacy ?rt= param: client initializer posts to the route-handler session boundary.
  // - On subsequent loads: validate existing session cookie
  // - Session route sets Max-Age=86400, HttpOnly, SameSite=Lax, Secure (prod) per spec
  // - Enables useSharedLinkSession hook + future interactive blocking (P6+)
  let recipientIdForOpenEvent: string | undefined;
  let recipientEmailForBanner: string | null = null;
  if (!recipientToken) {
    // Subsequent load: validate existing session cookie (additive to password cookie)
    const cookieStore = await cookies();
    const sessionValue = decodeCookieValue(cookieStore.get(createSharedLinkSessionCookieName(token))?.value);
    const recipientIdFromCookie = readSharedLinkSessionCookieRecipientId(sessionValue);
    if (
      verifySharedLinkSessionCookieValue(sessionValue, {
        token,
        publicationId: publicationAccess.publicationId,
        credentialVersion: publicationAccess.credentialVersion,
        recipientId: recipientIdFromCookie,
      })
    ) {
      recipientIdForOpenEvent = recipientIdFromCookie;
      const recipientIdentity = await resolveSharedLinkRecipientIdentity({
        publicationId: publicationAccess.publicationId,
        recipientId: recipientIdFromCookie,
      });
      recipientEmailForBanner = recipientIdentity?.recipientEmail ?? null;
    }
  }

  const publication = await resolveProjectPublicationSnapshotByToken(token);
  if (!publication) notFound();

  const requestHeaders = new Headers(await headers());
  const publicationEventRequest = createPublicationEventRequest(token, requestHeaders);
  await recordProjectPublicationAnalyticsEvent({
    token,
    eventType: "open",
    accessStage: "page_visit",
    recipientKnown: Boolean(recipientIdForOpenEvent),
    request: publicationEventRequest,
    recipientId: recipientIdForOpenEvent,
  });
  await recordProjectPublicationEvent({
    token,
    eventType: "open",
    request: publicationEventRequest,
    metadata: recipientIdForOpenEvent ? { recipient_id: recipientIdForOpenEvent } : {},
    recipientId: recipientIdForOpenEvent,
  });

  return (
    <ProjectPublicationView
      recipientEmail={recipientEmailForBanner}
      recipientToken={recipientToken}
      snapshot={publication.snapshot}
      token={token}
    />
  );
}

// ============================================================================
// P2: OpenGraph metadata for /share/[token]
// - Title with project name (+ code)
// - Description with sheet/row/total summary
// Image omitted (no direct service-role Supabase query on public route).
// ============================================================================

const protectedPublicationMetadata = {
  title: "Proposal Review | Archestimator",
  description: "This proposal is password protected.",
  openGraph: {
    title: "Proposal Review | Archestimator",
    description: "This proposal is password protected.",
  },
} satisfies Metadata;

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const access = await resolveProjectPublicationAccessByToken(token);
    if (!access) {
      return { title: "Shared Link | Archestimator" };
    }
    if (access.passwordRequired) {
      return protectedPublicationMetadata;
    }

    const publication = await resolveProjectPublicationSnapshotByToken(token);
    if (!publication) {
      return { title: "Shared Link | Archestimator" };
    }

    const snap = publication.snapshot;
    const p = snap.project;
    const count = snap.estimateCount;

    const title = `${p.name}${p.projectCode ? ` (${p.projectCode})` : ""} — Proposal Review`;
    const desc = `${count} estimate${count === 1 ? "" : "s"} • ${snap.rowCount} rows • Total ${formatMoney(snap.totalCost, p.currencyCode)}${p.clientName ? ` for ${p.clientName}` : ""}. Prepared for client review.`;

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
