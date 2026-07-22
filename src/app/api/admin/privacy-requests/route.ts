import { gateAdminApiGet, NO_STORE_HEADERS } from "@/lib/admin/require-admin";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { listPrivacyRequests } from "@/lib/compliance/privacy-request-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await gateAdminApiGet();
  if (!gate.ok) return gate.response;
  const database = await getCloudflareD1Database();
  if (!database) {
    return Response.json({ error: "Privacy request storage unavailable." }, { status: 503, headers: NO_STORE_HEADERS });
  }
  const requests = await listPrivacyRequests({ limit: 200 }, database);
  return Response.json({ requests }, { headers: NO_STORE_HEADERS });
}
