import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AdminStatusSelect } from "@/app/workshop/settings/_components/AdminStatusSelect";
import {
  CLOSED_BETA_ALLOWLIST_STATUSES,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
  type ClosedBetaAllowlistStatus,
} from "@/lib/auth/beta-allowlist-admin";

// Mirrors the option derivation in src/app/workshop/settings/beta-users/page.tsx
// so the harness drifts together with the status contract.
const statusLabels: Record<ClosedBetaAllowlistStatus, string> = {
  active: "Active",
  invited: "Invited",
  revoked: "Revoked",
};

const statusOptions = CLOSED_BETA_ALLOWLIST_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

const statusFilterOptions = [{ value: "", label: "All statuses" }, ...statusOptions];

function queryString(form: HTMLFormElement) {
  const entries = [...new FormData(form).entries()].map(([key, value]) => [key, String(value)] as [string, string]);
  return new URLSearchParams(entries).toString();
}

describe("beta users admin select islands", () => {
  it("GET filter form serializes ?status=<value> and keeps ?status= for All statuses", () => {
    render(
      <form data-testid="filter-form" action="/workshop/settings/beta-users">
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

    // The empty "All statuses" default still serializes as ?status= so the
    // page's existing query-string semantics are untouched.
    expect(trigger).toHaveTextContent("All statuses");
    expect(queryString(form)).toBe("status=");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Invited" }));
    expect(trigger).toHaveTextContent("Invited");
    expect(queryString(form)).toBe("status=invited");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "All statuses" }));
    expect(trigger).toHaveTextContent("All statuses");
    expect(queryString(form)).toBe("status=");
  });

  it("per-row form posts the same id/notes/status FormData shape the server action parses", () => {
    render(
      <form data-testid="row-form">
        <input type="hidden" name="id" value="row-1" />
        <input type="hidden" name="notes" value="Investor reviewer" />
        <AdminStatusSelect
          name="status"
          defaultValue="invited"
          options={statusOptions}
          aria-label="Status for beta@example.com"
        />
        <button type="submit">Save</button>
      </form>,
    );

    const form = screen.getByTestId("row-form") as HTMLFormElement;
    const trigger = screen.getByRole("combobox", { name: "Status for beta@example.com" });
    expect(trigger).toHaveTextContent("Invited");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Revoked" }));
    expect(trigger).toHaveTextContent("Revoked");

    const formData = new FormData(form);
    expect(Object.fromEntries(formData.entries())).toEqual({
      id: "row-1",
      notes: "Investor reviewer",
      status: "revoked",
    });
    expect(parseClosedBetaAllowlistUpdate(formData)).toEqual({
      ok: true,
      id: "row-1",
      notes: "Investor reviewer",
      status: "revoked",
    });
  });

  it("add-user form feeds the create parser with the picked status", () => {
    render(
      <form data-testid="create-form">
        <input name="email" type="email" defaultValue="reviewer@example.com" />
        <AdminStatusSelect
          name="status"
          defaultValue="invited"
          options={statusOptions}
          aria-label="Status"
        />
        <input name="notes" defaultValue="Cohort A" />
        <button type="submit">Add user</button>
      </form>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Active" }));
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Active");

    const formData = new FormData(screen.getByTestId("create-form") as HTMLFormElement);
    expect(parseClosedBetaAllowlistCreate(formData)).toEqual({
      ok: true,
      email: "reviewer@example.com",
      notes: "Cohort A",
      status: "active",
    });
  });
});
