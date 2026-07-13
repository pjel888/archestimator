import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SharePageOverviewProps = {
  expiresAt?: string | null;
  snapshot: ProjectPublicationSnapshot;
};

const overviewDateFormatter = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : overviewDateFormatter.format(parsed);
}

function mapUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export default function SharePageOverview({ expiresAt, snapshot }: SharePageOverviewProps) {
  const { project } = snapshot;
  const issuedAt = snapshot.issuance?.issuedAt ?? snapshot.generatedAt;
  const validThrough = snapshot.issuance?.validThrough ?? expiresAt;
  const locationMapUrl = project.location ? mapUrl(project.location) : null;
  const details = [
    { label: "Client", value: project.clientName ?? "Not specified" },
    { label: "Location", value: project.location ?? "Not shared", href: locationMapUrl },
    { label: "Prepared by", value: project.senderName ?? "Not specified" },
    { label: "Issued", value: formatDate(issuedAt) },
    { label: "Proposal", value: snapshot.issuance ? `Issue #${snapshot.issuance.issueNumber} · v${snapshot.issuance.version}` : "Current proposal" },
    { label: "Available until", value: validThrough ? formatDate(validThrough) : "No expiry" },
  ];

  return (
    <section aria-labelledby="share-overview-heading" className="space-y-3">
      <div className="border-b border-hairline pb-3">
        <h2 id="share-overview-heading" className="text-[12px] font-medium leading-[16px] text-ink">Overview</h2>
      </div>

      <dl className="grid grid-cols-2 border-y border-hairline sm:grid-cols-3">
        {details.map((detail, index) => (
          <div key={detail.label} className={`min-w-0 border-b border-r border-hairline px-3 py-3${index > 2 ? " sm:border-b-0" : ""}`}>
            <dt className="text-[9px] font-medium leading-[12px] text-tertiary">{detail.label}</dt>
            <dd className="mt-1 truncate text-[11px] leading-[16px] text-ink" title={detail.value}>
              {detail.href ? <a className="underline decoration-hairline underline-offset-4" href={detail.href} rel="noreferrer" target="_blank">{detail.value}</a> : detail.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
