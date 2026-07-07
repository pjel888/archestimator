import { readFileSync } from "node:fs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PRESENCE_STATE_PURPOSE,
  type PresenceChannelLike,
  type PresenceClientLike,
  type ProjectPresencePayload,
  useProjectPresence,
} from "@/hooks/use-project-presence";
import { useEstimateCursorCollaboration } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateRowUpdateBroadcast } from "@/hooks/use-estimate-row-update-broadcast";
import { isRealtimeTransportEnabled } from "@/lib/collaboration/feature-flags";
import { issueRealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity-server";

const presenceHook = readFileSync("src/hooks/use-project-presence.ts", "utf8");
const cursorHook = readFileSync("src/hooks/use-estimate-cursor-broadcast.ts", "utf8");
const rowUpdateHook = readFileSync("src/hooks/use-estimate-row-update-broadcast.ts", "utf8");
const collaborationColors = readFileSync("src/lib/collaboration/colors.ts", "utf8");
const estimateSheetContent = readFileSync("src/components/workshop/EstimateSheetContent.tsx", "utf8");
const featureFlags = readFileSync("src/lib/collaboration/feature-flags.ts", "utf8");
const realtimeIdentityServer = readFileSync("src/lib/collaboration/realtime-identity-server.ts", "utf8");

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
    openRoom(name) {
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
    closeRoom(channel) {
      removed.push(channel as FakeChannel);
      return Promise.resolve("ok");
    },
  };

  return client;
}

async function createPresenceIdentity(userId: string, topic: string) {
  const issued = await issueRealtimeIdentityEnvelope({ sub: userId, topic, role: "member" });
  return {
    identityIssuer: async () => ({
      envelope: issued.envelope,
      publicKey: issued.publicKey,
      userId,
      displayName: userId,
    }),
    payload(activeSurface: ProjectPresencePayload["activeSurface"] = "overview"): ProjectPresencePayload {
      return {
        purpose: PRESENCE_STATE_PURPOSE,
        userId,
        activeSurface,
        onlineAt: "t",
        envelope: issued.envelope,
      };
    },
  };
}

