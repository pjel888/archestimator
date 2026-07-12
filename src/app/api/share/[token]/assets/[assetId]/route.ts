import { getCloudflareContext } from "@opennextjs/cloudflare";

import { CLIENT_PORTAL_NO_STORE_HEADERS, getClientPortalBrandAsset, hasClientPortalPasswordSession } from "@/lib/client-portal/public-repository";
import { checkClientPortalPublicReadRateLimit } from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

type R2Object = { body: ReadableStream; httpMetadata?: { contentType?: string } };

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string; token: string }> }) {
  const { assetId, token } = await params;
  const rateLimit = await checkClientPortalPublicReadRateLimit({ token, request, route: "asset" });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: rateLimit.message },
      { status: 429, headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfter) } },
    );
  }
  const passwordAuthenticated = await hasClientPortalPasswordSession(token, request.headers.get("cookie") ?? "").catch(() => false);
  const asset = await getClientPortalBrandAsset(token, assetId, passwordAuthenticated).catch(() => null);
  if (!asset) return Response.json({ error: "Brand asset is unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  try {
    const context = await getCloudflareContext({ async: true }) as { env: { ARCH_UPLOADS_R2?: { get(key: string): Promise<R2Object | null> } } };
    const object = await context.env.ARCH_UPLOADS_R2?.get(asset.storageKey);
    if (!object) return Response.json({ error: "Brand asset is unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
    return new Response(object.body, { headers: { ...CLIENT_PORTAL_NO_STORE_HEADERS, "Content-Type": object.httpMetadata?.contentType ?? asset.contentType } });
  } catch {
    return Response.json({ error: "Brand asset is unavailable." }, { status: 404, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  }
}
