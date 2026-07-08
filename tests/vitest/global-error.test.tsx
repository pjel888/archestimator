import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GlobalError from "@/app/global-error";
import { collectFileViolations } from "@/../scripts/enforce-app-design-system.mjs";

describe("global-error", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("declares the root html/body tags required by Next global-error", () => {
    const source = readFileSync("src/app/global-error.tsx", "utf8");

    expect(source).toContain("<html");
    expect(source).toContain("<body");
  });

  it("keeps the fallback UI inside the compact app design contract", () => {
    const source = readFileSync("src/app/global-error.tsx", "utf8");

    expect(collectFileViolations("src/app/global-error.tsx", source)).toEqual([]);
  });

  it("renders safe fallback copy and focuses the recovery action", async () => {
    render(<GlobalError error={new Error("database password leaked")} unstable_retry={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument();

    const retry = screen.getByRole("button", { name: "Try again" });
    await waitFor(() => expect(retry).toHaveFocus());
  });

  it("posts a sanitized client error report and calls unstable_retry from recovery", async () => {
    const user = userEvent.setup();
    const unstableRetry = vi.fn();

    render(
      <GlobalError
        error={Object.assign(new Error("Bearer provider-secret failed for client@example.com"), {
          digest: "digest-123",
        })}
        unstable_retry={unstableRetry}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/internal/client-error", expect.any(Object)));
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
    });
    expect(body).toMatchObject({
      name: "Error",
      digest: "digest-123",
      source: "global-error",
    });
    expect(JSON.stringify(body)).not.toMatch(/provider-secret|client@example.com/i);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(unstableRetry).toHaveBeenCalledTimes(1);
  });
});
