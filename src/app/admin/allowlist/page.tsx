import { AdminAllowlistManager } from "@/components/admin/AdminAllowlistManager";
import { deliverPendingClosedBetaInviteEmails } from "@/lib/auth/beta-allowlist-admin-actions";
import {
  isClosedBetaAllowlistStatus,
  readClosedBetaAllowlistQueue,
} from "@/lib/auth/beta-allowlist-admin";

export default async function AdminAllowlistPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const delivery = await deliverPendingClosedBetaInviteEmails();
  const queue = await readClosedBetaAllowlistQueue();
  const selectedStatus = params.status && isClosedBetaAllowlistStatus(params.status) ? params.status : null;
  const visibleRows = selectedStatus
    ? queue.rows.filter((row) => row.status === selectedStatus)
    : queue.rows;
  const counts = queue.rows.reduce(
    (result, row) => ({ ...result, [row.status]: result[row.status] + 1 }),
    { invited: 0, active: 0, revoked: 0 },
  );
  const notice = delivery.authorized && delivery.sent > 0
    ? {
        tone: "success" as const,
        text:
          delivery.sent === 1
            ? "Sent 1 pending beta invite email."
            : `Sent ${delivery.sent} pending beta invite emails.`,
      }
    : null;

  return (
    <AdminAllowlistManager
      authorized={queue.authorized}
      error={queue.error}
      rows={visibleRows.map((row) => ({
        id: row.id,
        normalized_email: row.normalized_email,
        status: row.status,
        notes: row.notes,
        invited_at: row.invited_at,
        accepted_at: row.accepted_at,
        invite_email_sent_at: row.invite_email_sent_at,
      }))}
      counts={{ ...counts, total: queue.rows.length }}
      statusFilter={params.status ?? ""}
      notice={notice}
    />
  );
}
