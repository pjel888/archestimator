import { describe, expect, it } from "vitest";

import {
  TERMS_ACCEPTANCE_ROUTE,
  buildTermsAcceptanceRedirectPath,
  shouldBypassTermsAcceptanceGate,
} from "@/lib/legal/terms-gate";

describe("protected Terms acceptance gate helpers", () => {
  it("only bypasses the in-workshop acceptance route itself", () => {
    expect(TERMS_ACCEPTANCE_ROUTE).toBe("/workshop/terms");
    expect(shouldBypassTermsAcceptanceGate("/workshop/terms")).toBe(true);
    expect(shouldBypassTermsAcceptanceGate("/workshop/terms?next=%2Fworkshop")).toBe(true);
    expect(shouldBypassTermsAcceptanceGate("/workshop/projects")).toBe(false);
    expect(shouldBypassTermsAcceptanceGate("/terms")).toBe(false);
  });

  it("builds a safe post-auth hard-gate redirect with sanitized next", () => {
    expect(buildTermsAcceptanceRedirectPath("/workshop/projects?view=active")).toBe(
      "/workshop/terms?next=%2Fworkshop%2Fprojects%3Fview%3Dactive",
    );
    expect(buildTermsAcceptanceRedirectPath("https://evil.example/phish")).toBe(
      "/workshop/terms?next=%2Fworkshop",
    );
  });
});
