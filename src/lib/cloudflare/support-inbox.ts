import {
  hasRealtimeRoomCapability,
  readRealtimeRoomTokenSecret,
  verifyRealtimeRoomToken,
  type RealtimeRoomTokenClaims,
} from "@/lib/collaboration/realtime-room-token";
import {
  SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX,
  SUPPORT_REALTIME_FIXED_PROTOCOL,
} from "@/lib/support/realtime-protocol";

const MAX_MESSAGE_BYTES = 8_192;
const SUPPORT_INBOX_PATH_PREFIX = "/__cloudflare/support-inbox/";
const SUPPORT_FANOUT_SUBJECT = "system:support-inbox-fanout";

type DurableObjectStateLike = {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
};

type WebSocketPairConstructor = new () => {
  0: WebSocket;
  1: WebSocket;
};

declare const WebSocketPair: WebSocketPairConstructor;

type WebSocketWithAttachment = WebSocket & {
  serializeAttachment?: (value: unknown) => void;
  deserializeAttachment?: <T>() => T | undefined;
};

type SocketAttachment = {
  authorized: RealtimeRoomTokenClaims;
  conversationId: string;
};

type SupportInvalidation =
  | { type: "support_message_created"; conversationId: string; messageId: string }
  | { type: "support_conversation_changed"; conversationId: string };

function isWebSocketUpgrade(request: Request) {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

function readConversationIdFromRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(SUPPORT_INBOX_PATH_PREFIX)) return null;
  const conversationId = decodeURIComponent(url.pathname.slice(SUPPORT_INBOX_PATH_PREFIX.length)).trim();
  return conversationId || null;
}

function parseJsonObject(message: string) {
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function parseInvalidation(value: Record<string, unknown>, conversationId: string): SupportInvalidation | null {
  if (value.conversationId !== conversationId) return null;
  if (value.type === "support_conversation_changed") {
    return { type: "support_conversation_changed", conversationId };
  }
  if (
    value.type !== "support_message_created"
    || typeof value.messageId !== "string"
    || !value.messageId.trim()
    || value.messageId.length > 200
  ) return null;
  return {
    type: "support_message_created",
    conversationId,
    messageId: value.messageId.trim(),
  };
}

function readInternalFanoutToken(request: Request) {
  const headerToken = request.headers.get("x-realtime-room-token")?.trim();
  if (headerToken) return headerToken;
  const authorization = request.headers.get("authorization")?.trim();
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim() || null
    : null;
}

function readSocketCredential(request: Request) {
  const offered = request.headers.get("sec-websocket-protocol");
  if (!offered) return null;
  const protocols = offered.split(",").map((value) => value.trim()).filter(Boolean);
  if (protocols.length !== 2) return null;
  const fixed = protocols.filter((value) => value === SUPPORT_REALTIME_FIXED_PROTOCOL);
  const credentials = protocols.filter((value) => value.startsWith(SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX));
  if (fixed.length !== 1 || credentials.length !== 1) return null;
  if (protocols.some((value) => value !== fixed[0] && value !== credentials[0])) return null;
  const token = credentials[0]?.slice(SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX.length) ?? "";
  return token && !token.includes(",") ? token : null;
}

function sendJson(ws: WebSocket, value: Record<string, unknown>) {
  try {
    ws.send(JSON.stringify(value));
  } catch {
    ws.close(1011, "support_inbox_send_failed");
  }
}

export class SupportInbox {
  private readonly ctx: DurableObjectStateLike;
  private readonly env: Record<string, unknown>;

  constructor(ctx: DurableObjectStateLike, env: Record<string, unknown> = {}) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const conversationId = readConversationIdFromRequest(request);
    if (!conversationId) {
      return Response.json({ ok: false, error: "invalid_conversation" }, { status: 400 });
    }

    if (isWebSocketUpgrade(request)) {
      const secret = readRealtimeRoomTokenSecret(this.env);
      const token = readSocketCredential(request);
      const authorized = secret && token
        ? await verifyRealtimeRoomToken({
            expectedAudience: "support-inbox",
            expectedTopic: conversationId,
            secret,
            token,
          })
        : null;
      if (!authorized || !hasRealtimeRoomCapability(authorized, "support:subscribe")) {
        return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      (server as WebSocketWithAttachment).serializeAttachment?.({
        authorized,
        conversationId,
      } satisfies SocketAttachment);
      this.ctx.acceptWebSocket(server);
      return new Response(null, {
        status: 101,
        headers: { "Sec-WebSocket-Protocol": SUPPORT_REALTIME_FIXED_PROTOCOL },
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket });
    }

    if (request.method === "POST") {
      return this.handleFanoutPost(request, conversationId);
    }
    return Response.json({ ok: false, error: "websocket_upgrade_or_post_required" }, { status: 405 });
  }

  async webSocketMessage(ws: WebSocketWithAttachment, message: ArrayBuffer | string) {
    if (typeof message === "string" && new TextEncoder().encode(message).byteLength > MAX_MESSAGE_BYTES) {
      sendJson(ws, { type: "error", code: "message_too_large" });
      return;
    }
    sendJson(ws, {
      type: "error",
      code: typeof message === "string" ? "client_messages_not_supported" : "binary_not_supported",
    });
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket) {
    ws.close(1011, "support_inbox_error");
  }

  private async handleFanoutPost(request: Request, conversationId: string) {
    const secret = readRealtimeRoomTokenSecret(this.env);
    const token = readInternalFanoutToken(request);
    if (!secret || !token) {
      return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
    }
    const authorized = await verifyRealtimeRoomToken({
      expectedAudience: "support-inbox",
      expectedTopic: conversationId,
      secret,
      token,
    });
    if (
      !authorized
      || authorized.sub !== SUPPORT_FANOUT_SUBJECT
      || !hasRealtimeRoomCapability(authorized, "support:fanout")
    ) {
      return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_MESSAGE_BYTES) {
      return Response.json({ ok: false, error: "message_too_large" }, { status: 413 });
    }
    const parsed = parseJsonObject(bodyText);
    const invalidation = parsed ? parseInvalidation(parsed, conversationId) : null;
    if (!invalidation) return Response.json({ ok: false, error: "invalid_message" }, { status: 400 });
    this.broadcastMessage(invalidation);
    return Response.json({ ok: true });
  }

  private broadcastMessage(message: SupportInvalidation) {
    for (const peer of this.ctx.getWebSockets()) {
      if (!this.isSocketAuthorized(peer as WebSocketWithAttachment)) continue;
      sendJson(peer, message);
    }
  }

  private isSocketAuthorized(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>();
    if (!attachment?.authorized || !attachment.conversationId) return false;
    if (attachment.authorized.topic !== attachment.conversationId) return false;
    if (!hasRealtimeRoomCapability(attachment.authorized, "support:subscribe")) return false;
    return attachment.authorized.exp * 1_000 > Date.now();
  }
}