describe("useProjectPresence — payload scope & lifecycle (T1.1 / T0.3)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("tracks ONLY coarse fields — no raw route, estimate, tab, or cell leaks", async () => {
    const client = createFakeClient();
    const topic = "project:11111111-1111-1111-1111-111111111111";
    const { identityIssuer } = await createPresenceIdentity("user-a", topic);
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        activeSurface: "estimates",
        clientFactory: () => client,
        identityIssuer,
      }),
    );

    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
    });

    await waitFor(() => expect(client.__channels[0]?.__tracked.length).toBe(1));
    const payload = client.__channels[0]?.__tracked.at(-1);
    expect(payload).toBeTruthy();
    expect(payload?.purpose).toBe(PRESENCE_STATE_PURPOSE);
    expect(payload?.userId).toBe("user-a");
    expect(payload?.activeSurface).toBe("estimates");
    // The exact key set is the security boundary — assert nothing else rides along.
    expect(Object.keys(payload as object).sort()).toEqual(["activeSurface", "envelope", "onlineAt", "purpose", "userId"]);
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
    expect(presenceHook).toContain("createCloudflareCollaborationRoomClient");
    expect(presenceHook).toContain("openRoom(topic)");
    expect(presenceHook).toContain("verifyRealtimeIdentity");
  });

  it("does not derive realtime signing keys from Supabase service-role secrets", () => {
    expect(realtimeIdentityServer).toContain("REALTIME_IDENTITY_SIGNING_KEY");
    expect(realtimeIdentityServer).toContain("ARCHESTIMATOR_INVITE_TOKEN_PEPPER");
    expect(realtimeIdentityServer).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("builds the online roster from presence sync state", async () => {
    const client = createFakeClient();
    const topic = "project:11111111-1111-1111-1111-111111111111";
    const self = await createPresenceIdentity("user-a", topic);
    const other = await createPresenceIdentity("user-b", topic);
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        activeSurface: "overview",
        clientFactory: () => client,
        identityIssuer: self.identityIssuer,
      }),
    );

    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
    });
    await waitFor(() => expect(client.__channels[0]?.__tracked.length).toBe(1));
    act(() => {
      client.__channels[0]?.__setPresence({
        keyA: [self.payload("overview")],
        keyB: [other.payload("estimates")],
      });
    });

    await waitFor(() => expect(result.current.onlineUserIds.has("user-b")).toBe(true));
    expect(result.current.onlineUserIds.has("user-a")).toBe(true);
    expect(result.current.entries.get("user-b")?.activeSurface).toBe("estimates");
  });

  it("ignores an unknown/garbage activeSurface from the wire (coerces to 'other')", async () => {
    const client = createFakeClient();
    const topic = "project:11111111-1111-1111-1111-111111111111";
    const self = await createPresenceIdentity("user-a", topic);
    const remote = await createPresenceIdentity("user-x", topic);
    const { result } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        clientFactory: () => client,
        identityIssuer: self.identityIssuer,
      }),
    );
    act(() => {
      client.__channels[0]?.__emit("SUBSCRIBED");
    });
    await waitFor(() => expect(client.__channels[0]?.__tracked.length).toBe(1));
    act(() => {
      client.__channels[0]?.__setPresence({
        evil: [{ ...remote.payload(), activeSurface: "/workshop/projects/secret" as never }],
      });
    });
    await waitFor(() => expect(result.current.entries.get("user-x")?.activeSurface).toBe("other"));
  });

  it("cleans up the room on unmount and holds only one live room (StrictMode guard)", async () => {
    const client = createFakeClient();
    const topic = "project:11111111-1111-1111-1111-111111111111";
    const { identityIssuer } = await createPresenceIdentity("user-a", topic);
    const { unmount } = renderHook(() =>
      useProjectPresence({
        projectId: "11111111-1111-1111-1111-111111111111",
        currentUser: { id: "user-a" },
        clientFactory: () => client,
        identityIssuer,
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

  it("disables the default Cloudflare WebSocket transport in plain next dev", () => {
    expect(featureFlags).toContain("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT");
    expect(featureFlags).toContain("isRealtimeTransportEnabled");
    expect(featureFlags).toContain('process.env.NODE_ENV !== "development"');
    expect(presenceHook).toContain("isRealtimeTransportEnabled");
    expect(cursorHook).toContain("isRealtimeTransportEnabled");
    expect(rowUpdateHook).toContain("isRealtimeTransportEnabled");
  });

  it("keeps realtime transport off by default in development and overrideable", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "");
    expect(isRealtimeTransportEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "on");
    expect(isRealtimeTransportEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "off");
    expect(isRealtimeTransportEnabled()).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "");
    expect(isRealtimeTransportEnabled()).toBe(true);
  });

  it("does not open default realtime sockets or emit realtime telemetry in plain development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "");
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const WebSocketStub = vi.fn(() => {
      throw new Error("unexpected websocket in plain next dev");
    });
    vi.stubGlobal("WebSocket", WebSocketStub);

    const projectId = "11111111-1111-1111-1111-111111111111";
    const estimateId = "22222222-2222-2222-2222-222222222222";
    const presence = renderHook(() =>
      useProjectPresence({
        projectId,
        currentUser: { id: "user-a" },
        activeSurface: "estimates",
      }),
    );
    const cursors = renderHook(() =>
      useEstimateCursorCollaboration({
        estimateId,
        userId: "user-a",
      }),
    );
    const broadcastRowUpdate = renderHook(() =>
      useEstimateRowUpdateBroadcast({
        estimateId,
      }),
    );

    act(() => {
      cursors.result.current.broadcastCursor({
        tabId: null,
        x: 24,
        y: 12,
        rowId: "row-1",
        columnId: "quantity",
      });
      broadcastRowUpdate.result.current({
        rowId: "row-1",
        rowRevision: 1,
        quantity: 1,
        quantityBase: null,
        quantityContingencyAmount: null,
        contingencyPercentage: 0,
      });
    });

    await waitFor(() => {
      expect(presence.result.current.status).toBe("idle");
      expect(cursors.result.current.channelStatus).toBe("idle");
    });
    expect(WebSocketStub).not.toHaveBeenCalled();
    expect(
      consoleWarn.mock.calls.filter(([message]) =>
        typeof message === "string" && message.startsWith("[realtime:"),
      ),
    ).toEqual([]);
  });
});

describe("estimate cursor layer wiring (source contract)", () => {
  it("keeps the channel/transport contract for cursors", () => {
    expect(cursorHook).toContain('export const ESTIMATE_COLLABORATION_CHANNEL_PREFIX = "estimate:"');
    expect(cursorHook).toContain('export const CURSOR_BROADCAST_EVENT = "cursor"');
    expect(cursorHook).toContain("createCloudflareCollaborationRoomClient");
    expect(cursorHook).toContain("client.openRoom(topic)");
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
