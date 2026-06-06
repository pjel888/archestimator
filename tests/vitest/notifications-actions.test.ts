import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const serviceRoleMocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
vi.mock("@/lib/supabase/service-role", () => serviceRoleMocks);

const deliveryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "11111111-1111-4111-8111-111111111111";

type BuilderCall = {
  method: string;
  args: unknown[];
};

function makeNotificationQueryBuilder(options: {
  data?: unknown;
  count?: number | null;
  maybeSingleData?: { id: string } | null;
  error?: { message?: string } | null;
} = {}) {
  const calls: BuilderCall[] = [];
  const builder = {
    calls,
    select(...args: unknown[]) {
      calls.push({ method: "select", args });
      return builder;
    },
    update(...args: unknown[]) {
      calls.push({ method: "update", args });
      return builder;
    },
    eq(...args: unknown[]) {
      calls.push({ method: "eq", args });
      return builder;
    },
    is(...args: unknown[]) {
      calls.push({ method: "is", args });
      return builder;
    },
    lt(...args: unknown[]) {
      calls.push({ method: "lt", args });
      return builder;
    },
    order(...args: unknown[]) {
      calls.push({ method: "order", args });
      return builder;
    },
    limit(...args: unknown[]) {
      calls.push({ method: "limit", args });
      return builder;
    },
    maybeSingle() {
      calls.push({ method: "maybeSingle", args: [] });
      return Promise.resolve({
        data: options.maybeSingleData === undefined ? { id: deliveryId } : options.maybeSingleData,
        error: options.error ?? null,
      });
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve({
        data: options.data ?? [],
        error: options.error ?? null,
        count: options.count ?? null,
      }).then(resolve, reject);
    },
  };
  return builder;
}

function makeSupabaseClient(builder = makeNotificationQueryBuilder()) {
  const from = vi.fn(() => builder);
  return { builder, client: { from } };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId });
});

describe("notification server actions and repository contract", () => {
  it("keeps exported actions current-user scoped and free of browser supplied user ids", () => {
    const source = readFileSync("src/lib/notifications/actions.ts", "utf8");

    expect(source).toContain('"use server"');
    expect(source).toContain("requireCurrentUserContext");
    expect(source).toContain("loadCurrentUserNotifications(");
    expect(source).toContain("markNotificationReadAction(deliveryId: string)");
    expect(source).toContain("dismissNotificationAction(deliveryId: string)");
    expect(source).toContain("acknowledgeReleaseAnnouncementAction(deliveryId: string)");
    expect(source).not.toMatch(/Action\([^)]*userId/);
  });

  it("clamps feed limits to 50 before querying", async () => {
    const { builder, client } = makeSupabaseClient();
    supabaseServerMocks.createSupabaseServerClient.mockResolvedValue(client);

    const actions = await import("@/lib/notifications/actions");
    const result = await actions.loadCurrentUserNotifications({ limit: 999 });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith("notification_deliveries");
    expect(builder.calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
    expect(builder.calls).toContainEqual({ method: "limit", args: [51] });
  });

  it("creates the service-role client only after current-user authentication", async () => {
    const callOrder: string[] = [];
    authMocks.requireCurrentUserContext.mockImplementation(async () => {
      callOrder.push("auth");
      return { userId };
    });
    const { builder, client } = makeSupabaseClient();
    serviceRoleMocks.createSupabaseServiceRoleClient.mockImplementation(() => {
      callOrder.push("service-role");
      return client;
    });

    const actions = await import("@/lib/notifications/actions");
    await expect(actions.markNotificationReadAction(deliveryId)).resolves.toEqual({ ok: true });

    expect(callOrder).toEqual(["auth", "service-role"]);
    expect(builder.calls).toContainEqual({ method: "eq", args: ["id", deliveryId] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
    expect(builder.calls).toContainEqual({
      method: "update",
      args: [expect.objectContaining({ read_at: expect.any(String), seen_at: expect.any(String) })],
    });
  });

  it("acknowledges release announcements by marking seen, read, and modal acknowledged", async () => {
    const { builder, client } = makeSupabaseClient();
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);

    const actions = await import("@/lib/notifications/actions");
    await expect(actions.acknowledgeReleaseAnnouncementAction(deliveryId)).resolves.toEqual({ ok: true });

    expect(builder.calls).toContainEqual({
      method: "update",
      args: [
        expect.objectContaining({
          modal_acknowledged_at: expect.any(String),
          read_at: expect.any(String),
          seen_at: expect.any(String),
        }),
      ],
    });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["id", deliveryId] });
    expect(builder.calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
  });

  it("returns not_found without leaking another user's delivery existence", async () => {
    const { client } = makeSupabaseClient(makeNotificationQueryBuilder({ maybeSingleData: null }));
    serviceRoleMocks.createSupabaseServiceRoleClient.mockReturnValue(client);

    const actions = await import("@/lib/notifications/actions");

    await expect(actions.dismissNotificationAction(deliveryId)).resolves.toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("rejects invalid delivery ids before creating a service-role client", async () => {
    const actions = await import("@/lib/notifications/actions");

    await expect(actions.markNotificationReadAction("not-a-uuid")).resolves.toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledTimes(1);
    expect(serviceRoleMocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("rejects unsafe action hrefs at the server mapper boundary", async () => {
    const { isAllowedNotificationActionHref } = await import("@/lib/notifications/release-announcements");

    expect(isAllowedNotificationActionHref(null)).toBe(true);
    expect(isAllowedNotificationActionHref("/workshop")).toBe(true);
    expect(isAllowedNotificationActionHref("/workshop/projects")).toBe(true);
    expect(isAllowedNotificationActionHref("https://example.com")).toBe(false);
    expect(isAllowedNotificationActionHref("//example.com")).toBe(false);
    expect(isAllowedNotificationActionHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedNotificationActionHref("/share/token")).toBe(false);
    expect(isAllowedNotificationActionHref("/workshop/%2fshare")).toBe(false);
    expect(isAllowedNotificationActionHref("/workshop/projects bad")).toBe(false);
  });

  it("returns safe unavailable errors when the service-role mutation fails", async () => {
    serviceRoleMocks.createSupabaseServiceRoleClient.mockImplementation(() => {
      throw new Error("missing service role key");
    });

    const actions = await import("@/lib/notifications/actions");

    await expect(actions.markNotificationReadAction(deliveryId)).resolves.toEqual({
      ok: false,
      code: "unavailable",
    });
  });
});
