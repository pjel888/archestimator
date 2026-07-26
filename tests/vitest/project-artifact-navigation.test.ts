import { describe, expect, it } from "vitest";

import { getProjectNavigationItems } from "@/components/workshop/navigation/project-navigation";

describe("project artifact navigation", () => {
  it("adds one stable Files destination to project navigation", () => {
    const items = getProjectNavigationItems("project-1");
    expect(items.filter((item) => item.label === "Files")).toEqual([
      expect.objectContaining({
        exact: false,
        href: "/workshop/projects/project-1/artifacts",
      }),
    ]);
  });
});
