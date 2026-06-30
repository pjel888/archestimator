const MAX_MESSAGE_BYTES = 4096;
const MAX_EVENT_NAME_LENGTH = 80;

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
  presence?: unknown;
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

function sendJson(ws: WebSocket, value: Record<string, unknown>) {
  try {
    ws.send(jsonMessage(value));
  } catch {
    ws.close(1011, "collaboration_room_send_failed");
  }
}

export class CollaborationRoom {
  private readonly ctx: DurableObjectStateLike;

  constructor(ctx: DurableObjectStateLike) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    if (!isWebSocketUpgrade(request)) {
      return Response.json({ ok: false, error: "websocket_upgrade_required" }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

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
      ws.serializeAttachment?.({ presence: parsed.payload } satisfies SocketAttachment);
      this.broadcastPresenceState();
      return;
    }

    if (parsed.type === "presence-untrack") {
      ws.serializeAttachment?.({} satisfies SocketAttachment);
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
      sendJson(peer, payload);
    }
  }

  private broadcastPresenceState(exclude?: WebSocket) {
    const state = this.readPresenceState(exclude);
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === exclude) continue;
      sendJson(peer, { type: "presence-state", state });
    }
  }

  private readPresenceState(exclude?: WebSocket) {
    const state: Record<string, unknown[]> = {};
    let index = 0;
    for (const socket of this.ctx.getWebSockets() as WebSocketWithAttachment[]) {
      if (socket === exclude) continue;
      const attachment = socket.deserializeAttachment?.<SocketAttachment>();
      if (attachment && Object.hasOwn(attachment, "presence")) {
        state[`connection:${index}`] = [attachment.presence];
      }
      index += 1;
    }
    return state;
  }
}
