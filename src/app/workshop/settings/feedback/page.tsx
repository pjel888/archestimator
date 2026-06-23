import { Button } from "@/components/ui/button";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
import { BETA_FEEDBACK_STATUSES, isBetaFeedbackStatus, type BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import { updateBetaFeedbackReviewStatus } from "@/lib/workshop/beta-feedback-review-actions";
import { readBetaFeedbackReviewQueue } from "@/lib/workshop/beta-feedback-review";

const statusLabels: Record<BetaFeedbackStatus, string> = {
  archived: "Archived",
  new: "New",
  resolved: "Resolved",
  reviewing: "Reviewing",
};

const statusOptions = BETA_FEEDBACK_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const statusFilterOptions = [{ value: "", label: "All statuses" }, ...statusOptions];

function feedbackNotice(error?: string, saved?: string) {
  if (saved) return { tone: "success" as const, text: "Feedback status updated." };
  if (error === "forbidden") return { tone: "error" as const, text: "Only platform admins can review beta feedback." };
  if (error === "invalid") return { tone: "error" as const, text: "Choose a valid feedback status before saving." };
  if (error === "save") return { tone: "error" as const, text: "Feedback status could not be saved." };
  return null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function BetaFeedbackReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; status?: string }>;
}) {
  const params = await searchParams;
  const queue = await readBetaFeedbackReviewQueue(params.status);
  const notice = feedbackNotice(params.error, params.saved);

  return (
    <WorkshopPageShell
      title="Beta feedback"
      eyebrow="Settings"
      description="Review authenticated beta feedback and keep triage status current."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Beta feedback",
      ]}
      contentClassName="overflow-y-auto p-2"
    >
      <div className="max-w-5xl space-y-3">
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
              Only platform admins can review beta feedback.
            </p>
          </section>
        ) : (
          <>
            <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action="/workshop/settings/feedback">
              <div className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                Status
                <AdminStatusSelect
                  name="status"
                  defaultValue={params.status && isBetaFeedbackStatus(params.status) ? params.status : ""}
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
                Showing {queue.submissions.length} latest beta feedback submissions.
              </div>
              {queue.submissions.length === 0 ? (
                <p className="p-2 text-[10px] leading-4 text-tertiary">
                  No beta feedback matches this view.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-[10px] leading-4">
                    <thead className="bg-surfaceMuted text-secondary">
                      <tr>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Created</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Reporter</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Type</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Severity</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Message</th>
                        <th className="border-b border-hairline px-2 py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.submissions.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="border-b border-hairline px-2 py-2 text-tertiary">{formatDate(item.created_at)}</td>
                          <td className="border-b border-hairline px-2 py-2 text-secondary">
                            <div>{item.user_email}</div>
                            <div className="text-tertiary">{item.page_path ?? "No page path"}</div>
                          </td>
                          <td className="border-b border-hairline px-2 py-2 text-secondary">{item.feedback_type}</td>
                          <td className="border-b border-hairline px-2 py-2 text-secondary">{item.severity}</td>
                          <td className="max-w-md border-b border-hairline px-2 py-2 text-ink">{item.message}</td>
                          <td className="border-b border-hairline px-2 py-2">
                            <form action={updateBetaFeedbackReviewStatus} className="flex items-center gap-1">
                              <input type="hidden" name="id" value={item.id} />
                              <AdminStatusSelect
                                name="status"
                                defaultValue={item.status}
                                options={statusOptions}
                                aria-label={`Review status for feedback from ${item.user_email}`}
                                className="min-w-28"
                              />
                              <Button type="submit" variant="secondary" size="sm">
                                Save
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
    </WorkshopPageShell>
  );
}
