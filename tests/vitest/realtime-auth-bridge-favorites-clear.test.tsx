import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

describe("RealtimeAuthBridge favorites clear on logout (13 C5 / QA-17)", () => {
  it("removes favorites cache entries when SIGNED_OUT fires", async () => {
    const queryClient = new QueryClient();
    const scope = { workspaceId: "ws-1", userId: "user-1" };
    queryClient.setQueryData(favoritesQueryKeys.sidebar(scope), [{ id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001", href: "/workshop/projects/p1", favoriteCreatedAt: "2026-06-16T00:00:00Z", favoriteEstimateSheets: [] }]);
    render(<QueryClientProvider client={queryClient}><RealtimeAuthBridge /></QueryClientProvider>);
    expect(authCallback).toBeTypeOf("function");
    authCallback?.("SIGNED_OUT", null);
    expect(queryClient.getQueryData(favoritesQueryKeys.sidebar(scope))).toBeUndefined();
    expect(queryClient.getQueryCache().findAll({ queryKey: favoritesQueryKeys.all() }).length).toBe(0);
  });
});
