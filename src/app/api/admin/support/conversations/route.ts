import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { listSupportMailbox, normalizeSupportMailboxFilters } from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

function parseUnread(value: string | null) {
  if (value === null || value === "0") return false;
  if (value === "1") return true;
  throw new Error("Invalid unread filter.");
}

function parseLimit(value: string | null) {
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("Invalid support mailbox limit.");
  return Number(value);
}

export async function GET(request: Request) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const assignee = searchParams.get("assignee");
    if (assignee !== null && assignee !== "me") throw new Error("Invalid support assignee filter.");
    const input = {
      folder: searchParams.get("folder") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      channel: searchParams.get("channel") ?? undefined,
      unreadOnly: parseUnread(searchParams.get("unread")),
      search: searchParams.get("q") ?? undefined,
      label: searchParams.get("label") ?? undefined,
      assigneeUserId: assignee === "me" ? gate.context.userId : undefined,
      limit: parseLimit(searchParams.get("limit")),
      cursor: searchParams.get("cursor") ?? undefined,
    };
    normalizeSupportMailboxFilters(input);
    const result = await listSupportMailbox(input);
    return Response.json(
      {
        conversations: result.data.conversations,
        counts: result.data.counts,
        nextCursor: result.data.nextCursor,
        degraded: Boolean(result.error),
        error: result.error,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid support mailbox query." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
