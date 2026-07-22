import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCustomerNotes } from "@/components/admin/AdminCustomerNotes";
import { AdminOverviewStrip, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminUserDetailActions } from "@/components/admin/AdminUserDetailActions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/datetime";
import { listUserCorporateAccounts } from "@/lib/admin/corporate-account-repository";
import { listCustomerNotes } from "@/lib/admin/customer-notes-repository";
import { getAdminUserIntelligence } from "@/lib/admin/user-intelligence-repository";
import { getAdminUser, listAdminUserAuditActivity } from "@/lib/admin/users-repository";

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function summarizeUserAgent(value: string | null) {
  if (!value) return "Unknown device";
  const browser = value.includes("Edg/") ? "Edge" : value.includes("Firefox/") ? "Firefox" : value.includes("Chrome/") ? "Chrome" : value.includes("Safari/") ? "Safari" : "Browser";
  const device = value.includes("iPhone") ? "iPhone" : value.includes("iPad") ? "iPad" : value.includes("Android") ? "Android" : value.includes("Windows") ? "Windows" : value.includes("Macintosh") ? "Mac" : value.includes("Linux") ? "Linux" : "Unknown OS";
  return `${browser} on ${device}`;
}

function relationshipLabel(value: "creator" | "owner" | "admin" | "editor" | "viewer") {
  return value === "creator" ? "Creator / owner" : humanize(value);
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: encodedUserId } = await params;
  const userId = decodeURIComponent(encodedUserId);
  const userResult = await getAdminUser(userId);

  if (userResult.error || !userResult.data) notFound();

  const user = userResult.data;
  const primaryIdentityId = user.profile_id ?? user.auth_user_id ?? user.id;
  const alternateIdentityId = user.profile_id && user.auth_user_id ? user.auth_user_id : null;
  const intelligence = await getAdminUserIntelligence(user);
  const activityResult = await listAdminUserAuditActivity(primaryIdentityId, 50, alternateIdentityId);
  const corporateResult = user.profile_id
    ? await listUserCorporateAccounts(user.profile_id)
    : { data: [], error: null };
  const notesResult = await listCustomerNotes("user", primaryIdentityId, 25);

  const adminActivities = activityResult.data ?? [];
  const corporateAccounts = corporateResult.data ?? [];
  const isProtected = user.role === "ceo" || user.role === "admin";

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={
          <>
            <Link href="/admin/users" className="hover:text-ink">Users</Link>
            {" / "}
            {user.email}
          </>
        }
        title={user.display_name ?? user.email}
        description="Identity, access, login sessions, project ownership, observed product activity, customer context, and admin audit history."
        actions={
          <>
            <Badge tone={user.account_status === "active" ? "success" : user.account_status === "suspended" ? "warning" : "danger"} size="xs" className="min-w-0 px-1.5">
              {user.account_status}
            </Badge>
            <Badge tone={user.is_registered ? "success" : "warning"} size="xs" className="min-w-0 px-1.5">
              {user.is_registered ? "registered" : "invite-only"}
            </Badge>
          </>
        }
      />

      <AdminOverviewStrip
        items={[
          { label: "Latest session started", value: user.last_session_at ? formatAdminDate(user.last_session_at) : "Never", detail: `${user.total_session_count} total` },
          { label: "Active sessions", value: user.active_session_count, detail: user.last_session_refreshed_at ? `refreshed ${formatAdminDate(user.last_session_refreshed_at)}` : "no refresh" },
          { label: "Projects", value: intelligence.projects.length, detail: `${intelligence.projects.filter((project) => project.relationship === "creator" || project.relationship === "owner").length} owned` },
          { label: "Observed activity", value: intelligence.summary.active_day_count, detail: `${intelligence.summary.event_count} events` },
        ]}
      />

      {intelligence.error ? <p role="alert" className="rounded-xs border border-danger/20 bg-dangerSoft/40 px-3 py-2 text-[10px] leading-4 text-danger">{intelligence.error}</p> : null}

      <section className="grid gap-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]" aria-label="User identity and engagement">
        <Card className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Identity and access</h2>
              <p className="mt-0.5 text-[9px] leading-3 text-tertiary">Profile, authentication, beta access, and workspace identifiers.</p>
            </div>
            <Badge tone={isProtected ? "success" : "neutral"} size="xs" className="min-w-0 px-1">{user.role}</Badge>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              ["Email", user.email],
              ["Display name", user.display_name ?? "—"],
              ["Joined directory", formatAdminDateTime(user.created_at)],
              ["Directory updated", formatAdminDateTime(user.updated_at)],
              ["Beta access", user.beta_status ?? "Not allowlisted"],
              ["Default workspace", user.default_workspace_id ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-hairline pb-2">
                <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">{label}</dt>
                <dd className="mt-0.5 break-words text-[10px] leading-4 text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <details className="mt-3">
            <summary className="cursor-pointer text-[9px] font-medium leading-4 text-secondary hover:text-ink">Identity mapping</summary>
            <dl className="mt-2 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[9px] leading-3">
              <dt className="text-tertiary">Directory ID</dt><dd className="break-all text-tertiary">{user.id}</dd>
              <dt className="text-tertiary">Profile ID</dt><dd className="break-all text-tertiary">{user.profile_id ?? "—"}</dd>
              <dt className="text-tertiary">Auth user ID</dt><dd className="break-all text-tertiary">{user.auth_user_id ?? "—"}</dd>
            </dl>
          </details>

          <div className="mt-3 border-t border-hairline pt-2">
            <h3 className="text-[10px] font-medium leading-4 text-ink">Account controls</h3>
            {user.is_manageable && user.profile_id && !isProtected ? (
              <AdminUserDetailActions userId={user.profile_id} email={user.email} currentStatus={user.account_status} />
            ) : (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xs bg-surfaceMuted px-2.5 py-2 text-[9px] leading-3 text-secondary">
                <span>{isProtected ? "Protected administrator account." : "Access is managed through the closed-beta allowlist."}</span>
                {!user.is_manageable ? <Link href="/admin/allowlist" className="font-medium text-ink hover:underline">Manage access</Link> : null}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-3">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Engagement evidence</h2>
          <p className="mt-0.5 text-[9px] leading-3 text-tertiary">What current durable records can and cannot prove about usage.</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["First session", user.first_session_at ? formatAdminDateTime(user.first_session_at) : "Never"],
              ["Latest session start", user.last_session_at ? formatAdminDateTime(user.last_session_at) : "Never"],
              ["First product event", intelligence.summary.first_observed_at ? formatAdminDateTime(intelligence.summary.first_observed_at) : "None"],
              ["Latest product event", intelligence.summary.last_observed_at ? formatAdminDateTime(intelligence.summary.last_observed_at) : "None"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xs border border-hairline p-2">
                <dt className="text-[8px] font-medium uppercase leading-3 text-tertiary">{label}</dt>
                <dd className="mt-0.5 text-[10px] leading-4 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-xs border border-warning/20 bg-warningSoft/45 p-2.5">
            <p className="text-[9px] font-medium leading-3 text-ink">Exact time in app is not currently measurable.</p>
            <p className="mt-1 text-[9px] leading-3 text-secondary">
              Better Auth records session starts, refreshes, and expiry, not continuous foreground usage. The activity timeline therefore reports durable product events and observed active days without inventing a duration.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-2 xl:grid-cols-2" aria-label="User ownership and sessions">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Project ownership and access</h2>
              <p className="text-[9px] leading-3 text-tertiary">Projects created by or explicitly shared with this identity.</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">{intelligence.projects.length}</Badge>
          </div>
          {intelligence.projects.length === 0 ? (
            <div className="p-3 text-[10px] leading-4 text-tertiary">No project ownership or membership records.</div>
          ) : (
            <ul>
              {intelligence.projects.map((project) => (
                <li key={project.id} className="border-b border-hairline px-3 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/projects/${project.id}`} className="truncate text-[10px] font-medium leading-4 text-ink hover:underline">{project.name}</Link>
                      <p className="truncate text-[8px] leading-3 text-tertiary">{project.project_code ?? "No code"} · {project.workspace_name ?? "Unknown workspace"}</p>
                    </div>
                    <Badge tone={project.relationship === "creator" || project.relationship === "owner" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">{relationshipLabel(project.relationship)}</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px] leading-3 text-secondary">
                    <span>{project.estimate_count} estimate{project.estimate_count === 1 ? "" : "s"}</span>
                    <span>Updated {formatAdminDate(project.last_activity_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
            <div>
              <h2 className="text-[11px] font-medium leading-4 text-ink">Session history</h2>
              <p className="text-[9px] leading-3 text-tertiary">Latest 50 Better Auth session records. Network addresses are not exposed.</p>
            </div>
            <Badge tone="neutral" size="xs" className="min-w-0 px-1">{intelligence.sessions.length}</Badge>
          </div>
          {intelligence.sessions.length === 0 ? (
            <div className="p-3 text-[10px] leading-4 text-tertiary">No recorded authentication sessions.</div>
          ) : (
            <ol>
              {intelligence.sessions.map((session) => (
                <li key={session.id} className="grid gap-1 border-b border-hairline px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={session.is_active ? "success" : "neutral"} size="xs" className="min-w-0 px-1">{session.is_active ? "active" : "expired"}</Badge>
                      <span className="truncate text-[10px] font-medium leading-4 text-ink">{summarizeUserAgent(session.user_agent)}</span>
                    </div>
                    <p className="mt-0.5 text-[8px] leading-3 text-tertiary">Started {formatAdminDateTime(session.created_at)} · expires {formatAdminDateTime(session.expires_at)}</p>
                  </div>
                  <span className="text-[8px] leading-3 text-tertiary sm:text-right">{session.has_network_address ? "Network recorded" : "No network record"}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
          <div>
            <h2 className="text-[11px] font-medium leading-4 text-ink">Observed product activity</h2>
            <p className="text-[9px] leading-3 text-tertiary">Latest 100 durable project, estimate, activation, library, collaboration, and security events.</p>
          </div>
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">{intelligence.summary.event_count}</Badge>
        </div>
        {intelligence.activity.length === 0 ? (
          <div className="p-3 text-[10px] leading-4 text-tertiary">No durable product events recorded for this identity.</div>
        ) : (
          <ol>
            {intelligence.activity.map((event) => (
              <li key={`${event.source}-${event.id}`} className="grid gap-1 border-b border-hairline px-3 py-2 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
                <time dateTime={event.occurred_at} className="text-[9px] leading-3 text-tertiary">{formatAdminDateTime(event.occurred_at)}</time>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium leading-4 text-ink">{humanize(event.event_type)}</p>
                  <p className="truncate text-[8px] leading-3 text-tertiary">{event.subject}</p>
                </div>
                {event.project_id ? <Link href={`/admin/projects/${event.project_id}`} className="text-[9px] leading-3 text-secondary hover:underline">View project</Link> : <span className="text-[8px] leading-3 text-tertiary">{humanize(event.source)}</span>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <section className="grid gap-2 xl:grid-cols-2" aria-label="Customer and administrative context">
        <Card className="p-3">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Corporate membership <span className="ml-2 text-[9px] font-normal text-tertiary">{corporateAccounts.length}</span></h2>
          {corporateAccounts.length === 0 ? <p className="mt-2 text-[10px] leading-4 text-tertiary">Not a member of any corporate account.</p> : (
            <ul className="mt-2 space-y-1">
              {corporateAccounts.map((account) => (
                <li key={account.id} className="flex flex-wrap items-center gap-2 text-[10px] leading-4">
                  <Link href={`/admin/accounts/${account.id}`} className="font-medium text-ink hover:underline">{account.name}</Link>
                  <Badge tone={account.role === "owner" ? "success" : account.role === "team_leader" ? "accent" : "neutral"} size="xs" className="min-w-0 px-1">{account.role}</Badge>
                  {account.job_title ? <span className="text-[9px] text-tertiary">{account.job_title}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-3">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Founder notes <span className="ml-2 text-[9px] font-normal text-tertiary">{notesResult.length}</span></h2>
          <p className="mt-1 text-[9px] leading-3 text-tertiary">Admin-only, append-only customer context.</p>
          <div className="mt-2"><AdminCustomerNotes targetKind="user" targetId={primaryIdentityId} initialNotes={notesResult} /></div>
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-hairline p-3">
          <div>
            <h2 className="text-[11px] font-medium leading-4 text-ink">Admin audit activity</h2>
            <p className="text-[9px] leading-3 text-tertiary">Administrative actions performed by this identity, separate from product activity.</p>
          </div>
          <Badge tone="neutral" size="xs" className="min-w-0 px-1">{adminActivities.length}</Badge>
        </div>
        {adminActivities.length === 0 ? <div className="p-3 text-[10px] leading-4 text-tertiary">No recorded admin actions.</div> : (
          <ol>
            {adminActivities.map((activity) => (
              <li key={`${activity.action}-${activity.created_at}`} className="grid gap-1 border-b border-hairline px-3 py-2 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
                <time dateTime={activity.created_at} className="text-[9px] leading-3 text-tertiary">{formatAdminDateTime(activity.created_at)}</time>
                <p className="truncate text-[10px] leading-4 text-ink"><span className="font-medium">{humanize(activity.action)}</span>{activity.target_type ? <span className="text-tertiary"> · {activity.target_type}{activity.target_id ? `:${activity.target_id.slice(0, 8)}…` : ""}</span> : null}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </AdminPage>
  );
}
