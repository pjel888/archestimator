import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BetaFeedbackForm } from "@/components/workshop/BetaFeedbackForm";

const { submitBetaFeedbackMock, submitBetaFeedbackInlineMock } = vi.hoisted(() => ({
  submitBetaFeedbackMock: vi.fn<(formData: FormData) => Promise<void>>(),
  submitBetaFeedbackInlineMock:
    vi.fn<(previousState: unknown, formData: FormData) => Promise<{ status: "saved"; message: string }>>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1",
}));

vi.mock("@/lib/workshop/beta-feedback-actions", () => ({
  submitBetaFeedback: submitBetaFeedbackMock,
  submitBetaFeedbackInline: submitBetaFeedbackInlineMock,
}));

function capturedEntries(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function getForm() {
  return screen.getByRole("button", { name: /Send feedback|Sending/ }).closest("form") as HTMLFormElement;
}

beforeEach(() => {
  submitBetaFeedbackMock.mockClear();
  submitBetaFeedbackInlineMock.mockClear();
});

describe("BetaFeedbackForm", () => {
  it("posts the picked feedbackType and severity through the server action FormData", async () => {
    const posted: Record<string, FormDataEntryValue>[] = [];
    submitBetaFeedbackMock.mockImplementation(async (formData: FormData) => {
      posted.push(capturedEntries(formData));
    });

    render(<BetaFeedbackForm />);

    expect(screen.getByLabelText("Type")).toHaveTextContent("Bug");
    expect(screen.getByLabelText("Severity")).toHaveTextContent("Medium");

    fireEvent.click(screen.getByLabelText("Type"));
    fireEvent.click(screen.getByRole("option", { name: "Export issue" }));
    expect(screen.getByLabelText("Type")).toHaveTextContent("Export issue");

    fireEvent.click(screen.getByLabelText("Severity"));
    fireEvent.click(screen.getByRole("option", { name: "Blocker" }));
    expect(screen.getByLabelText("Severity")).toHaveTextContent("Blocker");

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "The export omitted every section subtotal." },
    });

    fireEvent.submit(getForm());

    await waitFor(() => expect(submitBetaFeedbackMock).toHaveBeenCalledTimes(1));
    expect(posted[0]).toMatchObject({
      feedbackType: "export_issue",
      severity: "blocker",
      message: "The export omitted every section subtotal.",
      pagePath: "/workshop/projects/project-1",
    });
  });

  it("resyncs the triggers after the post-action reset so an untouched resubmit posts defaults", async () => {
    const posted: Record<string, FormDataEntryValue>[] = [];
    submitBetaFeedbackMock.mockImplementation(async (formData: FormData) => {
      posted.push(capturedEntries(formData));
    });

    render(<BetaFeedbackForm />);

    fireEvent.click(screen.getByLabelText("Type"));
    fireEvent.click(screen.getByRole("option", { name: "Estimate accuracy" }));
    fireEvent.click(screen.getByLabelText("Severity"));
    fireEvent.click(screen.getByRole("option", { name: "High" }));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Concrete works subtotal drifts on rounding." },
    });

    fireEvent.submit(getForm());
    await waitFor(() => expect(submitBetaFeedbackMock).toHaveBeenCalledTimes(1));
    expect(posted[0]).toMatchObject({ feedbackType: "estimate_accuracy", severity: "high" });

    // React 19 resets the form after the action; the visible triggers must
    // resync to the defaults or the next submit posts values nobody sees.
    await waitFor(() => expect(screen.getByLabelText("Type")).toHaveTextContent("Bug"));
    expect(screen.getByLabelText("Severity")).toHaveTextContent("Medium");

    fireEvent.submit(getForm());
    await waitFor(() => expect(submitBetaFeedbackMock).toHaveBeenCalledTimes(2));
    expect(posted[1]).toMatchObject({
      feedbackType: "bug",
      severity: "medium",
      message: "",
    });
  });

  it("routes inline mode through the useActionState action and reports the saved status", async () => {
    const posted: Record<string, FormDataEntryValue>[] = [];
    submitBetaFeedbackInlineMock.mockImplementation(async (_previousState: unknown, formData: FormData) => {
      posted.push(capturedEntries(formData));
      return {
        status: "saved" as const,
        message: "Feedback saved. Philip will review beta issues during the monitoring window.",
      };
    });

    render(<BetaFeedbackForm mode="inline" />);

    fireEvent.click(screen.getByLabelText("Type"));
    fireEvent.click(screen.getByRole("option", { name: "Confusing UX" }));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "The teamspace header buttons read ambiguously." },
    });

    fireEvent.submit(getForm());

    await waitFor(() => expect(submitBetaFeedbackInlineMock).toHaveBeenCalledTimes(1));
    expect(posted[0]).toMatchObject({
      feedbackType: "confusing_ux",
      severity: "medium",
      pagePath: "/workshop/projects/project-1",
    });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Feedback saved. Philip will review beta issues during the monitoring window.",
      ),
    );
    expect(screen.getByLabelText("Type")).toHaveTextContent("Bug");
  });
});
