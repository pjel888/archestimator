import {
  readRealtimeRoomTokenSecret,
  verifyRealtimeRoomToken,
  type RealtimeRoomTokenClaims,
} from "@/lib/collaboration/realtime-room-token";

const MAX_MESSAGE_BYTES = 2048;
const GLOBAL_PRESENCE_PATH = "/__cloudflare/global-presence";
const GLOBAL_PRESENCE_TOPICS = ["global-presence", "global"] as const;
const PRESENCE_BROADCAST_DEBOUNCE_MS = 1000;

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
  topic?: string;
};

function isWebSocketUpgrade(request: Request) {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
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

function sendJson(ws: WebSocket, value: Record<string, unknown>) {
  try {
    ws.send(JSON.stringify(value));
  } catch {
    ws.close(1011, "global_presence_send_failed");
  }
}

export class GlobalPresence {
  private readonly ctx: DurableObjectStateLike;
  private readonly env: Record<string, unknown>;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectStateLike, env: Record<string, unknown> = {}) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== GLOBAL_PRESENCE_PATH) {
      return Response.json({ ok: false, error: "invalid_global_presence_path" }, { status: 400 });
    }
    if (!isWebSocketUpgrade(request)) {
      return Response.json({ ok: false, error: "websocket_upgrade_required" }, { status: 426 });
    }

    const secret = readRealtimeRoomTokenSecret(this.env);
    const token = readRealtimeRoomTokenFromRequest(request);
    const authorized = secret && token
      ? await this.verifyGlobalPresenceToken({ secret, token })
      : null;
    if (!authorized) {
      return Response.json({ ok: false, error: "auth_failed" }, { status: 401 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    (server as WebSocketWithAttachment).serializeAttachment?.({
      authorized,
      topic: authorized.topic,
    } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    this.schedulePresenceCountBroadcast();

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
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

    sendJson(ws, { type: "error", code: "unsupported_message" });
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.broadcastPresenceCount(ws);
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastPresenceCount(ws);
    ws.close(1011, "global_presence_error");
  }

  private async authorizeSocket(ws: WebSocketWithAttachment, token: unknown) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
    const secret = readRealtimeRoomTokenSecret(this.env);
    if (typeof token !== "string" || !secret) {
      sendJson(ws, { type: "error", code: "auth_failed" });
      return;
    }

    const authorized = await this.verifyGlobalPresenceToken({ secret, token });
    if (!authorized) {
      sendJson(ws, { type: "error", code: "auth_failed" });
      return;
    }

    ws.serializeAttachment?.({ ...attachment, authorized, topic: authorized.topic } satisfies SocketAttachment);
    sendJson(ws, { type: "authorized" });
    this.schedulePresenceCountBroadcast();
  }

  private async verifyGlobalPresenceToken({
    secret,
    token,
  }: {
    secret: string;
    token: string;
  }) {
    for (const expectedTopic of GLOBAL_PRESENCE_TOPICS) {
      const authorized = await verifyRealtimeRoomToken({ expectedTopic, secret, token });
      if (authorized) return authorized;
    }
    return null;
  }

  private schedulePresenceCountBroadcast() {
    if (this.broadcastTimer) clearTimeout(this.broadcastTimer);
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      this.broadcastPresenceCount();
    }, PRESENCE_BROADCAST_DEBOUNCE_MS);
  }

  private broadcastPresenceCount(exclude?: WebSocket) {
    const count = this.readAuthorizedSocketCount(exclude);
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === exclude) continue;
      if (!this.isSocketAuthorized(peer as WebSocketWithAttachment)) continue;
      sendJson(peer, { type: "presence", count });
    }
  }

  private readAuthorizedSocketCount(exclude?: WebSocket) {
    let count = 0;
    for (const socket of this.ctx.getWebSockets() as WebSocketWithAttachment[]) {
      if (socket === exclude) continue;
      if (this.isSocketAuthorized(socket)) count += 1;
    }
    return count;
  }

  private isSocketAuthorized(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>();
    if (!attachment?.authorized) return false;
    if (!GLOBAL_PRESENCE_TOPICS.includes(attachment.authorized.topic as (typeof GLOBAL_PRESENCE_TOPICS)[number])) {
      return false;
    }
    return attachment.authorized.exp * 1000 > Date.now();
  }
}
