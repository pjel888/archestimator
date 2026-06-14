import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectActivityList } from "@/components/workshop/dashboard/ProjectActivityList";
import type { ActivityViewModel } from "@/lib/activity/types";

function activity(id: string, title: string, occurredAt: string): ActivityViewModel {
  return {
    id,
    source: "system",
    audience: "owner",
    visibility: "owner",
    action: "recorded",
    occurredAt,
    actor: { kind: "user", displayName: "Alice", isSafeForClient: true },
    target: { kind: "system", label: "Project" },
    title,
  };
}

describe("ProjectActivityList (Zone D)", () => {
  it("shows a single muted line when the flag is off (activities null) — no rows, no big box (R10)", () => {
    render(<ProjectActivityList activities={null} />);
    expect(screen.getByText("Activity is not enabled in this environment.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows a distinct muted line when the flag is on but there is no activity (R10)", () => {
    render(<ProjectActivityList activities={[]} />);
    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders curated rows with titles and relative timestamps (R10)", () => {
    const now = new Date().toISOString();
    render(
      <ProjectActivityList
        activities={[activity("a1", "Alice renamed the project.", now), activity("a2", "Alice invited a collaborator.", now)]}
      />,
    );

    expect(screen.getByText("Alice renamed the project.")).toBeInTheDocument();
    expect(screen.getByText("Alice invited a collaborator.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    // relative time renders for recent events
    expect(screen.getAllByText("just now").length).toBeGreaterThan(0);
    // day grouping renders a header for today's events
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("never shows more than 8 rows", () => {
    const now = new Date().toISOString();
    const rows = Array.from({ length: 12 }, (_unused, index) => activity(`a${index}`, `Event ${index}`, now));
    render(<ProjectActivityList activities={rows} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });
});
