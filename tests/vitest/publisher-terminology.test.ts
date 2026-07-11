import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared link terminology", () => {
  it("uses Share language in publisher navigation and receiver view controls", () => {
    const sidebar = readFileSync("src/components/sidebar/MainSidebar.tsx", "utf8");
    const publisherPage = readFileSync("src/app/workshop/publisher/page.tsx", "utf8");
    const tabs = readFileSync("src/components/share/SharePageTabs.tsx", "utf8");

    expect(sidebar).toContain('label: "Share", icon: ShareNetwork');
    expect(sidebar).not.toContain('label: "Publisher"');
    expect(publisherPage).toContain('title="Share"');
    expect(tabs).toContain('mode === "tree" ? "Summary" : "Details"');
    expect(tabs).not.toContain('"Scope outline"');
    expect(tabs).not.toContain('"Line item table"');
  });
});
