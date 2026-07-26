import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAllowlistManager } from "@/components/admin/AdminAllowlistManager";
import { ToastProvider } from "@/components/ui/toast";

const actionMocks = vi.hoisted(() => ({
  createClosedBetaAllowlistEntries: vi.fn(),
  updateClosedBetaAllowlistEntry: vi.fn(),
}));

vi.mock("@/lib/auth/beta-allowlist-admin-actions", () => ({
  createClosedBetaAllowlistEntries: actionMocks.createClosedBetaAllowlistEntries,
  updateClosedBetaAllowlistEntry: actionMocks.updateClosedBetaAllowlistEntry,
}));

describe("AdminAllowlistManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toasts an allowlist mutation failure without changing the URL", async () => {
    const user = userEvent.setup();
    const urlBeforeSubmit = window.location.href;
    actionMocks.createClosedBetaAllowlistEntries.mockResolvedValue({
      ok: false,
      code: "save",
      message: "Allowlist could not be saved.",
    });

    const { container } = render(
      <ToastProvider>
        <AdminAllowlistManager
          authorized
          counts={{ active: 0, invited: 0, revoked: 0, total: 0 }}
          error={null}
          notice={null}
          rows={[]}
          statusFilter=""
        />
      </ToastProvider>,
    );

    const emails = container.querySelector<HTMLTextAreaElement>('textarea[name="emails"]');
    expect(emails).not.toBeNull();
    await user.type(emails!, "reviewer@example.test");
    await user.click(screen.getByRole("button", { name: "Add email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Allowlist could not be saved.");
    expect(window.location.href).toBe(urlBeforeSubmit);
  });
});
