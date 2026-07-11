import {
  hasRealtimeRoomCapability,
  readCollaborationRoomTokenSecret,
  verifyRealtimeRoomToken,
  type RealtimeRoomTokenClaims,
} from "@/lib/collaboration/realtime-room-token";

const MAX_MESSAGE_BYTES = 4096;
const MAX_EVENT_NAME_LENGTH = 80;
const MAX_ROOM_CONNECTIONS = 100;
const MAX_INBOUND_FRAMES_PER_SECOND = 30;
const MAX_CURSOR_COORDINATE_PX = 1_000_000;
const INBOUND_FRAME_WINDOW_MS = 1_000;
const COLLABORATION_ROOM_PATH_PREFIX = "/__cloudflare/collaboration-room/";
const AUTHORIZATION_TIMEOUT_MS = 10_000;
const CONTROL_SECRET_HEADER = "x-collaboration-room-control-secret";

type DurableObjectStateLike = {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
  storage?: {
    setAlarm(scheduledTime: number | Date): Promise<void>;
  };
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
  authorizationDeadlineAt?: number;
  presence?: unknown;
  rateWindowFrameCount?: number;
  rateWindowStartedAt?: number;
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
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isValidEventName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_EVENT_NAME_LENGTH
  );
}

function readRoomNameFromRequest(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(COLLABORATION_ROOM_PATH_PREFIX)) return null;
  const roomName = decodeURIComponent(
    url.pathname.slice(COLLABORATION_ROOM_PATH_PREFIX.length),
  ).trim();
  return roomName || null;
}

function sendJson(ws: WebSocket, value: Record<string, unknown>) {
  try {
    ws.send(jsonMessage(value));
  } catch {
    ws.close(1011, "collaboration_room_send_failed");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCursorPayload(
  value: unknown,
  claims: RealtimeRoomTokenClaims,
  roomName: string,
) {
  if (!isRecord(value)) return false;
  if (!isBoundedCoordinate(value.x) || !isBoundedCoordinate(value.y))
    return false;
  if (!isUnitFractionOrNull(value.fracX) || !isUnitFractionOrNull(value.fracY))
    return false;
  if (typeof value.userId === "string" && value.userId !== claims.sub)
    return false;
  if (!isRecord(value.envelope)) return false;
  return (
    value.envelope.sub === claims.sub &&
    value.envelope.topic === roomName &&
    typeof value.envelope.sig === "string"
  );
}

function isBoundedCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_CURSOR_COORDINATE_PX
  );
}

function isUnitFractionOrNull(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1)
  );
}

function isValidRowUpdatePayload(value: unknown, roomName: string) {
  if (!isRecord(value) || !roomName.startsWith("estimate:")) return false;
  if (value.estimateId !== roomName.slice("estimate:".length)) return false;
  if (
    typeof value.rowId !== "string" ||
    !value.rowId ||
    value.rowId.length > 200
  )
    return false;
  if (
    typeof value.rowRevision !== "number" ||
    !Number.isInteger(value.rowRevision) ||
    value.rowRevision < 0
  )
    return false;
  if (
    typeof value.sentAt !== "string" ||
    !Number.isFinite(Date.parse(value.sentAt))
  )
    return false;
  return (
    Number.isFinite(value.quantity) &&
    Number.isFinite(value.contingencyPercentage) &&
    (value.quantityBase === null || Number.isFinite(value.quantityBase)) &&
    (value.quantityContingencyAmount === null ||
      Number.isFinite(value.quantityContingencyAmount))
  );
}

export class CollaborationRoom {
  private readonly ctx: DurableObjectStateLike;
  private readonly env: Record<string, unknown>;

  constructor(ctx: DurableObjectStateLike, env: Record<string, unknown> = {}) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const controlResponse = await this.handleControlRequest(request);
    if (controlResponse) return controlResponse;

    if (!isWebSocketUpgrade(request)) {
      return Response.json(
        { ok: false, error: "websocket_upgrade_required" },
        { status: 426 },
      );
    }

