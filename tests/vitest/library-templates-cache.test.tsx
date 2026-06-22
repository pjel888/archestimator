import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";

const loadTemplatesSpy = vi.fn();
vi.mock("@/lib/component-library/actions", () => ({
  loadCurrentWorkspaceEstimateTemplates: (...args: unknown[]) => loadTemplatesSpy(...args),
}));

// Light stub for the heavy dynamic manager — reports count + exposes the T4 callback.
vi.mock("@/components/workshop/library/templates-browse/TemplatesBrowseManager", () => ({
  TemplatesBrowseManager: (props: {
    templates?: unknown[];
    onTemplatesMutated?: (updater: (items: unknown[]) => unknown[]) => void;
    onTemplatesInvalidated?: () => void;
  }) => (
    <div data-testid="tmgr">
      templates:{props.templates?.length ?? 0}
      <button
        type="button"
        data-testid="add-template"
        onClick={() => props.onTemplatesMutated?.((items) => [...items, { id: "new-t" }])}
      >
        add
      </button>
      <button
        type="button"
        data-testid="invalidate-templates"
        onClick={() => props.onTemplatesInvalidated?.()}
      >
        invalidate
      </button>
    </div>
  ),
}));

import { TemplatesBrowsePageClient } from "@/components/workshop/library/templates-browse/TemplatesBrowsePageClient";
import { workspaceEstimateTemplatesQueryKey } from "@/lib/component-library/query-keys";

function tpl(n: number, prefix = "t"): EstimateTemplate[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}` })) as unknown as EstimateTemplate[];
}

const scopeA = { userId: "user-a", workspaceId: "workspace-a" };
const scopeB = { userId: "user-b", workspaceId: "workspace-b" };

afterEach(() => loadTemplatesSpy.mockReset());

describe("Templates tab TanStack Query cache (P0 T3/T4)", () => {
  it("renders from initialData without calling the loader, and patches the cache on mutation", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient templates={tpl(2)} queryScope={scopeA} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:2");
    expect(loadTemplatesSpy).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByTestId("add-template"));
    await waitFor(() => expect(screen.getByTestId("tmgr")).toHaveTextContent("templates:3"));
    expect(qc.getQueryData<EstimateTemplate[]>(workspaceEstimateTemplatesQueryKey(scopeA))).toHaveLength(3);
    expect(loadTemplatesSpy).toHaveBeenCalledTimes(0);
  });

  it("warm second mount renders from the shared cache (no refetch)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const first = render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient templates={tpl(4)} queryScope={scopeA} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:4");
    first.unmount();
    render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient queryScope={scopeA} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:4");
    expect(loadTemplatesSpy).toHaveBeenCalledTimes(0);
  });

  it("does not reuse one user's warm template cache for another user or workspace", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const first = render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient templates={tpl(1, "user-a-secret")} queryScope={scopeA} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:1");
    first.unmount();

    render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient templates={tpl(3, "user-b")} queryScope={scopeB} />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:3");
    expect(qc.getQueryData<EstimateTemplate[]>(workspaceEstimateTemplatesQueryKey(scopeA))).toHaveLength(1);
    expect(qc.getQueryData<EstimateTemplate[]>(workspaceEstimateTemplatesQueryKey(scopeB))).toHaveLength(3);
    expect(loadTemplatesSpy).toHaveBeenCalledTimes(0);
  });

  it("exposes a scoped invalidation callback for successful template moves", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    render(
      <QueryClientProvider client={qc}>
        <TemplatesBrowsePageClient templates={tpl(2)} queryScope={scopeA} />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("tmgr")).toHaveTextContent("templates:2");

    fireEvent.click(screen.getByTestId("invalidate-templates"));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workspaceEstimateTemplatesQueryKey(scopeA) });
    });
  });
});
