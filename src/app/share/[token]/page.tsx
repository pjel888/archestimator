import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import { SHARE_CONTAINER_WIDTH, ShareContainer } from "@/components/share/ShareContainer";
import SharePageHero from "@/components/share/SharePageHero";
import { SharePageProposalHeader } from "@/components/share/SharePageProposalHeader";
import ShareReviewWorkspace from "@/components/share/ShareReviewWorkspace";
import { SharePageSessionBanner } from "@/components/share/SharePageSessionBanner";
import { SharePageSummaryCard } from "@/components/share/SharePageSummaryCard";

import {
  checkProjectPublicationEventRateLimit,
  recordProjectPublicationAnalyticsEvent,
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
  resolveSharedLinkRecipientIdentity,
} from "@/lib/publication/public-repository";
import {
  createPublicationAccessCookieName,
  createPublicationViewToken,
  createSharedLinkSessionCookieName,
  readSharedLinkSessionCookieRecipientId,
  verifyPublicationAccessCookieValue,
  verifySharedLinkSessionCookieValue,
} from "@/lib/publication/security";
import { logAppError } from "@/lib/observability/logger";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";
import "../print.css";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

function ProjectPublicationView({
  recipientEmail,
  recipientSessionStatus,
  snapshot,
  token,
  viewToken,
}: {
  recipientEmail?: string | null;
  recipientSessionStatus?: "invalid";
  snapshot: ProjectPublicationSnapshot;
  token: string;
  viewToken: string;
}) {
  return (
    <main aria-label="Proposal review" className="min-h-dvh bg-white text-ink">
      {recipientSessionStatus === "invalid" ? <SharePageRecipientSessionAlert /> : null}
      <SharePageSessionBanner recipientEmail={recipientEmail} token={token} />
      {/* T1-C MVP: single-column ShareContainer replaces the 960px cap (UX-14). Width
          ladder lives once in ShareContainer; share-print-content stays on this wrapper. */}
      <ShareContainer className="share-print-content flex flex-col gap-5 py-6">
        <SharePageProposalHeader project={snapshot.project} />
        <section id="share-summary">
          <SharePageSummaryCard snapshot={snapshot} />
        </section>

        {/* P9: Hero cover (from snapshot.project.coverImageUrl populated from projects.metadata at publish).
            Next/Image + lazy. Null when absent (old snapshots / no cover) — additive, no layout shift. */}
        <SharePageHero project={snapshot.project} />

        <ShareReviewWorkspace
          estimates={snapshot.estimates}
          currencyCode={snapshot.project.currencyCode}
          token={token}
          viewToken={viewToken}
        />
        <footer className="share-print-hidden border-t border-hairline pt-3 text-[11px] leading-[15px] text-tertiary">
          Shared via Archestimator. Access is protected for invited recipients.
        </footer>
      </ShareContainer>
    </main>
  );
}

