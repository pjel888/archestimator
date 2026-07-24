import { redirect } from "next/navigation";

import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { Button } from "@/components/ui/button";
import { BETA_FEEDBACK_STATUSES, isBetaFeedbackStatus, type BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import { updateBetaFeedbackReviewStatus } from "@/lib/workshop/beta-feedback-review-actions";
import { readBetaFeedbackReviewQueue } from "@/lib/workshop/beta-feedback-review";
import {
  readBetaFeedbackReviewByIdFromD1,
  readCanonicalSupportConversationIdForFeedbackFromD1,
} from "@/lib/workshop/beta-feedback-d1-store";

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
const betaFeedbackDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function feedbackNotice(error?: string, saved?: string) {
  if (saved) return { tone: "success" as const, text: "Feedback status updated." };
  if (error === "forbidden") return { tone: "error" as const, text: "Only platform admins can review feedback." };
  if (error === "invalid") return { tone: "error" as const, text: "Choose a valid feedback status before saving." };
  if (error === "save") return { tone: "error" as const, text: "Feedback status could not be saved." };
  return null;
}

function formatDate(value: string) {
  return betaFeedbackDateFormatter.format(new Date(value));
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; status?: string; feedback?: string }>;
}) {
  const params = await searchParams;
  const requestedFeedbackId = params.feedback?.trim() ?? "";
  const canonicalConversationId = requestedFeedbackId
    ? await readCanonicalSupportConversationIdForFeedbackFromD1(requestedFeedbackId).catch(() => null)
    : null;
  if (canonicalConversationId) {
    redirect(`/admin/support?c=${encodeURIComponent(canonicalConversationId)}&folder=all`);
  }
  const queue = await readBetaFeedbackReviewQueue(params.status);
  const selectedFeedback = requestedFeedbackId
    ? await readBetaFeedbackReviewByIdFromD1(requestedFeedbackId).catch(() => null)
    : null;
  const submissions = selectedFeedback && !queue.submissions.some((item) => item.id === selectedFeedback.id)
    ? [selectedFeedback, ...queue.submissions]
    : queue.submissions;
  const notice = feedbackNotice(params.error, params.saved);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title="Feedback"
        description="Review authenticated feedback and keep triage status current."
      />

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
            Only platform admins can review feedback.
          </p>
        </section>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-2 border border-hairline bg-white p-2" action="/admin/feedback">
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
              Showing {submissions.length} latest feedback submissions.
            </div>
            {submissions.length === 0 ? (
              <p className="p-2 text-[10px] leading-4 text-tertiary">
                No feedback matches this view.
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
                    {submissions.map((item) => (
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
    </AdminPage>
  );
}
