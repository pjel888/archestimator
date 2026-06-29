import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LibraryRouteError from "@/app/workshop/library/error";
import TemplatesRouteError from "@/app/workshop/library/templates/error";
import DataRouteError from "@/app/workshop/projects/[projectId]/data/error";
import EstimatesListRouteError from "@/app/workshop/projects/[projectId]/estimates/error";
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
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
});

describe("workshop route error boundaries", () => {
  it.each([
    ["Library", LibraryRouteError],
    ["Templates", TemplatesRouteError],
    ["Project data", DataRouteError],
    ["Project estimates", EstimatesListRouteError],
    ["Estimate workspace", EstimateRouteError],
  ])("renders sanitized retry UI for %s route failures", async (routeLabel, ErrorComponent) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unstableRetry = vi.fn();

    render(<ErrorComponent error={sensitiveError} unstable_retry={unstableRetry} />);

    expectSanitizedRetryUi(routeLabel);
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(unstableRetry).toHaveBeenCalledTimes(1);
  });

  it("logs only sanitized development error metadata and posts to the client-error endpoint", async () => {
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
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/internal/client-error", expect.any(Object)));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      digest: "route-digest-123",
      route: "Library",
      source: "workshop-route-error",
    });
    expect(JSON.stringify(body)).not.toMatch(/secret-token|private_tokens|\/Users\/philiplewis/i);
  });
});
