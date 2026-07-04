"use client";

const COLLABORATION_ROOM_PATH_PREFIX = "/__cloudflare/collaboration-room/";
const SUBSCRIBE_TIMEOUT_MS = 10_000;

export type CollaborationRoomStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

export type CollaborationRoomLike = {
  authorize(token: string): Promise<"ok" | "timed out"> | "ok" | "timed out";
  on(type: "presence", filter: { event: "sync" }, callback: () => void): CollaborationRoomLike;
  on(type: "broadcast", filter: { event: string }, callback: (message: { payload: unknown }) => void): CollaborationRoomLike;
  subscribe(callback?: (status: CollaborationRoomStatus) => void): CollaborationRoomLike;
  send(message: { type: "broadcast"; event: string; payload: unknown }): Promise<"ok" | "timed out"> | "ok" | "timed out";
  track(payload: unknown): Promise<"ok" | "timed out"> | "ok" | "timed out";
  untrack(): Promise<"ok" | "timed out"> | "ok" | "timed out";
  presenceState(): Record<string, unknown[]>;
  close(): void;
};

export type CollaborationRoomClientLike = {
  openRoom(roomName: string): CollaborationRoomLike;
  closeRoom(room: CollaborationRoomLike): unknown;
};

type BroadcastListener = (message: { payload: unknown }) => void;

function buildCollaborationRoomUrl(roomName: string) {
  const base = typeof window === "undefined" ? "http://localhost" : window.location.href;
  const url = new URL(`${COLLABORATION_ROOM_PATH_PREFIX}${encodeURIComponent(roomName)}`, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function parseRoomMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function isOpen(socket: WebSocket | null) {
  return Boolean(socket && socket.readyState === WebSocket.OPEN);
}

class CollaborationRoomBrowserSocket implements CollaborationRoomLike {
  private readonly url: string;
  private socket: WebSocket | null = null;
  private subscribeTimer: number | null = null;
  private readonly presenceSyncListeners = new Set<() => void>();
  private readonly broadcastListeners = new Map<string, Set<BroadcastListener>>();
  private currentPresenceState: Record<string, unknown[]> = {};

  constructor(roomName: string) {
    this.url = buildCollaborationRoomUrl(roomName);
  }

  on(type: "presence", filter: { event: "sync" }, callback: () => void): CollaborationRoomLike;
  on(type: "broadcast", filter: { event: string }, callback: BroadcastListener): CollaborationRoomLike;
  on(type: "presence" | "broadcast", filter: { event: string }, callback: (() => void) | BroadcastListener) {
    if (type === "presence" && filter.event === "sync") {
      this.presenceSyncListeners.add(callback as () => void);
      return this;
    }

    if (type === "broadcast") {
      const listeners = this.broadcastListeners.get(filter.event) ?? new Set<BroadcastListener>();
      listeners.add(callback as BroadcastListener);
      this.broadcastListeners.set(filter.event, listeners);
    }

    return this;
  }

  subscribe(callback?: (status: CollaborationRoomStatus) => void) {
    if (this.socket) return this;

    const socket = new WebSocket(this.url);
    this.socket = socket;
    this.subscribeTimer = window.setTimeout(() => {
      callback?.("TIMED_OUT");
    }, SUBSCRIBE_TIMEOUT_MS);

    socket.addEventListener("open", () => {
      this.clearSubscribeTimer();
      callback?.("SUBSCRIBED");
    });
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      this.receive(event.data);
    });
    socket.addEventListener("error", () => {
      this.clearSubscribeTimer();
      callback?.("CHANNEL_ERROR");
    });
    socket.addEventListener("close", () => {
      this.clearSubscribeTimer();
      callback?.("CLOSED");
    });

    return this;
  }

  send(message: { type: "broadcast"; event: string; payload: unknown }) {
    return this.sendRaw(message);
  }

  authorize(token: string) {
    return this.sendRaw({ type: "authorize", token });
  }

  track(payload: unknown) {
    return this.sendRaw({ type: "presence-track", payload });
  }

  untrack() {
    return this.sendRaw({ type: "presence-untrack" });
  }

  presenceState() {
    return this.currentPresenceState;
  }

  close() {
    this.clearSubscribeTimer();
    if (isOpen(this.socket)) {
      void this.untrack();
    }
    this.socket?.close();
    this.socket = null;
    this.presenceSyncListeners.clear();
    this.broadcastListeners.clear();
    this.currentPresenceState = {};
  }

  private sendRaw(message: Record<string, unknown>) {
    if (!isOpen(this.socket)) return "timed out" as const;
    this.socket?.send(JSON.stringify(message));
    return "ok" as const;
  }

  private receive(raw: string) {
    const message = parseRoomMessage(raw);
    if (!message) return;

    if (message.type === "broadcast" && typeof message.event === "string") {
      const listeners = this.broadcastListeners.get(message.event);
      if (!listeners) return;
      for (const listener of listeners) {
        listener({ payload: message.payload });
      }
      return;
    }

    if (message.type === "authorized") {
      return;
    }

    if (message.type === "presence-state" && message.state && typeof message.state === "object" && !Array.isArray(message.state)) {
      this.currentPresenceState = message.state as Record<string, unknown[]>;
      for (const listener of this.presenceSyncListeners) {
        listener();
      }
    }
  }

  private clearSubscribeTimer() {
    if (!this.subscribeTimer) return;
    window.clearTimeout(this.subscribeTimer);
    this.subscribeTimer = null;
  }
}

export function createCloudflareCollaborationRoomClient(): CollaborationRoomClientLike {
  return {
    openRoom(roomName) {
      return new CollaborationRoomBrowserSocket(roomName);
    },
    closeRoom(room) {
      room.close();
    },
  };
}
