import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const nextCacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  ensureDefaultWorkspace: workspaceMocks.ensureDefaultWorkspace,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: nextCacheMocks.revalidatePath,
}));

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const GROUP_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GROUP_ID_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PROJECT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PROJECT_ID_2 = "ffffffff-ffff-4fff-8fff-ffffffffffff";

type StubResult = { data: unknown; error: unknown; count?: number | null };

/**
 * One programmable result per `from(table)` access, consumed in queue order so a
 * single action that hits the same table twice (e.g. verify then mutate) can be
 * scripted. A recorded log captures the terminal operation + payload for asserts.
 */
function makeSupabaseStub() {
  const queue: Record<string, StubResult[]> = {};
  const calls: Array<{ table: string; op: string; payload?: unknown; options?: unknown }> = [];

  function nextResult(table: string): StubResult {
    const pending = queue[table];
    if (pending && pending.length > 0) return pending.shift() as StubResult;
    return { data: null, error: null, count: 0 };
  }

  function builderFor(table: string) {
    let result: StubResult = { data: null, error: null, count: 0 };
    let resolved = false;
    const ensure = () => {
      if (!resolved) {
        result = nextResult(table);
        resolved = true;
      }
      return result;
    };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    for (const method of ["select", "eq", "in", "order", "limit"]) {
      builder[method] = (..._args: unknown[]) => builder;
    }
    builder.insert = (payload: unknown) => {
      calls.push({ table, op: "insert", payload });
      return builder;
    };
    builder.update = (payload: unknown) => {
      calls.push({ table, op: "update", payload });
      return builder;
    };
    builder.delete = () => {
      calls.push({ table, op: "delete" });
      return builder;
    };
    builder.upsert = (payload: unknown, options?: unknown) => {
      calls.push({ table, op: "upsert", payload, options });
      return builder;
    };
    builder.single = async () => ensure();
    builder.maybeSingle = async () => ensure();
    builder.then = (resolve: (value: StubResult) => unknown) => resolve(ensure());
    void chain;
    return builder;
  }

  return {
    client: { from: (table: string) => builderFor(table) },
    queueResult(table: string, result: StubResult) {
      (queue[table] ??= []).push(result);
    },
    calls,
  };
}

beforeEach(() => {
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  supabaseMocks.createSupabaseServerClient.mockReset();
  nextCacheMocks.revalidatePath.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("project group actions module", () => {
  it("exposes the seven group server actions", async () => {
    const mod = await import("@/lib/workshop/group-actions");
    expect(typeof mod.createProjectGroup).toBe("function");
    expect(typeof mod.renameProjectGroup).toBe("function");
    expect(typeof mod.recolorProjectGroup).toBe("function");
    expect(typeof mod.deleteProjectGroup).toBe("function");
    expect(typeof mod.reorderProjectGroups).toBe("function");
    expect(typeof mod.moveProjectToGroup).toBe("function");
    expect(typeof mod.bulkAssignProjectsToGroup).toBe("function");
  });
});
