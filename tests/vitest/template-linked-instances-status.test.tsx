import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateLinkedInstancesStatus } from "@/components/workshop/library/template-editor/TemplateLinkedInstancesStatus";

const actionMocks = vi.hoisted(() => ({
  loadEstimateTemplateLinkedInstanceStatus: vi.fn(),
  retryEstimateTemplateLinkedInstances: vi.fn(),
}));

vi.mock("@/lib/component-library/template-editor-actions", () => actionMocks);

type LinkedInstance = {
  instanceId: string;
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  rootNodeId: string;
  linkState: "linked" | "updating" | "failed";
  appliedVersionNumber: number;
  targetVersionNumber: number;
  failureClass: string | null;
  retryable: boolean;
};

type LinkedStatus = {
  templateId: string;
  currentVersionNumber: number;
  activeCount: number;
  currentCount: number;
  updatingCount: number;
  failedCount: number;
  retryableCount: number;
  items: LinkedInstance[];
};

const linkedItem: LinkedInstance = {
  instanceId: "instance-1",
  projectId: "project-1",
  projectName: "Project One",
  estimateId: "estimate-1",
  estimateName: "Estimate One",
  rootNodeId: "node-1",
  linkState: "linked",
  appliedVersionNumber: 1,
  targetVersionNumber: 1,
  failureClass: null,
  retryable: false,
};

const defaultStatus: LinkedStatus = {
  templateId: "template-1",
  currentVersionNumber: 1,
  activeCount: 1,
  currentCount: 1,
  updatingCount: 0,
  failedCount: 0,
  retryableCount: 0,
  items: [linkedItem],
};

function mockStatus(overrides: Partial<LinkedStatus> = {}) {
  const status = { ...defaultStatus, ...overrides };
  actionMocks.loadEstimateTemplateLinkedInstanceStatus.mockResolvedValue(status);
  return status;
}

function renderStatus(canEdit = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <TemplateLinkedInstancesStatus templateId="template-1" canEdit={canEdit} />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient };
}

