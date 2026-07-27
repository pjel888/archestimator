"use client";

import {
  ArrowUpRight,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { onboardingTarget } from "@/lib/onboarding/target-catalog";
import type {
  CommitmentCenterDecisionRow,
  CommitmentCenterPortalRow,
  CommitmentCenterRequestRow,
  CommitmentCenterView,
  WorkspaceCommitmentCenter,
} from "@/lib/publisher/commitment-center-repository";

type Props = {
  initialData: WorkspaceCommitmentCenter;
  initialView?: CommitmentCenterView;
};

const VIEWS: readonly { key: CommitmentCenterView; label: string }[] = [
  { key: "action_required", label: "Action required" },
  { key: "portals", label: "Portals" },
  { key: "requests", label: "Requests" },
  { key: "decisions", label: "Decisions" },
  { key: "access_delivery", label: "Access / delivery" },
];

function formatDate(value: string | null) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(minorUnits: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      currency: currencyCode,
      style: "currency",
    }).format(minorUnits / 100);
  } catch {
    return `${currencyCode} ${(minorUnits / 100).toFixed(2)}`;
  }
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll(".", " ");
}

function tone(value: string) {
  if (/approved|accepted|active|delivered|live|resolved/.test(value)) return "approved" as const;
  if (/declined|dead|failed|revoked|access_off/.test(value)) return "danger" as const;
  if (/pending|review|request|invited|draft|ready|issued/.test(value)) return "review" as const;
  return "inactive" as const;
}

function projectTimelineHref(projectId: string, portalId?: string | null) {
  const root = `/workshop/projects/${encodeURIComponent(projectId)}/timeline`;
  return portalId ? `${root}?portal=${encodeURIComponent(portalId)}` : root;
}

function portalControlHref(projectId: string, portalId: string) {
  return `/workshop/projects/${encodeURIComponent(projectId)}/client-portals/${encodeURIComponent(portalId)}`;
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 text-tertiary">
        {icon}
        <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 text-[24px] font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}

function EmptyView({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-12 text-center text-[13px] leading-5 text-secondary">{children}</p>;
}

function NextActionLink({ portal }: { portal: CommitmentCenterPortalRow }) {
  return (
    <ButtonLink
      href={portal.nextAction.href}
      size="sm"
      variant={portal.nextAction.priority === "urgent" ? "warning" : "secondary"}
      {...(portal.nextAction.kind === "compose" ? onboardingTarget("commitment_center.compose") : {})}
    >
      {portal.nextAction.label}
      <ArrowUpRight aria-hidden="true" size={13} />
    </ButtonLink>
  );
}

function PortalIdentity({ portal }: { portal: CommitmentCenterPortalRow }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="truncate text-[14px] font-medium text-ink">{portal.portal.name}</h3>
        {portal.portal.isPrimary ? <StatusBadge className="min-w-0" status="active">Primary</StatusBadge> : null}
      </div>
      <p className="mt-1 truncate text-[11px] text-tertiary">
        {portal.project.name}{portal.project.code ? ` · ${portal.project.code}` : ""} · {humanize(portal.audience)}
      </p>
    </div>
  );
}

function ActionRequiredView({ portals }: { portals: CommitmentCenterPortalRow[] }) {
  if (portals.length === 0) {
    return <EmptyView>No portal needs intervention. Monitor the timelines for the next commitment change.</EmptyView>;
  }
  return (
    <ol className="divide-y divide-hairline">
      {portals.map((portal) => (
        <li className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center" key={portal.portal.id}>
          <PortalIdentity portal={portal} />
          <div className="grid grid-cols-3 gap-3 text-[11px] text-secondary">
            <span><strong className="block text-[15px] font-medium text-ink">{portal.openRequests}</strong>Requests</span>
            <span><strong className="block text-[15px] font-medium text-ink">{portal.waitingDiscussions}</strong>Discussions</span>
            <span><strong className="block text-[15px] font-medium text-ink">{portal.delivery.dead}</strong>Delivery failures</span>
          </div>
          <NextActionLink portal={portal} />
        </li>
      ))}
    </ol>
  );
}

