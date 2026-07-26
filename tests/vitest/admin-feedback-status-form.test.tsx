import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminFeedbackStatusForm } from "@/components/admin/AdminFeedbackStatusForm";
import { ToastProvider } from "@/components/ui/toast";

const actionMocks = vi.hoisted(() => ({
  updateBetaFeedbackReviewStatus: vi.fn(),
}));

vi.mock("@/lib/workshop/beta-feedback-review-actions", () => ({
  updateBetaFeedbackReviewStatus: actionMocks.updateBetaFeedbackReviewStatus,
}));

describe("AdminFeedbackStatusForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toasts a server-action failure without changing the URL", async () => {
    const user = userEvent.setup();
    const urlBeforeSubmit = window.location.href;
    actionMocks.updateBetaFeedbackReviewStatus.mockResolvedValue({
      ok: false,
      code: "save",
      message: "Feedback status could not be saved.",
    });

    render(
      <ToastProvider>
        <AdminFeedbackStatusForm
          id="feedback-1"
          label="reviewer@example.test"
          options={[{ value: "new", label: "New" }, { value: "reviewing", label: "Reviewing" }]}
          status="new"
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Feedback status could not be saved.");
    expect(window.location.href).toBe(urlBeforeSubmit);
  });

  it("toasts a rejected server action without changing the URL", async () => {
    const user = userEvent.setup();
    const urlBeforeSubmit = window.location.href;
    actionMocks.updateBetaFeedbackReviewStatus.mockRejectedValueOnce(new Error("transport failed"));

    render(
      <ToastProvider>
        <AdminFeedbackStatusForm
          id="feedback-1"
          label="reviewer@example.test"
          options={[{ value: "new", label: "New" }, { value: "reviewing", label: "Reviewing" }]}
          status="new"
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Feedback status could not be saved. Please try again.");
    expect(window.location.href).toBe(urlBeforeSubmit);
  });
});
