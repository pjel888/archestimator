import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const TRUST_PAGE_PATH = "src/app/trust/page.tsx";

function readTrustPageSource(): string {
  return readFileSync(TRUST_PAGE_PATH, "utf8");
}

describe("trust page overclaim correction (P0.1)", () => {
  // Scenario TRUST-1: corrected wording must replace the historical overclaims.
  it("does not claim 'Postgres' rate limiting anywhere in the rendered text", () => {
    const source = readTrustPageSource();
    expect(source).not.toMatch(/Rate limiting is Postgres/);
    expect(source).not.toMatch(/Retry-After \(Postgres\)/);
  });

  it("does not claim 'Row-level security enforced on every table'", () => {
    const source = readTrustPageSource();
    expect(source).not.toMatch(/Row-level security enforced on every table/i);
    expect(source).not.toMatch(/RLS on every table/i);
  });

  it("describes the actual D1 app-layer authorization posture", () => {
    const source = readTrustPageSource();
    // Honest replacement wording — must mention D1 + app-layer authorization
    expect(source).toMatch(/D1/);
    expect(source).toMatch(/app-layer authorization/);
  });

  it("keeps the existing honest no-badges stance (regression guard)", () => {
    const source = readTrustPageSource();
    expect(source).toMatch(/do not claim SOC2, GDPR, HIPAA, or DPA compliance/i);
  });
});