    if (this.ctx.getWebSockets().length >= MAX_ROOM_CONNECTIONS) {
      return Response.json(
        { ok: false, error: "room_capacity_exceeded" },
        { status: 429 },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const roomName = readRoomNameFromRequest(request);
    if (!roomName) {
      return Response.json(
        { ok: false, error: "invalid_room" },
        { status: 400 },
      );
    }

    const authorizationDeadlineAt = Date.now() + AUTHORIZATION_TIMEOUT_MS;
    (server as WebSocketWithAttachment).serializeAttachment?.({
      roomName,
      authorizationDeadlineAt,
    } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    await this.scheduleAuthorizationDeadline();

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }

  async webSocketMessage(
    ws: WebSocketWithAttachment,
    message: ArrayBuffer | string,
  ) {
    if (!this.recordInboundFrame(ws)) {
      sendJson(ws, { type: "error", code: "rate_limited" });
      ws.close(4408, "rate_limited");
      return;
    }

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
      const claims = this.readAuthorizedClaims(ws);
      const roomName = ws.deserializeAttachment?.<SocketAttachment>()?.roomName;
      if (!claims || !roomName) {
        sendJson(ws, { type: "error", code: "capability_denied" });
        return;
      }
      const authorizationError = this.readBroadcastAuthorizationError(
        claims,
        roomName,
        parsed.event,
        parsed.payload,
      );
      if (authorizationError) {
        sendJson(ws, { type: "error", code: authorizationError });
        return;
      }
      this.broadcast(ws, {
        type: "broadcast",
        event: parsed.event,
        payload:
          parsed.event === "cursor" && isRecord(parsed.payload)
            ? { ...parsed.payload, userId: claims.sub }
            : (parsed.payload ?? null),
      });
      return;
    }

    if (parsed.type === "presence-track") {
      const claims = this.readAuthorizedClaims(ws);
      if (!claims || !hasRealtimeRoomCapability(claims, "presence:write")) {
        sendJson(ws, { type: "error", code: "capability_denied" });
        return;
      }
      const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
      ws.serializeAttachment?.({
        ...attachment,
        presence: parsed.payload,
      } satisfies SocketAttachment);
      this.broadcastPresenceState();
      return;
    }

    if (parsed.type === "presence-untrack") {
      const claims = this.readAuthorizedClaims(ws);
      if (!claims || !hasRealtimeRoomCapability(claims, "presence:write")) {
        sendJson(ws, { type: "error", code: "capability_denied" });
        return;
      }
      const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
      const { presence: _presence, ...withoutPresence } = attachment;
      ws.serializeAttachment?.(withoutPresence satisfies SocketAttachment);
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

  async alarm() {
    const now = Date.now();
    for (const socket of this.ctx.getWebSockets() as WebSocketWithAttachment[]) {
      const attachment = socket.deserializeAttachment?.<SocketAttachment>();
      if (
        !attachment?.authorized &&
        attachment?.authorizationDeadlineAt !== undefined &&
        attachment.authorizationDeadlineAt <= now
      ) {
        sendJson(socket, { type: "error", code: "auth_timeout" });
        socket.serializeAttachment?.({
          roomName: attachment.roomName,
        } satisfies SocketAttachment);
        socket.close(4401, "authorization_timeout");
      }
    }
    await this.scheduleAuthorizationDeadline();
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
    const secret = readCollaborationRoomTokenSecret(this.env);
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
    if (authorized.v !== 2) {
      sendJson(ws, { type: "error", code: "unsupported_token_version" });
      return;
    }

    const {
      authorizationDeadlineAt: _authorizationDeadlineAt,
      ...authorizedAttachment
    } = attachment;
    ws.serializeAttachment?.({
      ...authorizedAttachment,
      authorized,
    } satisfies SocketAttachment);
    sendJson(ws, {
      type: "authorized",
      sub: authorized.sub,
      capabilities: authorized.capabilities,
    });
    await this.scheduleAuthorizationDeadline();
  }

  private isSocketAuthorized(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>();
    if (
      !attachment?.authorized ||
      attachment.authorized.v !== 2 ||
      !attachment.roomName
    )
      return false;
    if (attachment.authorized.topic !== attachment.roomName) return false;
    return attachment.authorized.exp * 1000 > Date.now();
  }

  private readAuthorizedClaims(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>();
    return this.isSocketAuthorized(ws)
      ? (attachment?.authorized ?? null)
      : null;
  }

  private readBroadcastAuthorizationError(
    claims: RealtimeRoomTokenClaims,
    roomName: string,
    event: string,
    payload: unknown,
  ):
    "capability_denied" | "invalid_event_payload" | "unsupported_event" | null {
    if (event === "cursor") {
      if (!hasRealtimeRoomCapability(claims, "broadcast:cursor"))
        return "capability_denied";
      return isValidCursorPayload(payload, claims, roomName)
        ? null
        : "invalid_event_payload";
    }
    if (event === "row-update") {
      if (!hasRealtimeRoomCapability(claims, "broadcast:row-update"))
        return "capability_denied";
      return isValidRowUpdatePayload(payload, roomName)
        ? null
        : "invalid_event_payload";
    }
    return "unsupported_event";
  }

  private async scheduleAuthorizationDeadline() {
    if (!this.ctx.storage) return;
    const deadlines = (this.ctx.getWebSockets() as WebSocketWithAttachment[])
      .map(
        (socket) =>
          socket.deserializeAttachment?.<SocketAttachment>()
            ?.authorizationDeadlineAt,
      )
      .filter((deadline): deadline is number => typeof deadline === "number");
    if (deadlines.length > 0)
      await this.ctx.storage.setAlarm(Math.min(...deadlines));
  }

  private recordInboundFrame(ws: WebSocketWithAttachment) {
    const attachment = ws.deserializeAttachment?.<SocketAttachment>() ?? {};
    const now = Date.now();
    const startsNewWindow =
      attachment.rateWindowStartedAt === undefined ||
      now - attachment.rateWindowStartedAt >= INBOUND_FRAME_WINDOW_MS;
    const rateWindowStartedAt = startsNewWindow
      ? now
      : attachment.rateWindowStartedAt;
    const rateWindowFrameCount =
      (startsNewWindow ? 0 : (attachment.rateWindowFrameCount ?? 0)) + 1;
    ws.serializeAttachment?.({
      ...attachment,
      rateWindowStartedAt,
      rateWindowFrameCount,
    } satisfies SocketAttachment);
    return rateWindowFrameCount <= MAX_INBOUND_FRAMES_PER_SECOND;
  }

  private async handleControlRequest(
    request: Request,
  ): Promise<Response | null> {
    if (request.method !== "POST") return null;
    const configuredSecret =
      typeof this.env.COLLABORATION_ROOM_CONTROL_SECRET === "string"
        ? this.env.COLLABORATION_ROOM_CONTROL_SECRET.trim()
        : "";
    if (
      !configuredSecret ||
      request.headers.get(CONTROL_SECRET_HEADER) !== configuredSecret
    ) {
      return Response.json(
        { ok: false, error: "control_unauthorized" },
        { status: 401 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "invalid_control_payload" },
        { status: 400 },
      );
    }
    if (
      !isRecord(payload) ||
      payload.type !== "revoke-subject" ||
      typeof payload.sub !== "string" ||
      !payload.sub
    ) {
      return Response.json(
        { ok: false, error: "invalid_control_payload" },
        { status: 400 },
      );
    }

    let closed = 0;
    for (const socket of this.ctx.getWebSockets() as WebSocketWithAttachment[]) {
      if (this.readAuthorizedClaims(socket)?.sub !== payload.sub) continue;
      sendJson(socket, { type: "revoked" });
      socket.close(4403, "subject_revoked");
      closed += 1;
    }
    return Response.json({ ok: true, closed });
  }
}
