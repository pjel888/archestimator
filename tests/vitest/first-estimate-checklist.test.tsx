import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FirstEstimateChecklist } from "@/components/workshop/FirstEstimateChecklist";
import type { ActivationProgress } from "@/lib/onboarding/activation-repository";

const mocks = vi.hoisted(() => ({
  dismiss: vi.fn(),
  refresh: vi.fn(),
  reopen: vi.fn(),
}));

vi.mock("@/lib/onboarding/activation-actions", () => ({
  dismissActivationChecklist: mocks.dismiss,
  reopenActivationChecklist: mocks.reopen,
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh }),
}));

function progress(overrides: Partial<ActivationProgress> = {}): ActivationProgress {
  return {
    userId: "user-1",
    workspaceId: "workspace-1",
    selectedPath: "guided_sample",
    projectId: "project-1",
    estimateId: "estimate-1",
    lastMilestone: "project_created",
    firstValueCompletedAt: null,
    checklistDismissedAt: null,
    checklistReopenedAt: null,
    supportState: "none",
    lastEventAt: "2026-07-12T00:00:00.000Z",
    version: 1,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("FirstEstimateChecklist", () => {
  beforeEach(() => {
    mocks.dismiss.mockReset();
    mocks.dismiss.mockResolvedValue(undefined);
    mocks.refresh.mockReset();
    mocks.reopen.mockReset();
    mocks.reopen.mockResolvedValue(undefined);
  });

  it("renders incomplete checklist items with scoped links and a non-blocking degraded support CTA", () => {
    render(<FirstEstimateChecklist progress={progress()} />);

    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "Create a project (complete)")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open" })[0]).toHaveAttribute("href", "/workshop/projects/project-1");
    expect(screen.getByText(/some checklist steps are not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/some checklist steps are not available yet/i).closest("[data-checklist-availability]")).toHaveAttribute("data-checklist-availability", "degraded");
    expect(screen.getByRole("link", { name: "contact support" })).toHaveAttribute("href", "mailto:support@archestimator.com?subject=Archestimator%20getting%20started");
  });

  it("collapses completed progress with a polite announcement and a reopen control", () => {
    render(<FirstEstimateChecklist progress={progress({ lastMilestone: "first_valid_total" })} />);

    expect(screen.getByText("Your first estimate is ready.")).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen checklist" })).toBeInTheDocument();
  });

  it("uses persisted dismissed and reopened states to select the correct control", () => {
    const { rerender } = render(<FirstEstimateChecklist progress={progress({ checklistDismissedAt: "2026-07-12T01:00:00.000Z" })} />);

    expect(screen.getByRole("button", { name: "Reopen checklist" })).toBeInTheDocument();
    rerender(<FirstEstimateChecklist progress={progress({
      checklistDismissedAt: "2026-07-12T01:00:00.000Z",
      checklistReopenedAt: "2026-07-12T02:00:00.000Z",
    })} />);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("refreshes only after a dismiss action resolves", async () => {
    let resolveDismiss: (() => void) | undefined;
    mocks.dismiss.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveDismiss = resolve;
    }));
    const user = userEvent.setup();
    render(<FirstEstimateChecklist progress={progress()} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(mocks.dismiss).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).not.toHaveBeenCalled();

    resolveDismiss?.();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("keeps unavailable activation data actionable without redirecting or fabricating completion", () => {
    render(<FirstEstimateChecklist progress={null} />);

    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(screen.getByText("Create a project")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "Publish when ready (not available)")).toBeInTheDocument();
    expect(screen.getByText(/some checklist steps are not available yet/i)).toBeInTheDocument();
  });
});
