import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;

  return Response.json(
    {
      users: [],
      degraded: true,
      message: "Admin users repository is not wired yet.",
    },
    { headers: NO_STORE_HEADERS },
  );
}
