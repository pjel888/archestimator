import { describe, expect, it } from "vitest";

import { isUuid } from "@/lib/ids";

describe("id guards", () => {
  it("accepts real UUID route params", () => {
    expect(isUuid("019ababc-7e81-70fa-aa0b-6bfdbf85f1f5")).toBe(true);
  });

  it("rejects sample slugs before Supabase uuid filters receive them", () => {
    expect(isUuid("san-juan-townhouse")).toBe(false);
    expect(isUuid("quezon-city-office-fitout")).toBe(false);
  });
});
