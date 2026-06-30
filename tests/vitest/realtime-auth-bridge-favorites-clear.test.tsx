import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
let authCallback: ((event: string, session: unknown) => void) | undefined;
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({
  auth: { getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: (cb: (e: string, s: unknown) => void) => { authCallback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; } },
  realtime: { setAuth: vi.fn(async () => undefined) } }) }));
vi.mock("@/lib/collaboration/realtime-telemetry", () => ({ reportRealtimeEvent: vi.fn() }));
import { RealtimeAuthBridge } from "@/components/realtime-auth-bridge";
afterEach(() => { authCallback = undefined; });

describe("RealtimeAuthBridge Cloudflare cutover shim", () => {
  it("does not mount Supabase Realtime auth listeners", async () => {
    const queryClient = new QueryClient();
    const scope = { workspaceId: "ws-1", userId: "user-1" };
    queryClient.setQueryData(favoritesQueryKeys.sidebar(scope), [{ id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001", href: "/workshop/projects/p1", favoriteCreatedAt: "2026-06-16T00:00:00Z", favoriteEstimateSheets: [] }]);
    render(<QueryClientProvider client={queryClient}><RealtimeAuthBridge /></QueryClientProvider>);
    expect(authCallback).toBeUndefined();
    expect(queryClient.getQueryData(favoritesQueryKeys.sidebar(scope))).toBeTruthy();
    const source = readFileSync("src/components/realtime-auth-bridge.tsx", "utf8");
    expect(source).not.toContain("createSupabaseBrowserClient");
    expect(source).not.toContain("setAuth");
    expect(source).not.toContain("onAuthStateChange");
  });
});
