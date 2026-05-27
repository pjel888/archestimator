import {
  recordProjectPublicationEvent,
  verifyProjectPublicationPasswordByToken,
} from "@/lib/publication/public-repository";
import { assertSameOriginPublicPost, createPublicationAccessCookie } from "@/lib/publication/security";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sameOrigin = assertSameOriginPublicPost(request);
  if (!sameOrigin.ok) {
    return Response.json({ error: sameOrigin.message }, { status: sameOrigin.status, headers: noStoreHeaders });
  }

  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";
  const publicationAccess = await verifyProjectPublicationPasswordByToken(token, password);

  await recordProjectPublicationEvent({
    token,
    eventType: publicationAccess ? "password_success" : "password_failure",
    request,
    metadata: {},
  });

  if (!publicationAccess) {
    return Response.json({ error: "Publication password is invalid." }, { status: 401, headers: noStoreHeaders });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...noStoreHeaders,
      "Set-Cookie": createPublicationAccessCookie({
        token,
        publicationId: publicationAccess.publicationId,
        snapshotVersion: publicationAccess.snapshotVersion,
      }),
    },
  });
}
