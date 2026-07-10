const GLOBAL_PRESENCE_PATH = "/__cloudflare/global-presence";

type DurableObjectStubLike = {
  fetch(request: Request): Promise<Response> | Response;
};

type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

export type CloudflareGlobalPresenceEnv = {
  GLOBAL_PRESENCE?: DurableObjectNamespaceLike | null;
};

export function parseGlobalPresenceRequest(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== GLOBAL_PRESENCE_PATH) return null;
  return { ok: true as const };
}

export async function routeGlobalPresenceRequest(request: Request, env: CloudflareGlobalPresenceEnv) {
  const parsed = parseGlobalPresenceRequest(request);
  if (!parsed) return null;

  if (!env.GLOBAL_PRESENCE) {
    return Response.json({ ok: false, error: "global_presence_binding_missing" }, { status: 503 });
  }

  const id = env.GLOBAL_PRESENCE.idFromName("global");
  return env.GLOBAL_PRESENCE.get(id).fetch(request);
}
