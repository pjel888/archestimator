import { AdminAllowlistManager } from "@/components/admin/AdminAllowlistManager";
import { readClosedBetaAllowlistQueue } from "@/lib/auth/beta-allowlist-admin";

function noticeFromParams(params: { created?: string; error?: string; saved?: string }) {
  if (params.created) {
    const count = Number(params.created);
    const label = Number.isFinite(count) && count > 1 ? `${count} emails` : "Email";
    return { tone: "success" as const, text: `${label} added to the allowlist.` };
  }
  if (params.saved) return { tone: "success" as const, text: "Allowlist entry updated." };
  if (params.error === "forbidden") {
    return { tone: "error" as const, text: "Only platform admins can manage the allowlist." };
  }
  if (params.error === "invalid") {
    return { tone: "error" as const, text: "Enter one or more valid email addresses." };
  }
  if (params.error === "duplicate") {
    return { tone: "error" as const, text: "Those emails are already on the allowlist." };
  }
  if (params.error === "save") return { tone: "error" as const, text: "Allowlist could not be saved." };
  return null;
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
    <AdminAllowlistManager
      authorized={queue.authorized}
      error={queue.error}
      rows={queue.rows.map((row) => ({
        id: row.id,
        normalized_email: row.normalized_email,
        status: row.status,
        notes: row.notes,
        invited_at: row.invited_at,
      }))}
      statusFilter={params.status ?? ""}
      notice={notice}
    />
  );
}
