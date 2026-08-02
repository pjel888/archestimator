import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateLinkedInstancesStatus } from "@/components/workshop/library/template-editor/TemplateLinkedInstancesStatus";

type QueryOptions = {
  queryKey: readonly string[];
  queryFn: () => Promise<unknown>;
  refetchInterval: (query: { state: { data?: { updatingCount: number } } }) => number | false;
};

type QueryResult = {
  data?: ReturnType<typeof buildStatus>;
  isPending: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

const queryMocks = vi.hoisted(() => ({
  options: null as QueryOptions | null,
  result: null as QueryResult | null,
  invalidateQueries: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  loadEstimateTemplateLinkedInstanceStatus: vi.fn(),
  retryEstimateTemplateLinkedInstances: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    queryMocks.options = options;
    return queryMocks.result;
  },
  useQueryClient: () => ({ invalidateQueries: queryMocks.invalidateQueries }),
}));

vi.mock("@/lib/component-library/template-editor-actions", () => actionMocks);

vi.mock("next/dynamic", () => ({
  default: () => function VirtualizedListStub({ items }: { items: unknown[] }) {
    return <div data-testid="virtualized-linked-instances">{items.length} instances</div>;
  },
}));

function buildStatus(overrides: Partial<{
  activeCount: number;
  currentCount: number;
  updatingCount: number;
  failedCount: number;
  retryableCount: number;
}> = {}) {
  return {
    templateId: "template-1",
    currentVersionNumber: 3,
    activeCount: 3,
    currentCount: 3,
    updatingCount: 0,
    failedCount: 0,
    retryableCount: 0,
    items: [
      {
        instanceId: "instance-1",
        projectId: "project-1",
        projectName: "Project One",
        estimateId: "estimate-1",
        estimateName: "Estimate One",
        rootNodeId: "node-1",
        linkState: "linked" as const,
        appliedVersionNumber: 3,
        targetVersionNumber: 3,
        failureClass: null,
        retryable: false,
      },
    ],
    ...overrides,
  };
}

function setQueryResult({
  data,
  isPending = false,
  isError = false,
}: {
  data?: ReturnType<typeof buildStatus>;
  isPending?: boolean;
  isError?: boolean;
}) {
  const refetch = vi.fn();
  queryMocks.result = { data, isPending, isError, refetch };
  return refetch;
}

function renderStatus(canEdit = true) {
  return render(<TemplateLinkedInstancesStatus templateId="template-1" canEdit={canEdit} />);
}

describe("TemplateLinkedInstancesStatus branches", () => {
  beforeEach(() => {
    queryMocks.options = null;
    queryMocks.result = null;
    queryMocks.invalidateQueries.mockReset();
    queryMocks.invalidateQueries.mockResolvedValue(undefined);
    actionMocks.loadEstimateTemplateLinkedInstanceStatus.mockReset();
    actionMocks.retryEstimateTemplateLinkedInstances.mockReset();
  });

  it("configures polling, loads through the action, and supports unavailable-state retry", async () => {
    actionMocks.loadEstimateTemplateLinkedInstanceStatus.mockResolvedValue(buildStatus());
    setQueryResult({ isPending: true });
    const pending = renderStatus();

    expect(screen.getByLabelText("Loading linked instance status")).toBeInTheDocument();
    expect(queryMocks.options?.queryKey).toEqual(["estimate-template-linked-instances", "template-1"]);
    await expect(queryMocks.options?.queryFn()).resolves.toEqual(buildStatus());
    expect(actionMocks.loadEstimateTemplateLinkedInstanceStatus).toHaveBeenCalledWith({ templateId: "template-1" });
    expect(queryMocks.options?.refetchInterval({ state: { data: { updatingCount: 1 } } })).toBe(4_000);
    expect(queryMocks.options?.refetchInterval({ state: { data: { updatingCount: 0 } } })).toBe(false);

    pending.unmount();
    const refetch = setQueryResult({ isError: true });
    renderStatus();

    expect(screen.getByText("Couldn't load linked-instance status.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("hides empty status and presents failed, updating, stale, and read-only states", () => {
    setQueryResult({ data: buildStatus({ activeCount: 0, currentCount: 0 }) });
    const empty = renderStatus();
    expect(screen.queryByRole("region", { name: "Linked instances" })).not.toBeInTheDocument();

    empty.unmount();
    const failedRefetch = setQueryResult({
      data: buildStatus({ currentCount: 1, failedCount: 2, retryableCount: 2 }),
      isError: true,
    });
    const failed = renderStatus(false);
    expect(screen.getByText(/2 of 3 need attention/)).toHaveTextContent("Status may be outdated");
    expect(screen.queryByRole("button", { name: "Retry 2" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(failedRefetch).toHaveBeenCalledTimes(1);

    failed.unmount();
    setQueryResult({ data: buildStatus({ currentCount: 2, updatingCount: 1 }) });
    renderStatus(false);
    expect(screen.getByText(/1 updating/)).toHaveTextContent("2 current");
  });

  it("retries failed instances, invalidates status, and toggles the detail list", async () => {
    let resolveRetry: (() => void) | undefined;
    actionMocks.retryEstimateTemplateLinkedInstances.mockReturnValue(new Promise<void>((resolve) => {
      resolveRetry = resolve;
    }));
    setQueryResult({ data: buildStatus({ currentCount: 1, failedCount: 2, retryableCount: 2 }) });
    renderStatus();

    fireEvent.click(screen.getByRole("button", { name: "Retry 2" }));
    expect(actionMocks.retryEstimateTemplateLinkedInstances).toHaveBeenCalledWith({ templateId: "template-1" });
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();

    await act(async () => {
      resolveRetry?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(queryMocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["estimate-template-linked-instances", "template-1"],
    }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry 2" })).toBeEnabled());

    const details = screen.getByText("View affected Estimates").closest("details");
    expect(details).not.toBeNull();
    details!.open = true;
    fireEvent(details!, new Event("toggle", { bubbles: true }));
    expect(await screen.findByTestId("virtualized-linked-instances")).toHaveTextContent("1 instances");

    details!.open = false;
    fireEvent(details!, new Event("toggle", { bubbles: true }));
    await waitFor(() => expect(screen.queryByTestId("virtualized-linked-instances")).not.toBeInTheDocument());
  });
});