function openInstanceList() {
  const summary = screen.getByText("View affected Estimates");
  const details = summary.closest("details");
  expect(details).not.toBeNull();
  details!.open = true;
  fireEvent(details!, new Event("toggle", { bubbles: true }));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("TemplateLinkedInstancesStatus", () => {
  beforeEach(() => {
    actionMocks.loadEstimateTemplateLinkedInstanceStatus.mockReset();
    actionMocks.retryEstimateTemplateLinkedInstances.mockReset();
    mockStatus();
  });

  it("loads the virtualized instance list only after its details disclosure opens", async () => {
    renderStatus();

    expect(await screen.findByRole("region", { name: "Linked instances" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Project One/ })).not.toBeInTheDocument();

    openInstanceList();

    const link = await screen.findByRole("link", { name: /Project One/ });
    expect(link).toHaveAttribute("href", "/workshop/projects/project-1/estimates/estimate-1");
    expect(link.closest("[data-template-linked-instance-virtual-list]"))
      .toHaveAttribute("data-template-linked-instance-virtual-list", "true");
  });

  it("retries a failed initial status load", async () => {
    actionMocks.loadEstimateTemplateLinkedInstanceStatus
      .mockReset()
      .mockRejectedValueOnce(new Error("status unavailable"))
      .mockResolvedValue(defaultStatus);
    renderStatus();

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: "Linked instances" })).toBeInTheDocument();
    expect(actionMocks.loadEstimateTemplateLinkedInstanceStatus).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when the template has no active linked instances", async () => {
    mockStatus({ activeCount: 0, currentCount: 0, items: [] });
    renderStatus();

    expect(screen.getByLabelText("Loading linked instance status")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText("Loading linked instance status")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("region", { name: "Linked instances" })).not.toBeInTheDocument();
  });

  it("shows a failed summary and completes the retry lifecycle", async () => {
    const retry = createDeferred<number>();
    actionMocks.retryEstimateTemplateLinkedInstances.mockReturnValue(retry.promise);
    mockStatus({
      currentCount: 0,
      failedCount: 1,
      retryableCount: 1,
      items: [{ ...linkedItem, linkState: "failed", failureClass: "transient", retryable: true }],
    });
    renderStatus();

    expect(await screen.findByText("1 of 1 need attention")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry 1" }));

    const retryingButton = await screen.findByRole("button", { name: "Retrying…" });
    expect(retryingButton).toBeDisabled();
    expect(actionMocks.retryEstimateTemplateLinkedInstances).toHaveBeenCalledWith({ templateId: "template-1" });

    await act(async () => retry.resolve(1));

    await waitFor(() => expect(actionMocks.loadEstimateTemplateLinkedInstanceStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry 1" })).toBeEnabled());
  });

  it("hides retry controls from read-only users", async () => {
    mockStatus({
      currentCount: 0,
      failedCount: 1,
      retryableCount: 1,
      items: [{ ...linkedItem, linkState: "failed", failureClass: "transient", retryable: true }],
    });
    renderStatus(false);

    expect(await screen.findByText("1 of 1 need attention")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry 1" })).not.toBeInTheDocument();
  });

  it("refreshes an updating status and marks retained data stale after a refetch error", async () => {
    const updatingStatus: LinkedStatus = {
      ...defaultStatus,
      currentCount: 0,
      updatingCount: 1,
      items: [{ ...linkedItem, linkState: "updating", targetVersionNumber: 2 }],
    };
    actionMocks.loadEstimateTemplateLinkedInstanceStatus
      .mockReset()
      .mockResolvedValueOnce(updatingStatus)
      .mockRejectedValueOnce(new Error("refresh failed"));
    renderStatus();

    expect(await screen.findByText("1 updating · 0 current")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText(/Status may be outdated/)).toBeInTheDocument();
    expect(actionMocks.loadEstimateTemplateLinkedInstanceStatus).toHaveBeenCalledTimes(2);
  });

  it("renders linked, updating, and failed virtual row states", async () => {
    mockStatus({
      activeCount: 3,
      currentCount: 1,
      updatingCount: 1,
      failedCount: 1,
      items: [
        linkedItem,
        {
          ...linkedItem,
          instanceId: "instance-2",
          projectId: "project-2",
          projectName: "Project Two",
          estimateId: "estimate-2",
          estimateName: "Estimate Two",
          linkState: "updating",
          targetVersionNumber: 2,
        },
        {
          ...linkedItem,
          instanceId: "instance-3",
          projectId: "project-3",
          projectName: "Project Three",
          estimateId: "estimate-3",
          estimateName: "Estimate Three",
          linkState: "failed",
          failureClass: "permanent",
        },
      ],
    });
    renderStatus();

    expect(await screen.findByRole("region", { name: "Linked instances" })).toBeInTheDocument();
    openInstanceList();

    expect(await screen.findByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v1→2")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toHaveClass("text-danger");
    expect(screen.getByRole("link", { name: /Project Two/ })).toHaveAttribute(
      "href",
      "/workshop/projects/project-2/estimates/estimate-2",
    );
  });

  it("keeps the dynamically loaded list bounded for a large status", async () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      ...linkedItem,
      instanceId: `instance-${index}`,
      projectId: `project-${index}`,
      projectName: `Project ${index}`,
      estimateId: `estimate-${index}`,
      estimateName: `Estimate ${index}`,
    }));
    mockStatus({ activeCount: items.length, currentCount: items.length, items });
    const { container } = renderStatus();

    expect(await screen.findByRole("region", { name: "Linked instances" })).toBeInTheDocument();
    openInstanceList();

    await waitFor(() => {
      expect(container.querySelector("[data-template-linked-instance-virtual-list='true']")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("link").length).toBeLessThan(items.length);
  });
});
