const MAX_MESSAGE_BYTES = 4096;

type DurableObjectStateLike = {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
};

type WebSocketPairConstructor = new () => {
  0: WebSocket;
  1: WebSocket;
};

declare const WebSocketPair: WebSocketPairConstructor;

function isWebSocketUpgrade(request: Request) {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

function jsonMessage(value: Record<string, unknown>) {
  return JSON.stringify(value);
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

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (typeof message !== "string") {
      ws.send(jsonMessage({ type: "error", code: "binary_not_supported" }));
      return;
    }

    if (new TextEncoder().encode(message).byteLength > MAX_MESSAGE_BYTES) {
      ws.send(jsonMessage({ type: "error", code: "message_too_large" }));
      return;
    }

    ws.send(jsonMessage({
      type: "ack",
      connectionCount: this.ctx.getWebSockets().length,
    }));
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }

  async webSocketError(ws: WebSocket) {
    ws.close(1011, "collaboration_room_error");
  }
}
