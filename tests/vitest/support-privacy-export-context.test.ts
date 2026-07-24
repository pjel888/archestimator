import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/lib/compliance/support-privacy-fulfillment.ts",
  "utf8",
);

describe("support privacy disclosed context export", () => {
  it("exports the complete allowlisted onboarding context without sensitive extras", () => {
    const select = source.match(
      /rows<ExportContext>\(database, `\s*SELECT ([\s\S]*?)\s+FROM support_message_context context/,
    )?.[1];

    expect(select).toBeDefined();
    const selectedColumns = Array.from(
      select!.matchAll(/context\.([a-z_]+)/g),
      (match) => match[1],
    );

    expect(selectedColumns).toEqual([
      "message_id",
      "workspace_id",
      "project_id",
      "estimate_id",
      "route_template",
      "viewport_width",
      "viewport_height",
      "timezone",
      "browser_family",
      "os_family",
      "diagnostics_shared",
      "onboarding_flow_key",
      "onboarding_flow_version",
      "onboarding_step_key",
      "onboarding_reason_code",
      "onboarding_route_key",
      "onboarding_viewport_class",
      "created_at",
    ]);
    expect(selectedColumns).not.toEqual(expect.arrayContaining([
      "ip_address",
      "user_agent",
      "request_url",
      "search_params",
      "raw_context",
    ]));
  });

  it("places the canonical context rows directly in disclosedContexts", () => {
    expect(source).toContain("disclosedContexts: input.snapshot.contexts");
  });
});
