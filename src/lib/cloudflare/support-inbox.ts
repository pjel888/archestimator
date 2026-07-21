import {
  readRealtimeRoomTokenSecret,
  verifyRealtimeRoomToken,
  type RealtimeRoomTokenClaims,
} from "@/lib/collaboration/realtime-room-token";

const MAX_MESSAGE_BYTES = 8192;
const SUPPORT_INBOX_PATH_PREFIX = "/__cloudflare/support-inbox/";

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
  authorized?: RealtimeRoomTokenClaims;
  conversationId?: string;
};

function isWebSocketUpgrade(request: Request) {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

function readConversationIdFromRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(SUPPORT_INBOX_PATH_PREFIX)) return null;
  const conversationId = decodeURIComponent(url.pathname.slice(SUPPORT_INBOX_PATH_PREFIX.length)).trim();
  return conversationId || null;
}

function parseClientMessage(message: string) {
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function parseInvalidation(value: Record<string, unknown>, conversationId: string) {
  if (
    value.type !== "support_message_created"
    || value.conversationId !== conversationId
    || typeof value.messageId !== "string"
    || !value.messageId.trim()
    || value.messageId.length > 200
  ) return null;
  return { type: "support_message_created" as const, conversationId, messageId: value.messageId.trim() };
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length).trim();
  return request.headers.get("x-realtime-room-token")?.trim() || null;
}

function readRealtimeRoomTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token) return token;
  }

  const headerToken = request.headers.get("x-realtime-room-token")?.trim();
  if (headerToken) return headerToken;

  const queryToken = new URL(request.url).searchParams.get("token")?.trim();
  return queryToken || null;
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
      const token = readRealtimeRoomTokenFromRequest(request);
      const authorized = secret && token
        ? await verifyRealtimeRoomToken({
            expectedTopic: conversationId,
            secret,
            token,
          })
        : null;
      if (!authorized) {
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
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket });
    }

    if (request.method === "POST") {
      return this.handleFanoutPost(request, conversationId);
    }

    return Response.json({ ok: false, error: "websocket_upgrade_or_post_required" }, { status: 405 });
  }

  async webSocketMessage(ws: WebSocketWithAttachment, message: ArrayBuffer | string) {
    if (typeof message !== "string") {
      sendJson(ws, { type: "error", code: "binary_not_supported" });
      return;
    }

    if (new TextEncoder().encode(message).byteLength > MAX_MESSAGE_BYTES) {
      sendJson(ws, { type: "error", code: "message_too_large" });
      return;
    }

    const parsed = parseClientMessage(message);
    if (!parsed) {
      sendJson(ws, { type: "error", code: "invalid_json" });
      return;
    }

    if (parsed.type === "authorize") {
      await this.authorizeSocket(ws, parsed.token);
      return;
    }

    if (!this.isSocketAuthorized(ws)) {
      sendJson(ws, { type: "error", code: "auth_required" });
      return;
    }

    sendJson(ws, { type: "error", code: "client_messages_not_supported" });
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket) {
    ws.close(1011, "support_inbox_error");
  }

  private async handleFanoutPost(request: Request, conversationId: string) {
    const secret = readRealtimeRoomTokenSecret(this.env);
    const token = readBearerToken(request);
    if (!secret || !token) {
      return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
    }

    const authorized = await verifyRealtimeRoomToken({
      expectedTopic: conversationId,
      secret,
      token,
    });
    if (!authorized) {
      return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_MESSAGE_BYTES) {
      return Response.json({ ok: false, error: "message_too_large" }, { status: 413 });
    }

    const parsed = parseClientMessage(bodyText);
    if (!parsed) {
      return Response.json({ ok: false, error: "invalid_message" }, { status: 400 });
    }
    const invalidation = parseInvalidation(parsed, conversationId);
    if (!invalidation) return Response.json({ ok: false, error: "invalid_message" }, { status: 400 });
    this.broadcastMessage(invalidation);
    return Response.json({ ok: true });
  }

  private broadcastMessage(message: { type: "support_message_created"; conversationId: string; messageId: string }) {
    for (const peer of this.ctx.getWebSockets()) {
      if (!this.isSocketAuthorized(peer as WebSocketWithAttachment)) continue;
      sendJson(peer, message);
    }
  }

  private async authorizeSocket(ws: WebSocketWithAttachment, token: unknown) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
    const conversationId = attachment.conversationId;
    const secret = readRealtimeRoomTokenSecret(this.env);
    if (typeof token !== "string" || !conversationId || !secret) {
      sendJson(ws, { type: "error", code: "auth_failed" });
      return;
    }

    const authorized = await verifyRealtimeRoomToken({
      expectedTopic: conversationId,
      secret,
      token,
    });
    if (!authorized) {
      sendJson(ws, { type: "error", code: "auth_failed" });
      return;
    }

    ws.serializeAttachment?.({ ...attachment, authorized } satisfies SocketAttachment);
    sendJson(ws, { type: "authorized" });
  }

  private isSocketAuthorized(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>();
    if (!attachment?.authorized || !attachment.conversationId) return false;
    if (attachment.authorized.topic !== attachment.conversationId) return false;
    return attachment.authorized.exp * 1000 > Date.now();
  }
}
