import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCustomerNotes } from "@/components/admin/AdminCustomerNotes";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminUserDetailActions } from "@/components/admin/AdminUserDetailActions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listUserCorporateAccounts } from "@/lib/admin/corporate-account-repository";
import { listCustomerNotes } from "@/lib/admin/customer-notes-repository";
import { getAdminUser, listAdminUserAuditActivity } from "@/lib/admin/users-repository";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [userResult, activityResult, corporateResult, notesResult] = await Promise.all([
    getAdminUser(userId),
    listAdminUserAuditActivity(userId, 50),
    listUserCorporateAccounts(userId),
    listCustomerNotes("user", userId, 25),
  ]);

  if (userResult.error || !userResult.data) {
    notFound();
  }

  const user = userResult.data;
  const activities = activityResult.data ?? [];

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
      />

      <section className="grid gap-2 lg:grid-cols-2" aria-label="User profile">
        <Card className="p-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Profile</h2>
          <dl className="mt-2 grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-x-2 gap-y-1 text-[10px] leading-4 sm:grid-cols-[100px_1fr]">
            <dt className="text-tertiary">Email</dt>
            <dd className="min-w-0 break-words text-ink">{user.email}</dd>

            <dt className="text-tertiary">Display name</dt>
            <dd className="min-w-0 break-words text-ink">{user.display_name ?? "—"}</dd>

            <dt className="text-tertiary">Role</dt>
            <dd>
              <Badge tone={user.role === "ceo" || user.role === "admin" ? "success" : "neutral"} size="xs" className="min-w-0 px-1">
                {user.role}
              </Badge>
            </dd>

            <dt className="text-tertiary">Status</dt>
            <dd>
              <Badge
                tone={user.account_status === "active" ? "success" : user.account_status === "suspended" ? "warning" : "danger"}
                size="xs"
                className="min-w-0 px-1"
              >
                {user.account_status}
              </Badge>
            </dd>

            <dt className="text-tertiary">User ID</dt>
            <dd className="min-w-0 break-all font-mono text-[9px] text-tertiary">{user.id}</dd>

            <dt className="text-tertiary">Joined</dt>
            <dd className="text-ink">{new Date(user.created_at).toLocaleString()}</dd>

            <dt className="text-tertiary">Last updated</dt>
            <dd className="text-ink">{new Date(user.updated_at).toLocaleString()}</dd>

            <dt className="text-tertiary">Workspace</dt>
            <dd className="min-w-0 break-all font-mono text-[9px] text-tertiary">{user.default_workspace_id ?? "—"}</dd>
          </dl>
        </Card>

        <Card className="p-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Session info</h2>
          <dl className="mt-2 grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-x-2 gap-y-1 text-[10px] leading-4 sm:grid-cols-[100px_1fr]">
            <dt className="text-tertiary">Active sessions</dt>
            <dd className="text-ink">{user.active_session_count}</dd>

            <dt className="text-tertiary">Last session</dt>
            <dd className="text-ink">
              {user.last_session_at ? new Date(user.last_session_at).toLocaleString() : "Never"}
            </dd>
          </dl>

          <div className="mt-3 border-t border-hairline pt-2">
            <h3 className="text-[10px] font-medium leading-4 text-ink">Account actions</h3>
            <AdminUserDetailActions
              userId={user.id}
              email={user.email}
              currentStatus={user.account_status}
            />
          </div>
        </Card>
      </section>

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">
          Corporate membership
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {(corporateResult.data ?? []).length} account{(corporateResult.data ?? []).length === 1 ? "" : "s"}
          </span>
        </h2>
        {(corporateResult.data ?? []).length === 0 ? (
          <p className="mt-2 text-[10px] leading-4 text-tertiary">
            Not a member of any corporate account.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {(corporateResult.data ?? []).map((acct) => (
              <li key={acct.id} className="flex items-center gap-2 text-[10px] leading-4">
                <Link href={`/admin/accounts/${acct.id}`} className="font-medium text-ink hover:underline">
                  {acct.name}
                </Link>
                <Badge
                  tone={acct.role === "owner" ? "success" : acct.role === "team_leader" ? "accent" : "neutral"}
                  size="xs"
                  className="min-w-0 px-1"
                >
                  {acct.role}
                </Badge>
                {acct.job_title && (
                  <span className="text-[9px] text-tertiary">{acct.job_title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">
          Founder notes
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {(notesResult ?? []).length} note{(notesResult ?? []).length === 1 ? "" : "s"}
          </span>
        </h2>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">
          Admin-only context about this customer. Append-only.
        </p>
        <div className="mt-2">
          <AdminCustomerNotes targetKind="user" targetId={user.id} initialNotes={notesResult ?? []} />
        </div>
      </Card>

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">
          Admin audit activity
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {activities.length} event{activities.length === 1 ? "" : "s"}
          </span>
        </h2>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">
          Admin actions only (from the audit trail); product activity arrives in a later slice.
        </p>
        {activities.length === 0 ? (
          <p className="mt-2 text-[10px] leading-4 text-tertiary">No recorded admin actions.</p>
        ) : (
          <ol className="mt-2 space-y-1" aria-label="User activity events">
            {activities.map((activity) => (
              <li
                key={`${activity.action}-${activity.created_at}`}
                className="flex items-start gap-2 border-b border-hairline pb-1 text-[10px] leading-4 last:border-b-0"
              >
                <time className="shrink-0 text-tertiary" dateTime={activity.created_at}>
                  {new Date(activity.created_at).toLocaleString()}
                </time>
                <span className="font-medium text-ink">{activity.action}</span>
                {activity.target_type && (
                  <span className="text-tertiary">
                    → {activity.target_type}
                    {activity.target_id ? `:${activity.target_id.slice(0, 8)}…` : ""}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </AdminPage>
  );
}
