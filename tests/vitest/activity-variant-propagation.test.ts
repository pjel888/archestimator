import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const d1ClientSource = readFileSync(resolve(root, "src/lib/estimates/d1-action-client.ts"), "utf8");
const activityHistorySource = readFileSync(resolve(root, "src/components/workshop/estimate-sheet/activity-history.tsx"), "utf8");

describe("activity variant and propagation contract", () => {
  it("records typed variant identity and a bounded before/after fan-out fact set", () => {
    expect(d1ClientSource).toContain("MAX_PROPAGATED_ACTIVITY_FACTS = 100");
    expect(d1ClientSource).toContain("function getVariantActivityIdentity");
    expect(d1ClientSource).toContain('changedFields.push("variant_changed")');
    expect(d1ClientSource).toContain("propagatedRowFacts: propagation.facts");
    expect(d1ClientSource).toContain("propagatedRowFactsTruncated: propagation.truncatedCount");
    expect(d1ClientSource).toContain("before: {");
    expect(d1ClientSource).toContain("after: {");
  });

  it("renders the propagated count without rendering raw propagated row IDs", () => {
    expect(activityHistorySource).toContain("Propagated to ${formatAuditNumber(propagatedRowCount)} other");
    expect(activityHistorySource).not.toContain("payload.propagatedRowFacts.map");
    expect(activityHistorySource).not.toContain("payload.propagatedRowIds.map");
  });
});
