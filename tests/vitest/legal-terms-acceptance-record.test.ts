import { describe, expect, it } from "vitest";

import { CURRENT_TERMS } from "@/lib/legal/terms-content";
import { buildLegalTermsAcceptanceInsert } from "@/lib/legal/terms-acceptance-record";

describe("legal Terms acceptance row builder", () => {
  it("server-stamps the current Terms version evidence without raw request metadata", () => {
    const row = buildLegalTermsAcceptanceInsert({
      userId: "11111111-1111-4111-8111-111111111111",
      acceptanceContext: "workshop_terms_gate",
      acceptanceMethod: "authenticated_clickwrap",
    });

    expect(row).toMatchObject({
      user_id: "11111111-1111-4111-8111-111111111111",
      terms_key: CURRENT_TERMS.key,
      terms_version: CURRENT_TERMS.version,
      terms_effective_date: CURRENT_TERMS.effectiveDate,
      terms_content_hash: CURRENT_TERMS.contentHash,
      privacy_policy_version: CURRENT_TERMS.privacyPolicyVersion,
      acceptance_context: "workshop_terms_gate",
      acceptance_method: "authenticated_clickwrap",
    });
    expect(row.metadata_json).toEqual({ source: "archestimator_web_app" });
    expect(JSON.stringify(row)).not.toMatch(/ip_address|user_agent|x-forwarded-for/i);
  });
});
