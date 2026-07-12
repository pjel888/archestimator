import { describe, expect, it } from "vitest";

import { contrastRatio, normalizeClientPortalBrandTheme } from "@/lib/client-portal/brand";

describe("client portal branding", () => {
  it("accepts bounded accessible color themes", () => {
    expect(normalizeClientPortalBrandTheme({ accentColor: "#1E40AF", backgroundColor: "#FFFFFF", textColor: "#111827" })).toMatchObject({ accentColor: "#1E40AF" });
    expect(contrastRatio("#111827", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("rejects arbitrary values and inaccessible contrast", () => {
    expect(() => normalizeClientPortalBrandTheme({ accentColor: "url(javascript:)", backgroundColor: "#FFFFFF", textColor: "#111827" })).toThrow();
    expect(() => normalizeClientPortalBrandTheme({ accentColor: "#FFFFFF", backgroundColor: "#FFFFFF", textColor: "#DDDDDD" })).toThrow();
  });
});
