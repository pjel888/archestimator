import {
  issueRealtimeRoomToken,
  readRealtimeRoomTokenSecret,
} from "@/lib/collaboration/realtime-room-token";

type SupportInboxNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
};

type SupportInboxFanoutEnv = Record<string, unknown> & {
  SUPPORT_INBOX?: SupportInboxNamespaceLike | null;
};

export async function fanoutSupportInboxInvalidation(input: {
  env: SupportInboxFanoutEnv;
  conversationId: string;
  messageId: string;
  subject: string;
}) {
  const { env, conversationId, messageId, subject } = input;
  if (!env.SUPPORT_INBOX) return { degraded: false, skipped: true };

  const secret = readRealtimeRoomTokenSecret(env);
  if (!secret) {
    console.warn("support_inbox_fanout_skipped", { conversation_id: conversationId, message_id: messageId, subject });
    return { degraded: true, skipped: true };
  }

  try {
    const token = await issueRealtimeRoomToken({
      secret,
      sub: "system:support-inbox-fanout",
      topic: conversationId,
    });
    const stub = env.SUPPORT_INBOX.get(env.SUPPORT_INBOX.idFromName(conversationId));
    const response = await stub.fetch(
      new Request(`https://support-inbox.internal/__cloudflare/support-inbox/${encodeURIComponent(conversationId)}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ type: "support_message_created", conversationId, messageId }),
      }),
    );
    if (!response.ok) throw new Error(`support inbox fanout returned ${response.status}`);
    return { degraded: false, skipped: false };
  } catch {
    console.warn("support_inbox_fanout_failed", { conversation_id: conversationId, message_id: messageId, subject });
    return { degraded: true, skipped: false };
  }
}
