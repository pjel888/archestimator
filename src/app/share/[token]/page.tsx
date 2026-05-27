import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProjectPublicationPasswordForm } from "@/components/share/ProjectPublicationPasswordForm";
import {
  recordProjectPublicationEvent,
  resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken,
} from "@/lib/publication/public-repository";
import { createPublicationAccessCookieName, verifyPublicationAccessCookieValue } from "@/lib/publication/security";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

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

function ProjectPublicationView({ snapshot }: { snapshot: ProjectPublicationSnapshot }) {
  return (
    <main aria-label="Client publication" className="min-h-dvh bg-canvas text-ink">
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

        <div className="space-y-4">
          {snapshot.estimates.map((estimate) => (
            <section key={estimate.id} aria-label={estimate.name} className="border border-hairline bg-white" role="region">
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2">
                <div>
                  <h2 className="text-[12px] font-medium leading-4 text-ink">{estimate.name}</h2>
                  <p className="text-[10px] leading-3 text-tertiary">{estimate.sheetCode}</p>
                </div>
                <p className="text-[12px] font-medium leading-4 text-ink">
                  {formatMoney(estimate.totalCost, snapshot.project.currencyCode)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[10px] leading-4">
                  <thead className="bg-surfaceMuted text-[9px] uppercase text-tertiary">
                    <tr>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Discipline</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.rows.map((row) => (
                      <tr key={row.id} className="border-t border-hairline">
                        <td className="px-3 py-2 text-secondary">{row.description}</td>
                        <td className="px-3 py-2 text-secondary">{row.discipline}</td>
                        <td className="px-3 py-2 text-secondary">{row.quantity}</td>
                        <td className="px-3 py-2 text-secondary">{row.unit}</td>
                        <td className="px-3 py-2 text-right font-medium text-ink">
                          {formatMoney(row.rowTotal, snapshot.project.currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
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

  return <ProjectPublicationView snapshot={publication.snapshot} />;
}
