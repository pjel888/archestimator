import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("onboarding target ownership", () => {
  it("gives the estimate add-row control the required onboarding target", () => {
    const source = readFileSync(
      "src/components/workshop/estimate-sheet/rows/drop-zones.tsx",
      "utf8",
    );

    expect(source).toContain('data-onboarding-target="estimate.add_row"');
  });
});
