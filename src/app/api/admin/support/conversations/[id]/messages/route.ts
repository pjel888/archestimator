import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { listSupportMessages } from "@/lib/repositories/support-conversations-repository";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;

  // Defense-in-depth: validate the conversation ID is a UUID before querying.
  // The SQL is parameterized so this isn't about injection — it's about
  // rejecting invalid input early and preventing unbounded enumeration.
  if (!UUID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid conversation ID." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const result = await listSupportMessages(id, { limit: 200 });
  return Response.json(
    {
      messages: result.data,
      degraded: Boolean(result.error),
      error: result.error,
    },
    { headers: NO_STORE_HEADERS },
  );
}
