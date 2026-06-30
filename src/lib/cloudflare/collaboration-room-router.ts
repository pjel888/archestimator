const COLLABORATION_ROOM_PATH_PREFIX = "/__cloudflare/collaboration-room/";
const ROOM_NAME_PATTERN = /^[a-zA-Z0-9:_-]{3,200}$/;

type DurableObjectStubLike = {
  fetch(request: Request): Promise<Response> | Response;
};

type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

export type CloudflareCollaborationRoomEnv = {
  COLLAB_ROOMS?: DurableObjectNamespaceLike | null;
};

export function parseCollaborationRoomName(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(COLLABORATION_ROOM_PATH_PREFIX)) return null;

  const rawName = decodeURIComponent(url.pathname.slice(COLLABORATION_ROOM_PATH_PREFIX.length)).trim();
  if (!ROOM_NAME_PATTERN.test(rawName)) {
    return { ok: false as const, error: "invalid_room" };
  }

  return { ok: true as const, roomName: rawName };
}

export async function routeCollaborationRoomRequest(request: Request, env: CloudflareCollaborationRoomEnv) {
  const parsed = parseCollaborationRoomName(request);
  if (!parsed) return null;

  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  if (!env.COLLAB_ROOMS) {
    return Response.json({ ok: false, error: "collaboration_room_binding_missing" }, { status: 503 });
  }

  const id = env.COLLAB_ROOMS.idFromName(parsed.roomName);
  return env.COLLAB_ROOMS.get(id).fetch(request);
}
