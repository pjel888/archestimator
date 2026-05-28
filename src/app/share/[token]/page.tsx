import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import SharePageTabs from "@/components/share/SharePageTabs";
import {
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
} from "@/lib/publication/public-repository";
import { createPublicationAccessCookieName, verifyPublicationAccessCookieValue } from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ token: string }>;
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
        <SharePageTabs
          estimates={snapshot.estimates}
          currencyCode={snapshot.project.currencyCode}
          token={token}
        />
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

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
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
// - images[] populated via inline service-role query + local getProjectImageUrl
//   when projectImageUrl present in projects.metadata (per spec)
// Backwards compatible: password gate + old tokens continue to work unchanged.
// ============================================================================

function createPublicationServiceClientForMetadata() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-share-og" } },
  });
}

function getProjectImageUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const rec = metadata as Record<string, unknown>;
  const value = rec.projectImageUrl ?? rec.projectImageThumbnailUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
}

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

    let ogImages: { url: string }[] | undefined = undefined;

    // Inline light query for current project cover (if present in metadata).
    // Uses same service pattern as the publication repository (no new secrets surface).
    try {
      const supabase = createPublicationServiceClientForMetadata();
      if (supabase) {
        const { data: projRow } = await supabase
          .from("projects")
          .select("metadata")
          .eq("id", p.id)
          .maybeSingle();
        const img = getProjectImageUrl(projRow?.metadata ?? null);
        if (img) {
          ogImages = [{ url: img }];
        }
      }
    } catch {
      // Non-fatal for OG — continue without image
    }

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: ogImages,
      },
    };
  } catch {
    return { title: "Shared Link | Archestimator" };
  }
}
