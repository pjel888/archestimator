import "server-only";

import { readBoundedJsonBody } from "@/lib/http/read-bounded-body";
import { CLIENT_PORTAL_NO_STORE_HEADERS, verifyClientPortalPassword } from "@/lib/client-portal/public-repository";
import { assertSameOriginPublicPost, createPublicationAccessCookie } from "@/lib/publication/security";

export async function clientPortalPasswordResponse(request: Request, token: string) {
  const origin = assertSameOriginPublicPost(request);
  if (!origin.ok) return Response.json({ error: origin.message }, { status: origin.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });

  const body = await readBoundedJsonBody<{ password?: unknown }>(request, 256);
  if (!body.ok) return Response.json({ error: body.error }, { status: body.status, headers: CLIENT_PORTAL_NO_STORE_HEADERS });
  const context = await verifyClientPortalPassword(token, typeof body.value.password === "string" ? body.value.password : "");
  if (!context) return Response.json({ error: "Client Portal password is invalid." }, { status: 401, headers: CLIENT_PORTAL_NO_STORE_HEADERS });

  return new Response(null, {
    status: 204,
    headers: {
      ...CLIENT_PORTAL_NO_STORE_HEADERS,
      "Set-Cookie": createPublicationAccessCookie({
        token,
        publicationId: context.portalId,
        credentialVersion: context.credentialVersion,
      }),
    },
  });
}