function PortalsView({ portals }: { portals: CommitmentCenterPortalRow[] }) {
  if (portals.length === 0) return <EmptyView>No modern Client Portals are available in this workspace.</EmptyView>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead className="border-b border-hairline bg-surfaceMuted text-[10px] font-medium uppercase tracking-wide text-tertiary">
          <tr>
            <th className="px-4 py-3">Project / portal</th>
            <th className="px-4 py-3">Current agreement</th>
            <th className="px-4 py-3">Pending issue</th>
            <th className="px-4 py-3">Open work</th>
            <th className="px-4 py-3">Latest commitment</th>
            <th className="px-4 py-3 text-right">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {portals.map((portal) => (
            <tr key={portal.portal.id}>
              <td className="px-4 py-4"><PortalIdentity portal={portal} /></td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <p className="font-medium text-ink">{portal.activeBaseline?.versionLabel ?? "No active baseline"}</p>
                <p className="mt-1">{portal.activeBaseline ? formatMoney(portal.activeBaseline.totalMinorUnits, portal.activeBaseline.currencyCode) : "Awaiting accepted issue"}</p>
              </td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <p className="font-medium text-ink">{portal.pendingIssue?.versionLabel ?? "None"}</p>
                <p className="mt-1 capitalize">{portal.pendingIssue ? humanize(portal.pendingIssue.status) : "No proposal awaiting action"}</p>
              </td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <p>{portal.openRequests} requests</p>
                <p className="mt-1">{portal.waitingDiscussions} waiting discussions</p>
              </td>
              <td className="max-w-64 px-4 py-4 text-[12px] text-secondary">
                <p className="truncate font-medium text-ink">{portal.latestEvent?.title ?? "No events yet"}</p>
                <p className="mt-1">{formatDate(portal.latestEvent?.occurredAt ?? null)}</p>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <ButtonLink href={projectTimelineHref(portal.project.id, portal.portal.id)} size="sm" variant="ghost">Timeline</ButtonLink>
                  <ButtonLink href={portalControlHref(portal.project.id, portal.portal.id)} size="sm" variant="secondary">Portal</ButtonLink>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsView({ requests }: { requests: CommitmentCenterRequestRow[] }) {
  if (requests.length === 0) return <EmptyView>No submitted requests are awaiting assessment or resolution.</EmptyView>;
  return (
    <ol className="divide-y divide-hairline">
      {requests.map((request) => (
        <li className="grid gap-3 px-4 py-4 md:grid-cols-[8rem_minmax(0,1fr)_10rem_auto] md:items-center" key={request.id}>
          <div>
            <StatusBadge className="min-w-0" status={tone(request.status)}>{humanize(request.status)}</StatusBadge>
            <p className="mt-2 text-[11px] text-tertiary">{request.requestCode}</p>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-medium text-ink">{request.title}</h3>
            <p className="mt-1 text-[11px] text-tertiary">{request.projectName}{request.portalName ? ` · ${request.portalName}` : ""}</p>
          </div>
          <time className="text-[11px] text-tertiary" dateTime={request.requestedAt}>{formatDate(request.requestedAt)}</time>
          <ButtonLink href={projectTimelineHref(request.projectId, request.portalId)} size="sm" variant="secondary">Open timeline<ArrowUpRight aria-hidden="true" size={13} /></ButtonLink>
        </li>
      ))}
    </ol>
  );
}

function DecisionsView({ decisions }: { decisions: CommitmentCenterDecisionRow[] }) {
  if (decisions.length === 0) return <EmptyView>No current issue decisions have been recorded.</EmptyView>;
  return (
    <ol className="divide-y divide-hairline">
      {decisions.map((decision) => (
        <li className="grid gap-3 px-4 py-4 md:grid-cols-[8rem_minmax(0,1fr)_12rem_auto] md:items-center" key={decision.id}>
          <StatusBadge className="min-w-0" status={tone(decision.decision)}>{humanize(decision.decision)}</StatusBadge>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-medium text-ink">{decision.projectName} · {decision.portalName}</h3>
            <p className="mt-1 text-[11px] text-tertiary">{decision.versionLabel} · {decision.signerName ?? "Attributed recipient"}</p>
          </div>
          <time className="text-[11px] text-tertiary" dateTime={decision.submittedAt}>{formatDate(decision.submittedAt)}</time>
          <ButtonLink href={`${portalControlHref(decision.projectId, decision.portalId)}?tab=decisions`} size="sm" variant="secondary">Open portal<ArrowUpRight aria-hidden="true" size={13} /></ButtonLink>
        </li>
      ))}
    </ol>
  );
}

function AccessDeliveryView({ portals }: { portals: CommitmentCenterPortalRow[] }) {
  if (portals.length === 0) return <EmptyView>No portal access or delivery state is available.</EmptyView>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead className="border-b border-hairline bg-surfaceMuted text-[10px] font-medium uppercase tracking-wide text-tertiary">
          <tr>
            <th className="px-4 py-3">Portal</th>
            <th className="px-4 py-3">Access</th>
            <th className="px-4 py-3">Recipients</th>
            <th className="px-4 py-3">Delivery</th>
            <th className="px-4 py-3 text-right">Manage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {portals.map((portal) => (
            <tr key={portal.portal.id}>
              <td className="px-4 py-4"><PortalIdentity portal={portal} /></td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <StatusBadge className="min-w-0" status={tone(portal.access.portalStatus)}>{humanize(portal.access.portalStatus)}</StatusBadge>
                <p className="mt-2">{portal.access.passwordRequired ? "Password protected" : "Portal policy"}</p>
              </td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <p><strong className="font-medium text-ink">{portal.recipients.active}</strong> active · {portal.recipients.invited} invited</p>
                <p className="mt-1">{portal.recipients.unverified} unverified · {portal.recipients.requiredApprovers} required approvers</p>
              </td>
              <td className="px-4 py-4 text-[12px] text-secondary">
                <p><strong className="font-medium text-ink">{portal.delivery.delivered}</strong> delivered · {portal.delivery.pending} pending</p>
                <p className="mt-1">{portal.delivery.dead} failed · latest {humanize(portal.delivery.latestState ?? "none")}</p>
              </td>
              <td className="px-4 py-4 text-right">
                <ButtonLink href={`${portalControlHref(portal.project.id, portal.portal.id)}?tab=people`} size="sm" variant="secondary">Open access<ArrowUpRight aria-hidden="true" size={13} /></ButtonLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommitmentCenterClient({ initialData, initialView = "action_required" }: Props) {
  const [view, setView] = useState<CommitmentCenterView>(initialView);
  const actionRequired = initialData.portals.filter((portal) => portal.nextAction.priority !== "monitor");
  const firstManageablePortal = initialData.portals.find((portal) => portal.canManagePortal);

  return (
    <div className="min-h-full bg-canvas text-ink" {...onboardingTarget("commitment_center.overview")}>
      <header className="border-b border-hairline bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Workspace commitments</p>
            <h1 className="mt-1 text-[24px] font-medium tracking-tight">Commitment Center</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-secondary">Review every project portal, current agreement, pending issue, request, decision, discussion, and delivery state without creating legacy links.</p>
          </div>
          {firstManageablePortal ? (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={projectTimelineHref(firstManageablePortal.project.id, firstManageablePortal.portal.id)} size="sm" variant="secondary">Open timeline</ButtonLink>
              <ButtonLink href={`/workshop/projects/${encodeURIComponent(firstManageablePortal.project.id)}/client-portals/compose?portal=${encodeURIComponent(firstManageablePortal.portal.id)}`} size="sm" variant="primary" {...onboardingTarget("commitment_center.compose")}>Compose issue<ArrowUpRight aria-hidden="true" size={13} /></ButtonLink>
            </div>
          ) : null}
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6 lg:p-8">
        <section aria-label="Commitment Center summary" className="grid gap-px overflow-hidden border border-hairline bg-hairline shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard icon={<WarningCircle aria-hidden="true" size={15} />} label="Action required" value={initialData.summary.actionRequired} />
          <MetricCard icon={<ShieldCheck aria-hidden="true" size={15} />} label="Active baselines" value={initialData.summary.activeBaselines} />
          <MetricCard icon={<FileText aria-hidden="true" size={15} />} label="Open requests" value={initialData.summary.openRequests} />
          <MetricCard icon={<Clock aria-hidden="true" size={15} />} label="Waiting discussions" value={initialData.summary.waitingDiscussions} />
          <MetricCard icon={<UsersThree aria-hidden="true" size={15} />} label="Portals" value={initialData.summary.portals} />
        </section>

        <section className="overflow-hidden border border-hairline bg-white shadow-sm" aria-labelledby="commitment-center-view-heading">
          <div className="border-b border-hairline px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-tertiary">Global views</p>
                <h2 className="mt-1 text-[18px] font-medium tracking-tight" id="commitment-center-view-heading">{VIEWS.find((option) => option.key === view)?.label}</h2>
              </div>
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="Commitment Center views" {...onboardingTarget("commitment_center.views")}>
                {VIEWS.map((option) => {
                  const target = option.key === "action_required"
                    ? onboardingTarget("commitment_center.action_required")
                    : option.key === "portals"
                      ? onboardingTarget("commitment_center.portals")
                      : option.key === "access_delivery"
                        ? onboardingTarget("commitment_center.access_delivery")
                        : {};
                  return (
                    <Button aria-controls={`commitment-center-${option.key}`} aria-selected={view === option.key} key={option.key} onClick={() => setView(option.key)} role="tab" size="sm" variant={view === option.key ? "soft" : "ghost"} {...target}>
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div id={`commitment-center-${view}`} role="tabpanel">
            {view === "action_required" ? <ActionRequiredView portals={actionRequired} /> : null}
            {view === "portals" ? <PortalsView portals={initialData.portals} /> : null}
            {view === "requests" ? <RequestsView requests={initialData.requests} /> : null}
            {view === "decisions" ? <DecisionsView decisions={initialData.decisions} /> : null}
            {view === "access_delivery" ? <AccessDeliveryView portals={initialData.portals} /> : null}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] leading-4 text-tertiary">
          <p>Official commitments come from modern Client Portals and the project ledger. Raw analytics and legacy publication activity are excluded.</p>
          <p className="flex items-center gap-1"><CheckCircle aria-hidden="true" size={13} />Updated {formatDate(initialData.generatedAt)}</p>
        </div>
        {initialData.truncated ? <p className="text-[11px] text-warning">The workspace has more portals than this bounded view can display.</p> : null}
      </main>
    </div>
  );
}
