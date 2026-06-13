import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AC-MOD-20 (MOD-REC-07): a Resend webhook tagged with shared_link_recipient_id is only
// attributed to a recipient row when it is SAFE — i.e. the row has no bound email yet
// (resend_email_id null/empty, legit first webhook) OR the row's resend_email_id matches
// the event's email_id. A stale event for a SUPERSEDED email (the recipient was resent, so
// resend_email_id is now a newer value) carries the old recipient-id tag, misses the email-id
// lookup, and MUST NOT overwrite the active email's delivery status via the unscoped fallback.

const RECIPIENT_ID = "11111111-1111-4111-8111-111111111111";

type RecordedQuery = {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "none";
  payload?: unknown;
  filters: Array<{ method: string; column?: string; value?: unknown }>;
};

function setRequiredEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://archestimator.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
}

/**
 * Minimal chainable Supabase mock. `resolveResult` returns what each terminal/awaited query
 * resolves to, based on the recorded query (table + operation + filters).
 */
function makeAdminClient({
  recorded,
  resolveResult,
}: {
  recorded: RecordedQuery[];
  resolveResult: (query: RecordedQuery) => { data: unknown; error: unknown };
}) {
  function from(table: string) {
    const query: RecordedQuery = { table, operation: "none", filters: [] };
    recorded.push(query);
    const terminalResult = () => resolveResult(query);
    const builder: Record<string, unknown> = {
      select(_columns?: string) {
        if (query.operation === "none") query.operation = "select";
        return builder;
      },
      update(payload: unknown) {
        query.operation = "update";
        query.payload = payload;
        return builder;
      },
      eq(column: string, value: unknown) {
        query.filters.push({ method: "eq", column, value });
        return builder;
      },
      maybeSingle() {
        return Promise.resolve(terminalResult());
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(terminalResult()).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }
  return { from };
}

function makeRecipientIdTaggedEvent({ emailId, createdAt }: { emailId: string; createdAt: string }) {
  return {
    type: "email.delivered" as const,
    created_at: createdAt,
    data: {
      created_at: createdAt,
      email_id: emailId,
      from: "Archestimator <no-reply@example.com>",
      to: ["receiver@example.com"],
      subject: "Project Estimate",
      tags: {
        shared_link_recipient_id: RECIPIENT_ID,
      },
    },
  };
}

afterEach(() => {
  vi.doUnmock("@supabase/supabase-js");
  vi.resetModules();
});

beforeEach(() => {
  setRequiredEnv();
  vi.resetModules();
});

describe("AC-MOD-20 recordResendEmailWebhookEvent scopes the recipient-id fallback by email id", () => {
  async function runWebhook({
    eventEmailId,
    rowResendEmailId,
  }: {
    eventEmailId: string;
    rowResendEmailId: string | null;
  }) {
    const recorded: RecordedQuery[] = [];

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() =>
        makeAdminClient({
          recorded,
          resolveResult: (query) => {
            if (query.table === "shared_link_recipients" && query.operation === "select") {
              const emailIdFilter = query.filters.find((f) => f.column === "resend_email_id");
              const idFilter = query.filters.find((f) => f.column === "id");
              // The email-id lookup: this is a STALE event whose email_id never matches a row.
              if (emailIdFilter) {
                return { data: null, error: null };
              }
              // The recipient-id fallback lookup: return the active row with its current
              // (possibly superseded) resend_email_id so the fix can scope on it.
              if (idFilter) {
                return {
                  data: {
                    id: RECIPIENT_ID,
                    resend_last_event_at: null,
                    resend_email_id: rowResendEmailId,
                  },
                  error: null,
                };
              }
            }
            return { data: null, error: null };
          },
        }),
      ),
    }));

    const { recordResendEmailWebhookEvent } = await import("@/lib/email/resend-webhooks");
    const event = makeRecipientIdTaggedEvent({ emailId: eventEmailId, createdAt: "2026-05-31T12:00:00.000Z" });
    const result = await recordResendEmailWebhookEvent(event, "msg_1");
    return { result, recorded };
  }

  it("does NOT attribute a stale event whose email_id differs from the row's bound resend_email_id", async () => {
    const { result, recorded } = await runWebhook({
      eventEmailId: "stale-superseded-email",
      rowResendEmailId: "active-newer-email",
    });

    // The stale event is ignored — the active email's delivery status is untouched.
    expect(result).toMatchObject({ ok: true, ignored: true });
    // No UPDATE may be written to shared_link_recipients (status must stay unchanged).
    const updates = recorded.filter(
      (q) => q.table === "shared_link_recipients" && q.operation === "update",
    );
    expect(updates).toHaveLength(0);
  });

  it("DOES attribute when the row has no bound email yet (null resend_email_id, legit first webhook)", async () => {
    const { result, recorded } = await runWebhook({
      eventEmailId: "first-email",
      rowResendEmailId: null,
    });

    expect(result).toMatchObject({ ok: true, matched: true });
    const updates = recorded.filter(
      (q) => q.table === "shared_link_recipients" && q.operation === "update",
    );
    expect(updates).toHaveLength(1);
    const payload = updates[0].payload as Record<string, unknown>;
    expect(payload.resend_email_id).toBe("first-email");
    expect(payload.delivery_status).toBe("sent");
  });

  it("DOES attribute when the row's resend_email_id equals the event's email_id", async () => {
    const { result, recorded } = await runWebhook({
      eventEmailId: "same-email",
      rowResendEmailId: "same-email",
    });

    expect(result).toMatchObject({ ok: true, matched: true });
    const updates = recorded.filter(
      (q) => q.table === "shared_link_recipients" && q.operation === "update",
    );
    expect(updates).toHaveLength(1);
  });
});
