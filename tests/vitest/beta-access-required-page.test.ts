import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("/beta/access-required page contract", () => {
  it("gives denied beta users a clear non-looping path", () => {
    const source = readFileSync(join(process.cwd(), "src/app/beta/access-required/page.tsx"), "utf8");

    expect(source).toMatch(/invite-only beta/i);
    expect(source).toMatch(/philipjonlewis@gmail\.com/);
    expect(source).toMatch(/href=["']\/login["']/);
    expect(source).not.toMatch(/\/workshop/);
  });
});
