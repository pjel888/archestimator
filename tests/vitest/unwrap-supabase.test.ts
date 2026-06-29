import { describe, expect, it } from "vitest";

import {
  AuthPermissionDeniedError,
  AuthRequiredError,
  DatabaseError,
  RateLimitError,
} from "@/lib/observability/app-error";
import { unwrapSupabase } from "@/lib/observability/unwrap-supabase";

describe("unwrapSupabase", () => {
  it("maps 42501 to AuthPermissionDeniedError", () => {
    expect(() =>
      unwrapSupabase({
        data: null,
        error: { code: "42501", message: "new row violates row-level security policy" },
      }),
    ).toThrow(AuthPermissionDeniedError);
  });

  it("maps PGRST301 to AuthRequiredError", () => {
    expect(() =>
      unwrapSupabase({
        data: null,
        error: { code: "PGRST301", message: "JWT expired" },
      }),
    ).toThrow(AuthRequiredError);
  });

  it("maps PGRST309 to RateLimitError", () => {
    expect(() =>
      unwrapSupabase({
        data: null,
        error: { code: "PGRST309", message: "request rate limit exceeded" },
      }),
    ).toThrow(RateLimitError);
  });

  it("maps unknown database failures to safe DatabaseError", () => {
    expect(() =>
      unwrapSupabase({
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      }),
    ).toThrow(DatabaseError);
  });

  it("returns data when no Supabase error is present", () => {
    expect(unwrapSupabase({ data: { id: "row-1" }, error: null })).toEqual({ id: "row-1" });
  });
});
