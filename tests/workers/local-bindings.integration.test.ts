import { env, exports as workerExports } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const PRIVATE_NO_STORE =
  "private, no-cache, no-store, max-age=0, must-revalidate";

type CountRow = { count: number };

function fenceUrl(userId: string) {
  return `http://local.test/privacy-fences/${encodeURIComponent(userId)}`;
}

beforeEach(async () => {
  await env.ARCH_DB.prepare(
    `CREATE TABLE IF NOT EXISTS support_subject_privacy_fences (
       user_id TEXT PRIMARY KEY,
       generation INTEGER NOT NULL,
       state TEXT NOT NULL,
       privacy_request_id TEXT,
       updated_at TEXT NOT NULL
     )`,
  ).run();

  const count = await env.ARCH_DB.prepare(
    "SELECT COUNT(*) AS count FROM support_subject_privacy_fences",
  ).first<CountRow>();
  expect(count?.count).toBe(0);
});

afterEach(async () => {
  await reset();
});

describe("Workers-pool ARCH_DB privacy-fence flow", () => {
  it("creates an open privacy fence through the real Worker binding and current-source helper", async () => {
    const response = await workerExports.default.fetch(
      new Request(fenceUrl("user-open"), { method: "POST" }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    await expect(response.json()).resolves.toEqual({
      generation: 0,
      privacyRequestId: null,
      state: "open",
      userId: "user-open",
    });
    await expect(
      env.ARCH_DB.prepare(
        `SELECT user_id, generation, state, privacy_request_id
         FROM support_subject_privacy_fences
         WHERE user_id = ?`,
      )
        .bind("user-open")
        .first(),
    ).resolves.toEqual({
      generation: 0,
      privacy_request_id: null,
      state: "open",
      user_id: "user-open",
    });
  });

  it("denies writes while the real D1 privacy fence is erasing", async () => {
    await env.ARCH_DB.prepare(
      `INSERT INTO support_subject_privacy_fences (
         user_id, generation, state, privacy_request_id, updated_at
       ) VALUES (?, ?, 'erasing', ?, ?)`,
    )
      .bind(
        "user-erasing",
        4,
        "privacy-request-1",
        "2026-07-25T00:00:00.000Z",
      )
      .run();

    const response = await workerExports.default.fetch(
      new Request(fenceUrl("user-erasing"), { method: "POST" }),
    );

    expect(response.status).toBe(423);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    await expect(response.json()).resolves.toEqual({
      code: "support_subject_fenced",
      error: "Support changes are temporarily unavailable for this account.",
    });
    await expect(
      env.ARCH_DB.prepare(
        "SELECT generation, state FROM support_subject_privacy_fences WHERE user_id = ?",
      )
        .bind("user-erasing")
        .first(),
    ).resolves.toEqual({ generation: 4, state: "erasing" });
  });

  it("recovers after an erasing fence is explicitly reopened in D1", async () => {
    await env.ARCH_DB.prepare(
      `INSERT INTO support_subject_privacy_fences (
         user_id, generation, state, privacy_request_id, updated_at
       ) VALUES (?, ?, 'erasing', ?, ?)`,
    )
      .bind(
        "user-recovered",
        7,
        "privacy-request-2",
        "2026-07-25T00:00:00.000Z",
      )
      .run();

    const denied = await workerExports.default.fetch(
      new Request(fenceUrl("user-recovered"), { method: "POST" }),
    );
    await env.ARCH_DB.prepare(
      `UPDATE support_subject_privacy_fences
       SET state = 'open', privacy_request_id = NULL, generation = generation + 1
       WHERE user_id = ?`,
    )
      .bind("user-recovered")
      .run();
    const recovered = await workerExports.default.fetch(
      new Request(fenceUrl("user-recovered"), { method: "POST" }),
    );

    expect(denied.status).toBe(423);
    expect(recovered.status).toBe(200);
    await expect(recovered.json()).resolves.toMatchObject({
      generation: 8,
      privacyRequestId: null,
      state: "open",
      userId: "user-recovered",
    });
  });
});
