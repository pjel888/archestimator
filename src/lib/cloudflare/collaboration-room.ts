import {
  readRealtimeRoomTokenSecret,
  verifyRealtimeRoomToken,
  type RealtimeRoomTokenClaims,
} from "@/lib/collaboration/realtime-room-token";

const MAX_MESSAGE_BYTES = 4096;
const MAX_EVENT_NAME_LENGTH = 80;
const COLLABORATION_ROOM_PATH_PREFIX = "/__cloudflare/collaboration-room/";

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
  presence?: unknown;
  roomName?: string;
};

function isWebSocketUpgrade(request: Request) {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

function jsonMessage(value: Record<string, unknown>) {
  return JSON.stringify(value);
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

function isValidEventName(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_EVENT_NAME_LENGTH;
}

function readRoomNameFromRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(COLLABORATION_ROOM_PATH_PREFIX)) return null;
  const roomName = decodeURIComponent(url.pathname.slice(COLLABORATION_ROOM_PATH_PREFIX.length)).trim();
  return roomName || null;
}

function sendJson(ws: WebSocket, value: Record<string, unknown>) {
  try {
    ws.send(jsonMessage(value));
  } catch {
    ws.close(1011, "collaboration_room_send_failed");
  }
}

export class CollaborationRoom {
  private readonly ctx: DurableObjectStateLike;
  private readonly env: Record<string, unknown>;

  constructor(ctx: DurableObjectStateLike, env: Record<string, unknown> = {}) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (!isWebSocketUpgrade(request)) {
      return Response.json({ ok: false, error: "websocket_upgrade_required" }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const roomName = readRoomNameFromRequest(request);
    if (!roomName) {
      return Response.json({ ok: false, error: "invalid_room" }, { status: 400 });
    }

    (server as WebSocketWithAttachment).serializeAttachment?.({ roomName } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);

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

    if (parsed.type === "broadcast") {
      if (!isValidEventName(parsed.event)) {
        sendJson(ws, { type: "error", code: "invalid_event" });
        return;
      }
      this.broadcast(ws, {
        type: "broadcast",
        event: parsed.event,
        payload: parsed.payload ?? null,
      });
      return;
    }

    if (parsed.type === "presence-track") {
      const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
      ws.serializeAttachment?.({ ...attachment, presence: parsed.payload } satisfies SocketAttachment);
      this.broadcastPresenceState();
      return;
    }

    if (parsed.type === "presence-untrack") {
      const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
      ws.serializeAttachment?.({ roomName: attachment.roomName, authorized: attachment.authorized } satisfies SocketAttachment);
      this.broadcastPresenceState();
      return;
    }

    sendJson(ws, { type: "error", code: "unsupported_message" });
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.broadcastPresenceState(ws);
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastPresenceState(ws);
    ws.close(1011, "collaboration_room_error");
  }

  private broadcast(sender: WebSocket, payload: Record<string, unknown>) {
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === sender) continue;
      if (!this.isSocketAuthorized(peer as WebSocketWithAttachment)) continue;
      sendJson(peer, payload);
    }
  }

  private broadcastPresenceState(exclude?: WebSocket) {
    const state = this.readPresenceState(exclude);
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === exclude) continue;
      if (!this.isSocketAuthorized(peer as WebSocketWithAttachment)) continue;
      sendJson(peer, { type: "presence-state", state });
    }
  }

  private readPresenceState(exclude?: WebSocket) {
    const state: Record<string, unknown[]> = {};
    let index = 0;
    for (const socket of this.ctx.getWebSockets() as WebSocketWithAttachment[]) {
      if (socket === exclude) continue;
      if (!this.isSocketAuthorized(socket)) {
        index += 1;
        continue;
      }
      const attachment = socket.deserializeAttachment?.<SocketAttachment>();
      if (attachment && Object.hasOwn(attachment, "presence")) {
        state[`connection:${index}`] = [attachment.presence];
      }
      index += 1;
    }
    return state;
  }

  private async authorizeSocket(ws: WebSocketWithAttachment, token: unknown) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
    const roomName = attachment.roomName;
    const secret = readRealtimeRoomTokenSecret(this.env);
    if (typeof token !== "string" || !roomName || !secret) {
      sendJson(ws, { type: "error", code: "auth_failed" });
      return;
    }

    const authorized = await verifyRealtimeRoomToken({
      expectedTopic: roomName,
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
    if (!attachment?.authorized || !attachment.roomName) return false;
    if (attachment.authorized.topic !== attachment.roomName) return false;
    return attachment.authorized.exp * 1000 > Date.now();
  }
}
