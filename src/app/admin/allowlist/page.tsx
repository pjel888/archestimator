import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
import {
  createClosedBetaAllowlistEntries,
  updateClosedBetaAllowlistEntry,
} from "@/lib/auth/beta-allowlist-admin-actions";
import {
  CLOSED_BETA_ALLOWLIST_ADMIN_PATH,
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

const statusFilterOptions = [{ value: "", label: "All statuses" }, ...statusOptions];

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function noticeFromParams(params: { created?: string; error?: string; saved?: string }) {
  if (params.created) {
    const count = Number(params.created);
    const label = Number.isFinite(count) && count > 1 ? `${count} emails` : "Email";
    return { tone: "success" as const, text: `${label} added to the allowlist.` };
  }
  if (params.saved) return { tone: "success" as const, text: "Allowlist entry updated." };
  if (params.error === "forbidden") return { tone: "error" as const, text: "Only platform admins can manage the allowlist." };
  if (params.error === "invalid") return { tone: "error" as const, text: "Enter one or more valid email addresses." };
  if (params.error === "duplicate") return { tone: "error" as const, text: "Those emails are already on the allowlist." };
  if (params.error === "save") return { tone: "error" as const, text: "Allowlist could not be saved." };
  return null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export default async function AdminAllowlistPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; saved?: string; status?: string }>;
}) {
  const params = await searchParams;
  const queue = await readClosedBetaAllowlistQueue(params.status);
  const notice = noticeFromParams(params);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Close-beta allowlist</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          Only listed emails can complete Google or magic-link sign-in when closed beta is enabled.
          Whitelist grants app access, not admin.
        </p>
      </div>

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
        <Card className="p-2">
          <p className="text-[10px] leading-4 text-tertiary">Only platform admins can manage the allowlist.</p>
        </Card>
      ) : (
        <>
          <Card className="p-2">
            <h2 className="text-[11px] font-medium leading-4 text-ink">Add emails</h2>
            <p className="mt-1 text-[10px] leading-4 text-tertiary">
              Paste one or many addresses separated by commas, spaces, or new lines.
            </p>
            <form action={createClosedBetaAllowlistEntries} className="mt-2 grid gap-2">
              <input type="hidden" name="returnPath" value={CLOSED_BETA_ALLOWLIST_ADMIN_PATH} />
              <label htmlFor="admin-allowlist-emails" className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                Emails
                <textarea
                  id="admin-allowlist-emails"
                  name="emails"
                  required
                  rows={4}
                  placeholder={"reviewer@example.com\npartner@example.com"}
                  className="rounded-xs border border-hairline bg-white px-2 py-1.5 text-[10px] font-normal text-ink outline-none focus:bg-accentSoft"
                />
              </label>
              <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-end">
                <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Status
                  <AdminStatusSelect
                    name="status"
                    defaultValue="invited"
                    options={statusOptions}
                    aria-label="Status"
                  />
                </div>
                <label htmlFor="admin-allowlist-notes" className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Notes
                  <input
                    id="admin-allowlist-notes"
                    name="notes"
                    placeholder="Cohort, source, or support context"
                    className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal text-ink outline-none focus:bg-accentSoft"
                  />
                </label>
                <Button type="submit" variant="primary" size="sm">
                  Add to allowlist
                </Button>
              </div>
            </form>
          </Card>

          <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action={CLOSED_BETA_ALLOWLIST_ADMIN_PATH}>
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

          <Card className="overflow-hidden p-0">
            <div className="border-b border-hairline p-2 text-[10px] leading-4 text-tertiary">
              Showing {queue.rows.length} latest allowlist rows.
            </div>
            {queue.rows.length === 0 ? (
              <p className="p-2 text-[10px] leading-4 text-tertiary">No emails match this view.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[10px] leading-4">
                  <thead className="bg-surfaceMuted text-secondary">
                    <tr>
                      <th className="border-b border-hairline px-2 py-1 font-medium">Email</th>
                      <th className="border-b border-hairline px-2 py-1 font-medium">Invited</th>
                      <th className="border-b border-hairline px-2 py-1 font-medium">Status</th>
                      <th className="border-b border-hairline px-2 py-1 font-medium">Notes</th>
                      <th className="border-b border-hairline px-2 py-1 font-medium">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="border-b border-hairline px-2 py-2 text-ink">{row.normalized_email}</td>
                        <td className="border-b border-hairline px-2 py-2 text-tertiary">{formatDate(row.invited_at)}</td>
                        <td className="border-b border-hairline px-2 py-2">
                          <form action={updateClosedBetaAllowlistEntry} className="flex items-center gap-1">
                            <input type="hidden" name="returnPath" value={CLOSED_BETA_ALLOWLIST_ADMIN_PATH} />
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
                            <input type="hidden" name="returnPath" value={CLOSED_BETA_ALLOWLIST_ADMIN_PATH} />
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
                        <td className="border-b border-hairline px-2 py-2">
                          {row.status === "revoked" ? (
                            <span className="text-tertiary">Revoked</span>
                          ) : (
                            <form action={updateClosedBetaAllowlistEntry}>
                              <input type="hidden" name="returnPath" value={CLOSED_BETA_ALLOWLIST_ADMIN_PATH} />
                              <input type="hidden" name="id" value={row.id} />
                              <input type="hidden" name="status" value="revoked" />
                              <input type="hidden" name="notes" value={row.notes ?? ""} />
                              <Button type="submit" variant="secondary" size="sm">
                                Remove
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
