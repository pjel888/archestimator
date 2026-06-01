import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import LibraryRouteError from "@/app/workshop/library/error";
import ChartsRouteError from "@/app/workshop/projects/[projectId]/charts/error";
import EstimateRouteError from "@/app/workshop/projects/[projectId]/estimates/[nodeId]/error";
import { WorkshopRouteErrorState } from "@/components/workshop/WorkshopRouteErrorState";

const sensitiveError = Object.assign(
  new Error("SQL select * from private_tokens where token='secret-token' at /Users/philiplewis/.env"),
  {
    digest: "route-digest-123",
    name: "DatabaseAuthError",
    stack: "DatabaseAuthError: leaked stack\n    at /Users/philiplewis/archestimator/src/private.ts:1:1",
  },
);

function expectSanitizedRetryUi(routeLabel: string) {
  const alert = screen.getByRole("alert");

  expect(screen.getByText(routeLabel)).toBeVisible();
  expect(screen.getByRole("heading", { name: "This view could not load" })).toBeVisible();
  expect(screen.getByText("Refresh this section and continue from the current workspace.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();

  expect(alert).not.toHaveTextContent("secret-token");
  expect(alert).not.toHaveTextContent("/Users/philiplewis");
  expect(alert).not.toHaveTextContent(/SQL|private_tokens|DatabaseAuthError|route-digest-123/i);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("workshop route error boundaries", () => {
  it.each([
    ["Library", LibraryRouteError],
    ["Project charts", ChartsRouteError],
    ["Estimate workspace", EstimateRouteError],
  ])("renders sanitized retry UI for %s route failures", (routeLabel, ErrorComponent) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();

    render(<ErrorComponent error={sensitiveError} reset={reset} />);

    expectSanitizedRetryUi(routeLabel);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("logs only sanitized development error metadata", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<WorkshopRouteErrorState error={sensitiveError} reset={vi.fn()} routeLabel="Library" />);

    expect(consoleError).toHaveBeenCalledWith("Workshop route error", {
      route: "Library",
      name: "DatabaseAuthError",
      digest: "route-digest-123",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/Users/philiplewis");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private_tokens");
  });
});
