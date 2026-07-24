import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { BETA_FEEDBACK_STATUSES, type BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import { parseBetaFeedbackStatusUpdate } from "@/lib/workshop/beta-feedback-review";

// Mirrors the option derivation in src/app/admin/feedback/page.tsx.
// so the harness drifts together with the status contract.
const statusLabels: Record<BetaFeedbackStatus, string> = {
  archived: "Archived",
  new: "New",
  resolved: "Resolved",
  reviewing: "Reviewing",
};

const statusOptions = BETA_FEEDBACK_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const statusFilterOptions = [{ value: "", label: "All statuses" }, ...statusOptions];

function queryString(form: HTMLFormElement) {
  const entries = [...new FormData(form).entries()].map(([key, value]) => [key, String(value)] as [string, string]);
  return new URLSearchParams(entries).toString();
}

describe("beta feedback review select islands", () => {
  it("GET filter form serializes ?status=<value> and keeps ?status= for All statuses", () => {
    render(
      <form data-testid="filter-form" action="/admin/feedback">
        <label>
          Status
          <AdminStatusSelect
            name="status"
            defaultValue=""
            options={statusFilterOptions}
            aria-label="Status filter"
          />
        </label>
        <button type="submit">Filter</button>
      </form>,
    );

    const form = screen.getByTestId("filter-form") as HTMLFormElement;
    const trigger = screen.getByRole("combobox", { name: "Status filter" });

    expect(trigger).toHaveTextContent("All statuses");
    expect(queryString(form)).toBe("status=");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Reviewing" }));
    expect(trigger).toHaveTextContent("Reviewing");
    expect(queryString(form)).toBe("status=reviewing");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "All statuses" }));
    expect(trigger).toHaveTextContent("All statuses");
    expect(queryString(form)).toBe("status=");
  });

  it("per-row form posts the same id/status FormData shape the review action parses", () => {
    render(
      <form data-testid="row-form">
        <input type="hidden" name="id" value="feedback-1" />
        <AdminStatusSelect
          name="status"
          defaultValue="new"
          options={statusOptions}
          aria-label="Review status for feedback from beta@example.com"
        />
        <button type="submit">Save</button>
      </form>,
    );

    const form = screen.getByTestId("row-form") as HTMLFormElement;
    const trigger = screen.getByRole("combobox", {
      name: "Review status for feedback from beta@example.com",
    });
    expect(trigger).toHaveTextContent("New");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Resolved" }));
    expect(trigger).toHaveTextContent("Resolved");

    const formData = new FormData(form);
    expect(Object.fromEntries(formData.entries())).toEqual({
      id: "feedback-1",
      status: "resolved",
    });
    expect(parseBetaFeedbackStatusUpdate(formData)).toEqual({
      ok: true,
      id: "feedback-1",
      status: "resolved",
    });
  });
});
