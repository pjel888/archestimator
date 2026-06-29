import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/toast";
import { AuthPermissionDeniedError, AuthRequiredError } from "@/lib/observability/app-error";

function AppErrorToastHarness() {
  const { toast } = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.appError(new AuthRequiredError())}>
        Auth required
      </button>
      <button type="button" onClick={() => toast.appError(new AuthPermissionDeniedError())}>
        Permission denied
      </button>
      <button
        type="button"
        onClick={() =>
          toast.appError({
            kind: "network",
            code: "NETWORK_ERROR",
            message: "Network unavailable.",
          })
        }
      >
        Network error
      </button>
      <button type="button" onClick={() => toast.appError({ ok: false, trace_id: "trace-1" })}>
        Bad envelope
      </button>
    </div>
  );
}

describe("toast.appError", () => {
  it("maps AUTH_REQUIRED to info tone", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AppErrorToastHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Auth required" }));

    expect(screen.getByRole("status")).toHaveTextContent("Sign in to continue.");
    expect(screen.getByRole("status")).toHaveAttribute("data-toast-tone", "info");
  });

  it("maps AUTH_PERMISSION_DENIED to warning tone", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AppErrorToastHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Permission denied" }));

    expect(screen.getByRole("status")).toHaveTextContent("You do not have permission to do that.");
    expect(screen.getByRole("status")).toHaveAttribute("data-toast-tone", "warning");
  });

  it("falls back by kind when a serialized error is passed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AppErrorToastHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Network error" }));

    expect(screen.getByRole("status")).toHaveTextContent("Network unavailable.");
    expect(screen.getByRole("status")).toHaveAttribute("data-toast-tone", "warning");
  });

  it("rejects full error envelopes and uses generic copy", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AppErrorToastHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Bad envelope" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again in a moment.");
    expect(screen.getByRole("alert")).toHaveAttribute("data-toast-tone", "error");
  });
});
