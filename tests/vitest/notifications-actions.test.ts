import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);

const deliveryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "11111111-1111-4111-8111-111111111111";

class FakeD1Statement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    if (this.sql.includes("COUNT(*) AS count")) {
      return { count: this.database.unreadCount } as R;
    }
    return null;
  }

  async all<R>() {
    return { results: this.database.feedRows as R[] };
  }

  async run() {
    this.database.runStatements.push(this);
    return { success: true, meta: { changes: this.database.changes } };
  }
}

class FakeD1Database {
  changes = 1;
  feedRows: unknown[] = [];
  runStatements: FakeD1Statement[] = [];
  statements: FakeD1Statement[] = [];
  unreadCount = 0;

  prepare(sql: string) {
    const statement = new FakeD1Statement(this, sql);
    this.statements.push(statement);
    return statement;
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId });
  d1Mocks.getCloudflareD1Database.mockResolvedValue(new FakeD1Database());
});

describe("notification server actions and repository contract", () => {
  it("keeps exported actions current-user scoped, D1-backed, and free of browser supplied user ids", () => {
    const actions = readFileSync("src/lib/notifications/actions.ts", "utf8");
    const repository = readFileSync("src/lib/notifications/repository.ts", "utf8");
    const migration = readFileSync("migrations/0009_notifications.sql", "utf8");

    expect(actions).toContain('"use server"');
    expect(actions).toContain("requireCurrentUserContext");
    expect(actions).toContain("loadCurrentUserNotifications(");
    expect(actions).toContain("markNotificationReadAction(deliveryId: string)");
    expect(actions).toContain("dismissNotificationAction(deliveryId: string)");
    expect(actions).toContain("acknowledgeReleaseAnnouncementAction(deliveryId: string)");
    expect(actions).not.toMatch(/Action\([^)]*userId/);
    expect(`${actions}\n${repository}`).not.toMatch(/createSupabase|@\/lib\/supabase|@supabase\/supabase-js|SUPABASE_SERVICE_ROLE_KEY|serviceRole/);
    expect(repository).toContain("getCloudflareD1Database");
    expect(repository).toContain("FROM notification_deliveries deliveries");
    expect(repository).toContain("JOIN notification_definitions definitions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS notification_definitions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS notification_deliveries");
    expect(migration).toContain("UNIQUE(notification_id, user_id)");
  });

  it("clamps feed limits to 50 before querying D1", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const actions = await import("@/lib/notifications/actions");
    const result = await actions.loadCurrentUserNotifications({ limit: 999 });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledTimes(1);
    expect(database.statements[0].sql).toContain("FROM notification_deliveries deliveries");
    expect(database.statements[0].values).toEqual([userId, 51]);
  });

  it("opens the D1 store only after current-user authentication", async () => {
    const callOrder: string[] = [];
    authMocks.requireCurrentUserContext.mockImplementation(async () => {
      callOrder.push("auth");
      return { userId };
    });
    d1Mocks.getCloudflareD1Database.mockImplementation(async () => {
      callOrder.push("d1");
      return new FakeD1Database();
    });

    const actions = await import("@/lib/notifications/actions");
    await expect(actions.markNotificationReadAction(deliveryId)).resolves.toEqual({ ok: true });

    expect(callOrder).toEqual(["auth", "d1"]);
  });

  it("marks notification deliveries read with a user-scoped D1 update", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const actions = await import("@/lib/notifications/actions");
    await expect(actions.markNotificationReadAction(deliveryId)).resolves.toEqual({ ok: true });

    const [update] = database.runStatements;
    expect(update.sql).toContain("UPDATE notification_deliveries");
    expect(update.sql).toContain("read_at = ?");
    expect(update.sql).toContain("seen_at = ?");
    expect(update.sql).toContain("WHERE id = ?");
    expect(update.sql).toContain("AND user_id = ?");
    expect(update.values.at(-2)).toBe(deliveryId);
    expect(update.values.at(-1)).toBe(userId);
  });

  it("acknowledges release announcements by marking seen, read, and modal acknowledged", async () => {
    const database = new FakeD1Database();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const actions = await import("@/lib/notifications/actions");
    await expect(actions.acknowledgeReleaseAnnouncementAction(deliveryId)).resolves.toEqual({ ok: true });

    const [update] = database.runStatements;
    expect(update.sql).toContain("modal_acknowledged_at = ?");
    expect(update.sql).toContain("read_at = ?");
    expect(update.sql).toContain("seen_at = ?");
    expect(update.values.at(-2)).toBe(deliveryId);
    expect(update.values.at(-1)).toBe(userId);
  });

  it("returns not_found without leaking another user's delivery existence", async () => {
    const database = new FakeD1Database();
    database.changes = 0;
    d1Mocks.getCloudflareD1Database.mockResolvedValue(database);

    const actions = await import("@/lib/notifications/actions");

    await expect(actions.dismissNotificationAction(deliveryId)).resolves.toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("rejects invalid delivery ids before opening D1", async () => {
    const actions = await import("@/lib/notifications/actions");

    await expect(actions.markNotificationReadAction("not-a-uuid")).resolves.toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(authMocks.requireCurrentUserContext).toHaveBeenCalledTimes(1);
    expect(d1Mocks.getCloudflareD1Database).not.toHaveBeenCalled();
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

  it("returns safe unavailable errors when D1 is unavailable", async () => {
    d1Mocks.getCloudflareD1Database.mockResolvedValue(null);

    const actions = await import("@/lib/notifications/actions");

    await expect(actions.markNotificationReadAction(deliveryId)).resolves.toEqual({
      ok: false,
      code: "unavailable",
    });
  });
});