function SharePageRecipientSessionAlert() {
  return (
    <div className="share-print-hidden border-b border-amber-200 bg-amber-50" role="alert">
      <div className={`${SHARE_CONTAINER_WIDTH} py-2.5`}>
        <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-amber-900">
          We could not verify this personalized review link.
        </p>
        <p className="mt-1 text-[12px] leading-[16px] tracking-normal text-amber-900/80">
          You can still read the proposal, but commenting and response actions need a fresh link from the project team.
        </p>
      </div>
    </div>
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

function createCanonicalSharePath(token: string, searchParamsData: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParamsData)) {
    if (typeof value === "string") query.set(key, value);
  }
  const queryString = query.toString();
  return `/share/${encodeURIComponent(token)}${queryString ? `?${queryString}` : ""}`;
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const [{ token: routeToken }, searchParamsData] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<Record<string, string | undefined>>({}),
  ]);
  const token = routeToken.trim();
  if (!token) notFound();
  if (token !== routeToken) {
    redirect(createCanonicalSharePath(token, searchParamsData));
  }
  const canonicalRecipientToken =
    typeof searchParamsData.recipient === "string" ? searchParamsData.recipient.trim() : "";
  const legacyRecipientToken = typeof searchParamsData.rt === "string" ? searchParamsData.rt.trim() : "";
  const recipientToken = canonicalRecipientToken || legacyRecipientToken || undefined;
  const recipientSessionStatus = searchParamsData.recipientSession === "invalid" ? "invalid" : undefined;

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
      // OPT-1 (PERF-02): defer the password-gate telemetry write off the response path.
      // The request context is captured synchronously here so the closure stays valid after
      // the response streams; the write is best-effort and must never block or crash the gate.
      const passwordGateEventRequest = createPublicationEventRequest(token, new Headers(await headers()));
      after(async () => {
        try {
          await recordProjectPublicationAnalyticsEvent({
            token,
            eventType: "open",
            accessStage: "password_gate_viewed",
            recipientKnown: false,
            request: passwordGateEventRequest,
          });
        } catch (error) {
          logAppError(error, {
            event: "shared_link_deferred_analytics_error",
            action: "password_gate_analytics",
            context: {
              route: "/share/[token]",
              access_stage: "password_gate_viewed",
            },
          });
        }
      });
      return <ProjectPublicationPasswordGate token={token} />;
    }
  }

  // P5/PERF-01A: Recipient session & security cookie (additive only; password + view-only flows unchanged)
  // - On ?recipient= / legacy ?rt= param: redirect to the route-handler session boundary before rendering.
  // - On subsequent loads: validate existing session cookie
  // - Session route sets Max-Age=86400, HttpOnly, SameSite=Lax, Secure (prod), then redirects to the clean URL.
  // - Enables useSharedLinkSession hook + future interactive blocking (P6+)
  if (recipientToken) {
    redirect(`/api/share/${encodeURIComponent(token)}/session?recipient=${encodeURIComponent(recipientToken)}`);
  }

  let recipientIdForOpenEvent: string | undefined;
  // Subsequent load: validate existing session cookie (additive to password cookie).
  // Only the cookie verification gates whether a recipient is "known"; the identity
  // SELECT itself is independent of the snapshot read and is parallelized below (OPT-4).
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
  }

  // OPT-4 (PERF-02/03 tail): the snapshot read and the (conditional) recipient-identity
  // read are independent once access is known, so run them together rather than serially.
  // The recipient read only fires when a valid session cookie set recipientIdForOpenEvent —
  // otherwise it resolves to null without a DB round-trip, preserving control-flow correctness.
  const [publication, recipientIdentity] = await Promise.all([
    resolveProjectPublicationSnapshotByToken(token),
    recipientIdForOpenEvent
      ? resolveSharedLinkRecipientIdentity({
          publicationId: publicationAccess.publicationId,
          recipientId: recipientIdForOpenEvent,
        })
      : Promise.resolve(null),
  ]);
  if (!publication) notFound();
  const recipientEmailForBanner = recipientIdentity?.recipientEmail ?? null;
  const viewToken = createPublicationViewToken({
    token,
    publicationId: publicationAccess.publicationId,
    snapshotVersion: publication.snapshotVersion,
  });

  // OPT-1 (PERF-02): move both telemetry writes off the response path with after(). The
  // request context is captured synchronously here so the closures stay valid once the
  // response has streamed. Each write is best-effort: a telemetry failure inside after()
  // must never crash the request (it can no longer affect what was already rendered), so it
  // is wrapped in try/catch and logged — mirroring the existing best-effort behaviour.
  const requestHeaders = new Headers(await headers());
  const publicationEventRequest = createPublicationEventRequest(token, requestHeaders);
  after(async () => {
    try {
      const eventRateLimit = await checkProjectPublicationEventRateLimit({ token, request: publicationEventRequest });
      if (!eventRateLimit.allowed) return;
    } catch (error) {
      logAppError(error, {
        event: "shared_link_deferred_analytics_error",
        action: "open_event_rate_limit",
        context: {
          route: "/share/[token]",
        },
      });
      return;
    }

    try {
      await recordProjectPublicationAnalyticsEvent({
        token,
        eventType: "open",
        accessStage: "page_visit",
        recipientKnown: Boolean(recipientIdForOpenEvent),
        request: publicationEventRequest,
        recipientId: recipientIdForOpenEvent,
      });
    } catch (error) {
      logAppError(error, {
        event: "shared_link_deferred_analytics_error",
        action: "page_visit_analytics",
        context: {
          route: "/share/[token]",
          recipient_known: Boolean(recipientIdForOpenEvent),
        },
      });
    }

    try {
      await recordProjectPublicationEvent({
        token,
        eventType: "open",
        request: publicationEventRequest,
        metadata: recipientIdForOpenEvent ? { recipient_id: recipientIdForOpenEvent } : {},
        recipientId: recipientIdForOpenEvent,
      });
    } catch (error) {
      logAppError(error, {
        event: "shared_link_deferred_analytics_error",
        action: "open_event_write",
        context: {
          route: "/share/[token]",
          recipient_known: Boolean(recipientIdForOpenEvent),
        },
      });
    }
  });

  return (
    <ProjectPublicationView
      recipientEmail={recipientEmailForBanner}
      recipientSessionStatus={recipientSessionStatus}
      snapshot={publication.snapshot}
      token={token}
      viewToken={viewToken}
    />
  );
}

// ============================================================================
// P2: OpenGraph metadata for /share/[token]
// Keep unfurls generic. Link-preview bots can fetch unprotected links before a
// recipient opens them, so OG metadata must not expose project totals or client
// names.
// ============================================================================

const protectedPublicationMetadata = {
  title: "Proposal Review | Archestimator",
  description: "This proposal is password protected.",
  openGraph: {
    title: "Proposal Review | Archestimator",
    description: "This proposal is password protected.",
  },
} satisfies Metadata;

const publicPublicationMetadata = {
  title: "Proposal Review | Archestimator",
  description: "A client proposal is available for review.",
  openGraph: {
    title: "Proposal Review | Archestimator",
    description: "A client proposal is available for review.",
  },
} satisfies Metadata;

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token: routeToken } = await params;
  const token = routeToken.trim();
  if (!token) {
    return { title: "Shared Link | Archestimator" };
  }

  try {
    const access = await resolveProjectPublicationAccessByToken(token);
    if (!access) {
      return { title: "Shared Link | Archestimator" };
    }
    if (access.passwordRequired) {
      return protectedPublicationMetadata;
    }

    return publicPublicationMetadata;
  } catch {
    return { title: "Shared Link | Archestimator" };
  }
}
