import Link from "next/link";
import { notFound } from "next/navigation";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import { formatMoney } from "@/lib/money/format";

export const dynamic = "force-dynamic";

type ProposalPageProps = { params: Promise<{ proposalId: string }> };

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { proposalId } = await params;
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const snapshot = database.proposalSnapshots.find((item) => item.id === proposalId);
  if (!snapshot) notFound();

  const issuedDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date(snapshot.issuedAt));

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-4 flex max-w-[900px] justify-between print:hidden">
        <Link className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-muted" href={`/projects/${snapshot.projectId}`}>Back to project</Link>
        <span className="rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-white">Use browser print / Save as PDF</span>
      </div>
      <article className="mx-auto max-w-[900px] rounded-2xl border border-hairline bg-white p-10 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="border-b border-hairline pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Issued proposal package</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em]">{snapshot.terms.subject}</h1>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="font-semibold">Project:</span> {snapshot.projectName}</p>
            <p><span className="font-semibold">Client:</span> {snapshot.clientName}</p>
            <p><span className="font-semibold">Location:</span> {snapshot.projectLocation}</p>
            <p><span className="font-semibold">Issued:</span> {issuedDate}</p>
            <p><span className="font-semibold">Revision:</span> {snapshot.proposalVersionLabel}</p>
            <p><span className="font-semibold">Contractor:</span> {snapshot.terms.contractorName}</p>
          </div>
        </header>

        <section className="grid gap-5 border-b border-hairline py-8 text-sm leading-7">
          <p>Dear {snapshot.clientName},</p>
          <p>We are pleased to submit this proposal for <strong>{snapshot.projectName}</strong>. The proposed amount is <strong>{formatMoney(snapshot.totalAmount, snapshot.currency)}</strong>, subject to the commercial terms and scope notes below.</p>
          <p>{snapshot.terms.taxStatement}</p>
        </section>

        <section className="border-b border-hairline py-8">
          <h2 className="text-lg font-semibold">Cost summary</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-hairline">
            {snapshot.sectionSummaries.map((section) => <div key={section.proposalSectionId ?? section.sectionId ?? section.name} className="flex justify-between border-b border-hairline px-4 py-3 text-sm last:border-0"><span>{section.outlineCode}. {section.name}</span><span className="font-mono font-semibold">{formatMoney(section.totalAmount, snapshot.currency)}</span></div>)}
            <div className="flex justify-between bg-foreground px-4 py-4 text-white"><span className="font-semibold">Grand total</span><span className="font-mono text-lg font-semibold">{formatMoney(snapshot.totalAmount, snapshot.currency)}</span></div>
          </div>
        </section>

        {snapshot.detailRows.length ? <section className="border-b border-hairline py-8">
          <h2 className="text-lg font-semibold">Scope detail by location</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-hairline">
            {snapshot.detailRows.map((row) => <div key={row.lineItemId} className="grid gap-1 border-b border-hairline px-4 py-3 text-sm last:border-0 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{row.itemName}</p>{row.description ? <p className="mt-1 text-xs text-muted">{row.description}</p> : null}<p className="mt-1 text-xs text-muted">{row.spacePath} · {row.quantity} {row.unit}{row.wastePercent ? ` + ${row.wastePercent}% waste = ${row.adjustedQuantity} ${row.unit}` : ""} · {row.scopeStatus}</p></div><div className="font-mono font-semibold sm:text-right"><p>{formatMoney(row.totalAmount, snapshot.currency)}</p><p className="mt-1 text-xs font-normal text-muted">@ {formatMoney(row.unitRate, snapshot.currency)}</p></div></div>)}
          </div>
        </section> : null}

        <section className="grid gap-6 border-b border-hairline py-8 text-sm leading-7">
          <TermBlock title="Inclusions" value={snapshot.terms.inclusions} />
          <TermBlock title="Exclusions" value={snapshot.terms.exclusions} />
          <TermBlock title="Payment terms" value={snapshot.terms.paymentTerms} />
          <TermBlock title="Duration" value={snapshot.terms.durationNote} />
          <TermBlock title="Warranty" value={snapshot.terms.warrantyTerms} />
          <TermBlock title="Validity" value={`${snapshot.terms.validityDays} days from issue date.`} />
        </section>

        <footer className="grid gap-10 pt-10 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold">Prepared by</p>
            <div className="mt-16 border-t border-foreground pt-2">
              <p>{snapshot.terms.contractorName}</p>
              <p className="text-muted">{snapshot.terms.contractorTitle}</p>
            </div>
          </div>
          <div>
            <p className="font-semibold">Conforme / accepted by</p>
            <div className="mt-16 border-t border-foreground pt-2">
              <p>{snapshot.clientName}</p>
              <p className="text-muted">Date / signature</p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}

function TermBlock({ title, value }: { title: string; value: string }) {
  return <div><h3 className="font-semibold">{title}</h3><p className="mt-1 whitespace-pre-wrap text-muted">{value}</p></div>;
}
