import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
} as const;

async function requireAdminForApi() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return { ok: false as const, response: Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS }) };
  }
  if (!isPlatformAdmin({ role: currentUser.role, email: currentUser.email })) {
    return { ok: false as const, response: Response.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS }) };
  }
  return { ok: true as const };
}

export async function GET() {
  const gate = await requireAdminForApi();
  if (!gate.ok) return gate.response;

  return Response.json(
    {
      series: [],
      degraded: true,
      message: "Signup metrics cache is not wired yet.",
    },
    { headers: NO_STORE_HEADERS },
  );
}
