import { Button } from "@/components/ui/button";
import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
import {
  createClosedBetaAllowlistEntry,
  updateClosedBetaAllowlistEntry,
} from "@/lib/auth/beta-allowlist-admin-actions";
import {
  CLOSED_BETA_ALLOWLIST_STATUSES,
  isClosedBetaAllowlistStatus,
  readClosedBetaAllowlistQueue,
  type ClosedBetaAllowlistStatus,
} from "@/lib/auth/beta-allowlist-admin";

const statusLabels: Record<ClosedBetaAllowlistStatus, string> = {
  active: "Active",
  invited: "Invited",
  revoked: "Revoked",
};

const statusOptions = CLOSED_BETA_ALLOWLIST_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));
const betaUserDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const statusFilterOptions = [{ value: "", label: "All statuses" }, ...statusOptions];

function betaUserNotice(params: { created?: string; error?: string; saved?: string }) {
  if (params.created) return { tone: "success" as const, text: "User added to the allowlist." };
  if (params.saved) return { tone: "success" as const, text: "User access updated." };
  if (params.error === "forbidden") return { tone: "error" as const, text: "Only platform admins can manage users." };
  if (params.error === "invalid") return { tone: "error" as const, text: "Enter a valid email and status." };
  if (params.error === "save") return { tone: "error" as const, text: "User access could not be saved." };
  return null;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return betaUserDateFormatter.format(new Date(value));
}

export default async function BetaUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; saved?: string; status?: string }>;
}) {
  const params = await searchParams;
  const queue = await readClosedBetaAllowlistQueue(params.status);
  const notice = betaUserNotice(params);

  return (
    <WorkshopRouteHeader
      title="Users"
      eyebrow="Settings"
      description="Manage the email allowlist without exposing it to regular members."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Users",
      ]}
      contentClassName="overflow-y-auto p-2"
    >

      <div className="max-w-6xl space-y-3">
        {notice ? (
          <div
            className={[
              "rounded-xs border p-2 text-[10px] leading-4",
              notice.tone === "error"
                ? "border-dangerSoft bg-dangerSoft/40 text-danger"
                : "border-accent/25 bg-accentSoft text-ink",
            ].join(" ")}
          >
            {notice.text}
          </div>
        ) : null}

        {!queue.authorized ? (
          <section className="border border-hairline bg-white p-2">
            <p className="text-[10px] leading-4 text-tertiary">
              Only platform admins can manage users.
            </p>
          </section>
        ) : (
          <>
            <section className="border border-hairline bg-white p-2">
              <h2 className="text-[11px] font-medium leading-4 text-ink">Add user</h2>
              <form action={createClosedBetaAllowlistEntry} className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)_auto] md:items-end">
                <label htmlFor="beta-allowlist-email" className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Google email
                  <input
                    id="beta-allowlist-email"
                    name="email"
                    type="email"
                    required
                    placeholder="reviewer@example.com"
                    className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal text-ink outline-none focus:bg-accentSoft"
                  />
                </label>
                <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Status
                  <AdminStatusSelect
                    name="status"
                    defaultValue="invited"
                    options={statusOptions}
                    aria-label="Status"
                  />
                </div>
                <label htmlFor="beta-allowlist-notes" className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Notes
                  <input
                    id="beta-allowlist-notes"
                    name="notes"
                    placeholder="Cohort, source, or support context"
                    className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal text-ink outline-none focus:bg-accentSoft"
                  />
                </label>
                <Button type="submit" variant="primary" size="sm">
                  Add user
                </Button>
              </form>
            </section>

            <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action="/workshop/settings/users">
              <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                Status
                <AdminStatusSelect
                  name="status"
                  defaultValue={params.status && isClosedBetaAllowlistStatus(params.status) ? params.status : ""}
                  options={statusFilterOptions}
                  aria-label="Status filter"
                  className="min-w-36"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </form>

            {queue.error ? (
              <div className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
                {queue.error}
              </div>
            ) : null}

            <section className="border border-hairline bg-white">
              <div className="border-b border-hairline p-2 text-[10px] leading-4 text-tertiary">
                Showing {queue.rows.length} latest allowlist rows.
              </div>
              {queue.rows.length === 0 ? (
                <p className="p-2 text-[10px] leading-4 text-tertiary">
                  No users match this view.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-[10px] leading-4">
                    <thead className="bg-surfaceMuted text-secondary">
                      <tr>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Email</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Invited</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Accepted</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Status</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.rows.map((row) => (
                        <tr key={row.id} className="align-top">
                          <td className="border-b border-hairline px-2 py-2 text-ink">{row.normalized_email}</td>
                          <td className="border-b border-hairline px-2 py-2 text-tertiary">{formatDate(row.invited_at)}</td>
                          <td className="border-b border-hairline px-2 py-2 text-tertiary">{formatDate(row.accepted_at)}</td>
                          <td className="border-b border-hairline px-2 py-2">
                            <form action={updateClosedBetaAllowlistEntry} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="notes" value={row.notes ?? ""} />
                              <AdminStatusSelect
                                name="status"
                                defaultValue={row.status}
                                options={statusOptions}
                                aria-label={`Status for ${row.normalized_email}`}
                                className="min-w-28"
                              />
                              <Button type="submit" variant="secondary" size="sm">
                                Save
                              </Button>
                            </form>
                          </td>
                          <td className="max-w-sm border-b border-hairline px-2 py-2">
                            <form action={updateClosedBetaAllowlistEntry} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value={row.status} />
                              <input
                                name="notes"
                                aria-label={`Notes for ${row.normalized_email}`}
                                defaultValue={row.notes ?? ""}
                                className="h-7 min-w-44 rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus:bg-accentSoft"
                              />
                              <Button type="submit" variant="secondary" size="sm">
                                Save notes
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WorkshopRouteHeader>
  );
}
