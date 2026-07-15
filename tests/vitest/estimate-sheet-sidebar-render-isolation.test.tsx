import { useState } from "react";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { resetComponentLibraryAccountPreferencesClientCacheForTests } from "@/components/workshop/component-library/account-preferences-client";
import { estimateLibraryItems } from "./fixtures/estimate-library-items";

const actionMocks = vi.hoisted(() => ({
  loadComponentLibraryUserPreferences: vi.fn(),
  saveComponentLibraryUserPreferences: vi.fn(),
}));
const renderCounts = vi.hoisted(() => ({ libraryTree: 0 }));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn(), dismissToast: vi.fn(), clearToasts: vi.fn() }),
}));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/component-library/actions")>()),
  loadComponentLibraryUserPreferences: actionMocks.loadComponentLibraryUserPreferences,
  saveComponentLibraryUserPreferences: actionMocks.saveComponentLibraryUserPreferences,
}));
vi.mock("@/components/workshop/component-library/tree/LibraryTree", () => ({
  LibraryTree: () => {
    renderCounts.libraryTree += 1;
    return <div data-testid="library-tree" />;
  },
}));

const libraryItems = estimateLibraryItems.slice(0, 3);
const templates = [{ id: "sidebar-template", name: "Sidebar template", category: "Rooms", createdAt: "2026-06-26T00:00:00.000Z", nodes: [] }];

function ParentOnlyUpdate() {
  const [revision, setRevision] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRevision((current) => current + 1)}>Parent revision {revision}</button>
      <EstimateRightSidebar
        initialLibraryItems={libraryItems}
        templates={templates}
        enableReusableProjectSources={false}
        useStoredPreferences={false}
      />
    </>
  );
}

describe("estimate sheet sidebar render isolation", () => {
  afterEach(() => {
    cleanup();
    resetComponentLibraryAccountPreferencesClientCacheForTests();
    renderCounts.libraryTree = 0;
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("does not commit the memoized sidebar for a parent-only sheet update", () => {
    render(<ParentOnlyUpdate />);
    expect(renderCounts.libraryTree).toBeGreaterThan(0);

    renderCounts.libraryTree = 0;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Parent revision 0/i }));
    });

    expect(screen.getByRole("button", { name: /Parent revision 1/i })).toBeInTheDocument();
    expect(renderCounts.libraryTree).toBe(0);
  });
});
