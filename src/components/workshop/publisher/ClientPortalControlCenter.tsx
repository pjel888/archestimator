import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { ClientPortalComposer } from "@/components/workshop/publisher/ClientPortalComposer";
import { ClientPortalAccessSettings } from "@/components/workshop/publisher/ClientPortalAccessSettings";
import { ClientPortalRecipientManager } from "@/components/workshop/publisher/ClientPortalRecipientManager";
import type { ClientPortalComposerData } from "@/lib/client-portal/composer-contracts";
import type { ClientPortalControlCenterTab, loadClientPortalControlCenter } from "@/lib/client-portal/control-center-service";

type ControlCenter = Awaited<ReturnType<typeof loadClientPortalControlCenter>>;
type TabId = ClientPortalControlCenterTab;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "branding", label: "Branding" },
  { id: "people", label: "People" },
  { id: "discussions", label: "Discussions" },
  { id: "decisions", label: "Decisions" },
  { id: "activity", label: "Activity" },
  { id: "versions", label: "Versions" },
  { id: "settings", label: "Settings" },
];

function date(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="rounded-xl border border-hairline bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold text-ink">{title}</h2><div className="mt-3">{children}</div></section>;
}

export function ClientPortalControlCenter({ composer, data, tab }: { composer?: ClientPortalComposerData; data: ControlCenter; tab: TabId }) {
  const basePath = `/workshop/projects/${encodeURIComponent(data.portal.projectId)}/client-portals/${encodeURIComponent(data.portal.id)}`;
  const waiting = data.discussions.filter((thread) => thread.waitingState === "waiting_on_owner").length;
  const actionRequired = data.recipients.filter((recipient) => recipient.nextAction !== "no_action" && recipient.nextAction !== "follow_up_complete").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-surfaceMuted/35 p-4 lg:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-wide text-secondary">Client Portal</p><h1 className="mt-1 text-xl font-semibold text-ink">{data.portal.name}</h1></div>
        <StatusBadge status={data.portal.status === "live" ? "active" : data.portal.status === "archived" ? "inactive" : "draft"} showDot>{data.portal.status}</StatusBadge>
      </header>
      <nav aria-label="Client Portal controls" className="mb-5 flex gap-2 overflow-x-auto border-b border-hairline pb-2">
        {tabs.map((item) => <Link key={item.id} href={item.id === "overview" ? basePath : `${basePath}?tab=${item.id}`} className={item.id === tab ? "rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white" : "rounded-md px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface"}>{item.label}</Link>)}
      </nav>
      {tab === "overview" ? <div className="grid gap-4 lg:grid-cols-3"><Card title="Current issue"><p className="text-2xl font-semibold text-ink">{data.portal.currentIssueId ? "Issued" : "Not issued"}</p><p className="mt-1 text-xs text-secondary">{data.issues[0] ? `${data.issues[0].version_label} · ${date(data.issues[0].issued_at)}` : "Create content before publishing."}</p></Card><Card title="Next actions"><p className="text-2xl font-semibold text-ink">{actionRequired}</p><p className="mt-1 text-xs text-secondary">{waiting} discussion{waiting === 1 ? "" : "s"} waiting on the owner.</p></Card><Card title="Recipients"><p className="text-2xl font-semibold text-ink">{data.recipients.length}</p><p className="mt-1 text-xs text-secondary">External recipients only; project team access stays separate.</p></Card></div> : null}
      {tab === "content" ? composer ? <ClientPortalComposer initialData={composer} portalId={data.portal.id} projectId={data.portal.projectId} /> : <Card title="Content sections"><p className="text-sm text-secondary">Content composer data is unavailable.</p></Card> : null}
      {tab === "branding" ? <Card title="Branding"><p className="text-sm text-secondary">Brand profiles and issued snapshots are managed separately from the immutable version record. Use the Branding workflow to configure owner/client profiles and assets.</p></Card> : null}
      {tab === "people" ? <ClientPortalRecipientManager portalId={data.portal.id} projectId={data.portal.projectId} recipients={data.recipients} /> : null}
      {tab === "discussions" ? <Card title="Discussion queue"><ul className="space-y-2">{data.discussions.map((thread) => <li key={thread.id} className="border-b border-hairline pb-2 text-sm"><p className="font-medium text-ink">{thread.subject}</p><p className="text-xs text-secondary">{thread.waitingState.replaceAll("_", " ")} · {thread.status}</p></li>)}{!data.discussions.length ? <li className="text-sm text-secondary">No client discussions yet.</li> : null}</ul></Card> : null}
      {tab === "decisions" ? <Card title="Current decisions"><ul className="space-y-2">{data.decisions.map((decision, index) => <li key={`${decision.submitted_at}-${index}`} className="flex justify-between gap-3 border-b border-hairline pb-2 text-sm"><span>{decision.signer_name ?? "Recipient"}</span><span>{decision.decision.replaceAll("_", " ")} · {date(decision.submitted_at)}</span></li>)}{!data.decisions.length ? <li className="text-sm text-secondary">No current decisions recorded.</li> : null}</ul></Card> : null}
      {tab === "activity" ? <Card title="Owner audit"><ul className="space-y-2">{data.audit.map((event) => <li key={event.id} className="flex justify-between gap-3 border-b border-hairline pb-2 text-sm"><span>{event.eventType.replaceAll("_", " ")}</span><span className="text-xs text-secondary">{date(event.occurredAt)} · {event.visibility}</span></li>)}</ul></Card> : null}
      {tab === "versions" ? <Card title="Issued versions"><ul className="space-y-2">{data.issues.map((issue) => <li key={issue.id} className="flex justify-between gap-3 border-b border-hairline pb-2 text-sm"><span>{issue.version_label}</span><span className="text-xs text-secondary">#{issue.issue_number} · {issue.status} · {date(issue.issued_at)}</span></li>)}</ul></Card> : null}
      {tab === "settings" ? <Card title="Access and settings"><ClientPortalAccessSettings accessEnabled={data.portal.status !== "access_off"} passwordEnabled={data.portal.passwordEnabled} portalId={data.portal.id} projectId={data.portal.projectId} /></Card> : null}
    </div>
  );
}
