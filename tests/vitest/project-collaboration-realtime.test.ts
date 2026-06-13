import { readFileSync } from "node:fs";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PRESENCE_STATE_PURPOSE,
  type PresenceChannelLike,
  type PresenceClientLike,
  type ProjectPresencePayload,
  useProjectPresence,
} from "@/hooks/use-project-presence";

const presenceHook = readFileSync("src/hooks/use-project-presence.ts", "utf8");
const cursorHook = readFileSync("src/hooks/use-estimate-cursor-broadcast.ts", "utf8");
const collaborationColors = readFileSync("src/lib/collaboration/colors.ts", "utf8");
const estimateSheetContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");

// --- Fake realtime transport (T0.3 seam) -----------------------------------
type FakeChannel = PresenceChannelLike & {
  __name: string;
  __tracked: ProjectPresencePayload[];
  __emit: (status: string) => void;
  __setPresence: (state: Record<string, ProjectPresencePayload[]>) => void;
};

type FakeClient = PresenceClientLike & {
  __channels: FakeChannel[];
  __removed: FakeChannel[];
};

function createFakeClient(): FakeClient {
  const channels: FakeChannel[] = [];
  const removed: FakeChannel[] = [];

  const client: FakeClient = {
    __channels: channels,
    __removed: removed,
    channel(name) {
      let presence: Record<string, ProjectPresencePayload[]> = {};
      let syncHandler: (() => void) | null = null;
      let subscribeCallback: ((status: string) => void) | null = null;
      const tracked: ProjectPresencePayload[] = [];

      const channel: FakeChannel = {
        __name: name,
        __tracked: tracked,
        on(_type, filter, callback) {
          if (filter.event === "sync") syncHandler = callback;
          return channel;
        },
        subscribe(callback) {
          subscribeCallback = callback ?? null;
          return channel;
        },
        track(payload) {
          tracked.push(payload);
          return Promise.resolve("ok");
        },
        untrack() {
          return Promise.resolve("ok");
        },
        presenceState() {
          return presence;
        },
        __emit(status) {
          subscribeCallback?.(status);
        },
        __setPresence(state) {
          presence = state;
          syncHandler?.();
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel(channel) {
      removed.push(channel as FakeChannel);
      return Promise.resolve("ok");
    },
  };

  return client;
}

describe("useProjectPresence — payload scope & lifecycle (T1.1 / T0.3)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks ONLY coarse fields — no raw route, estimate, tab, or cell leaks", () => {
    const client = createFakeClient();
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        activeSurface: "estimates",
        clientFactory: () => client,
      }),
    );

    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
    });

    const payload = client.__channels[0]?.__tracked.at(-1);
    expect(payload).toBeTruthy();
    expect(payload?.purpose).toBe(PRESENCE_STATE_PURPOSE);
    expect(payload?.userId).toBe("user-a");
    expect(payload?.activeSurface).toBe("estimates");
    // The exact key set is the security boundary — assert nothing else rides along.
    expect(Object.keys(payload as object).sort()).toEqual(["activeSurface", "onlineAt", "purpose", "userId"]);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/activeRoute|activeEstimateId|activeTabId|focusedCell/);
    expect(serialized).not.toMatch(/\/workshop\//); // no raw pathname
    expect(result.current.status).toBe("subscribed");
  });

  it("source declares no sheet-granular project-presence property (G2/G14)", () => {
    // Property declarations / payload keys — not prose. (The doc comment names
    // the removed fields to explain WHY they were removed.)
    expect(presenceHook).not.toMatch(/activeRoute\s*[:,]/);
    expect(presenceHook).not.toMatch(/activeEstimateId\s*[:,]/);
    expect(presenceHook).not.toMatch(/focusedCell\s*[:,]/);
    expect(presenceHook).not.toMatch(/activeTabId\s*[:,]/);
    expect(presenceHook).toContain("activeSurface");
    expect(presenceHook).toContain("config: { private: true }");
  });

  it("builds the online roster from presence sync state", () => {
    const client = createFakeClient();
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        activeSurface: "overview",
        clientFactory: () => client,
      }),
    );

    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
      client.__channels[0]?.__setPresence({
        keyA: [{ purpose: PRESENCE_STATE_PURPOSE, userId: "user-a", activeSurface: "overview", onlineAt: "t1" }],
        keyB: [{ purpose: PRESENCE_STATE_PURPOSE, userId: "user-b", activeSurface: "estimates", onlineAt: "t2" }],
      });
    });

    expect(result.current.onlineUserIds.has("user-a")).toBe(true);
    expect(result.current.onlineUserIds.has("user-b")).toBe(true);
    expect(result.current.entries.get("user-b")?.activeSurface).toBe("estimates");
  });

  it("ignores an unknown/garbage activeSurface from the wire (coerces to 'other')", () => {
    const client = createFakeClient();
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        clientFactory: () => client,
      }),
    );
    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
      client.__channels[0]?.__setPresence({
        evil: [{ purpose: PRESENCE_STATE_PURPOSE, userId: "user-x", activeSurface: "/workshop/projects/secret" as never, onlineAt: "t" }],
      });
    });
    expect(result.current.entries.get("user-x")?.activeSurface).toBe("other");
  });

  it("cleans up the channel on unmount and holds only one live channel (StrictMode guard)", () => {
    const client = createFakeClient();
    const { unmount } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        clientFactory: () => client,
      }),
    );
    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
    });
    expect(client.__channels.length).toBe(1);
    unmount();
    expect(client.__removed.length).toBe(1);
    expect(client.__removed[0]).toBe(client.__channels[0]);
  });

  it("re-subscribes after a CLOSED status (recovery)", () => {
    vi.useFakeTimers();
    const client = createFakeClient();
    renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        clientFactory: () => client,
      }),
    );
    act(() => {
      client.__channels[0]?.__emit("CLOSED");
    });
    expect(client.__channels.length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    // A recovery channel was opened, and the prior one was removed.
    expect(client.__channels.length).toBe(2);
    expect(client.__removed).toContain(client.__channels[0]);
  });

  it("does not subscribe when disabled or missing identity", () => {
    const client = createFakeClient();
    renderHook(() =>
      useProjectPresence({ projectId: null, currentUser: { id: "user-a" }, clientFactory: () => client }),
    );
    expect(client.__channels.length).toBe(0);
  });
});

describe("estimate cursor layer wiring (source contract)", () => {
  it("keeps the channel/transport contract for cursors", () => {
    expect(cursorHook).toContain('export const ESTIMATE_COLLABORATION_CHANNEL_PREFIX = "estimate:"');
    expect(cursorHook).toContain('export const CURSOR_BROADCAST_EVENT = "cursor"');
    expect(cursorHook).toContain("config: { private: true }");
    expect(cursorHook).toContain('.on("broadcast", { event: CURSOR_BROADCAST_EVENT }');
    expect(cursorHook).toContain('type: "broadcast"');
  });

  it("mounts a non-interactive visible remote cursor layer in the estimate sheet", () => {
    expect(collaborationColors).toContain("getCollaborationColorForUser");
    expect(estimateSheetContent).toContain("useEstimateCursorCollaboration");
    expect(estimateSheetContent).toContain("RemoteEstimateCursorsOverlay");
    expect(estimateSheetContent).toContain("data-estimate-cursor-layer");
    expect(estimateSheetContent).toContain("function EstimateSheetCursorLayer");
    expect(estimateSheetContent).toContain('surface.addEventListener("pointermove"');
    expect(estimateSheetContent).toContain("<EstimateSheetCursorLayer");
  });
});
