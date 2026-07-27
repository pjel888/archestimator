import { describe, expect, it } from "vitest";

import {
  getProjectNavigationItems,
  isProjectNavigationItemActive,
} from "@/components/workshop/navigation/project-navigation";

describe("project navigation", () => {
  it("uses Timeline as the primary commitment history destination", () => {
    const items = getProjectNavigationItems("project-1");

    expect(items.map(({ href, label }) => ({ href, label }))).toContainEqual({
      href: "/workshop/projects/project-1/timeline",
      label: "Timeline",
    });
    expect(items.some(({ href }) => href.endsWith("/activity"))).toBe(false);
  });

  it("keeps nested timeline views active", () => {
    const timeline = getProjectNavigationItems("project-1").find(
      ({ label }) => label === "Timeline",
    );

    expect(timeline).toBeDefined();
    expect(
      isProjectNavigationItemActive(
        "/workshop/projects/project-1/timeline/event-1",
        timeline!,
      ),
    ).toBe(true);
  });
});
