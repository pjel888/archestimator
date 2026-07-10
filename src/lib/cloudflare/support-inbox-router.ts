const SUPPORT_INBOX_PATH_PREFIX = "/__cloudflare/support-inbox/";
const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9:_-]{3,200}$/;

type DurableObjectStubLike = {
  fetch(request: Request): Promise<Response> | Response;
};

type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

export type CloudflareSupportInboxEnv = {
  SUPPORT_INBOX?: DurableObjectNamespaceLike | null;
};

export function parseSupportInboxConversationId(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(SUPPORT_INBOX_PATH_PREFIX)) return null;

  const conversationId = decodeURIComponent(url.pathname.slice(SUPPORT_INBOX_PATH_PREFIX.length)).trim();
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) {
    return { ok: false as const, error: "invalid_conversation" };
  }

  return { ok: true as const, conversationId };
}

export async function routeSupportInboxRequest(request: Request, env: CloudflareSupportInboxEnv) {
  const parsed = parseSupportInboxConversationId(request);
  if (!parsed) return null;

  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  if (!env.SUPPORT_INBOX) {
    return Response.json({ ok: false, error: "support_inbox_binding_missing" }, { status: 503 });
  }

  const id = env.SUPPORT_INBOX.idFromName(parsed.conversationId);
  return env.SUPPORT_INBOX.get(id).fetch(request);
}
