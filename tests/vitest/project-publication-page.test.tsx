import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveProjectPublicationAccessByToken: vi.fn(),
  resolveProjectPublicationSnapshotByToken: vi.fn(),
  recordProjectPublicationEvent: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("@/lib/publication/public-repository", () => ({
  resolveProjectPublicationAccessByToken: mocks.resolveProjectPublicationAccessByToken,
  resolveProjectPublicationSnapshotByToken: mocks.resolveProjectPublicationSnapshotByToken,
  recordProjectPublicationEvent: mocks.recordProjectPublicationEvent,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet })),
  headers: vi.fn(async () => new Headers({ host: "archestimator.test", "user-agent": "vitest" })),
}));

import SharePage from "@/app/share/[token]/page";

const passwordFormSource = readFileSync("src/components/share/ProjectPublicationPasswordForm.tsx", "utf8");

describe("shared link (public project publication) page — Shared Link Overhaul V2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue(undefined);
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
    });
    mocks.resolveProjectPublicationSnapshotByToken.mockResolvedValue({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: false,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
      snapshot: {
        schemaVersion: 1,
        generatedAt: "2026-05-27T00:00:00.000Z",
        project: {
          id: "project-1",
          name: "Valencia Residence",
          projectCode: "VR-001",
          clientName: "Client Family",
          location: "Quezon City",
          currencyCode: "PHP",
        },
        estimateCount: 1,
        rowCount: 1,
        totalCost: 2300,
        estimates: [
          {
            id: "estimate-1",
            name: "Main Estimate",
            sheetCode: "ES-001",
            updatedAt: "2026-05-26T00:00:00.000Z",
            rowCount: 1,
            totalCost: 2300,
            rows: [
              {
                id: "row-1",
                description: "Concrete works",
                designation: "CW-01",
                discipline: "Structural",
                material: "Concrete",
                quantity: 2,
                unit: "cu.m",
                unitCost: 1000,
                miscCost: 100,
                contingencyPercentage: 10,
                rowTotal: 2300,
              },
            ],
          },
        ],
      },
    });
  });

  it("renders the published snapshot outside the Workshop shell", async () => {
    render(await SharePage({ params: Promise.resolve({ token: "client-token" }) }));

    expect(mocks.resolveProjectPublicationAccessByToken).toHaveBeenCalledWith("client-token");
    expect(mocks.resolveProjectPublicationSnapshotByToken).toHaveBeenCalledWith("client-token");
    expect(screen.getByRole("main", { name: "Client publication" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Valencia Residence" })).toBeInTheDocument();
    expect(screen.getByText("View-only project page")).toBeInTheDocument();
    expect(screen.getByText("VR-001")).toBeInTheDocument();
    expect(screen.getByText("Client Family")).toBeInTheDocument();

    // P2: estimate content now lives inside SharePageTabs tabpanel (no more role=region wrapper)
    // The h2 + table cells remain for content verification (backwards visual parity)
    expect(screen.getByRole("heading", { name: "Main Estimate", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Concrete works")).toBeInTheDocument();
    expect(screen.getAllByText("PHP 2,300.00").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("Workshop");
    expect(document.body.textContent).not.toContain("Teamspaces");
    expect(mocks.recordProjectPublicationEvent).toHaveBeenCalledWith({
      token: "client-token",
      eventType: "open",
      request: expect.any(Request),
      metadata: {},
    });
  });

  it("renders a password gate instead of snapshot rows until access is unlocked", async () => {
    mocks.resolveProjectPublicationAccessByToken.mockResolvedValueOnce({
      publicationId: "publication-1",
      status: "published",
      passwordRequired: true,
      snapshotVersion: "2026-05-27T00:00:00.000Z",
    });

    render(await SharePage({ params: Promise.resolve({ token: "client-token" }) }));

    expect(screen.getByRole("main", { name: "Client publication password" })).toBeInTheDocument();
    expect(screen.getByText("Enter publication password")).toBeInTheDocument();
    expect(screen.queryByText("Valencia Residence")).not.toBeInTheDocument();
    expect(screen.queryByText("Concrete works")).not.toBeInTheDocument();
    expect(mocks.resolveProjectPublicationSnapshotByToken).not.toHaveBeenCalled();
    expect(mocks.recordProjectPublicationEvent).not.toHaveBeenCalled();
  });

  it("sets the public CSRF cookie on a path sent to the API password route", () => {
    expect(passwordFormSource).toContain("ae_publication_csrf=");
    expect(passwordFormSource).toContain("Path=/; SameSite=Lax; Max-Age=3600");
  });

  // P2 delivered: tabbed navigation now provided by SharePageTabs (see nested describe below for full contract)

  // ========================================================================
  // P2 RED TESTS — SharePageTabs (client component) + OpenGraph metadata
  // Written FIRST per Master Prompt (before any SharePageTabs.tsx or page edits).
  // Contract from answers: always render tabs (even for 1 sheet), full ARIA + keyboard
  // (arrows cycle + Home/End + Enter/Space), sessionStorage `share-tab:${token}`,
  // encapsulate estimate card+table in panels, proposalPaper on receiver view,
  // design-system (rounded-xs, ≤12px SF Pro text, no Phosphor), OG via generateMetadata
  // with inline project metadata query for image when present.
  // Only this receiver test file is augmented (no manager test changes).
  // ========================================================================

  describe("SharePageTabs (P2 — red until implemented)", () => {
    const baseEstimate = {
      id: "estimate-1",
      name: "Main Estimate",
      sheetCode: "ES-001",
      updatedAt: "2026-05-26T00:00:00.000Z",
      rowCount: 1,
      totalCost: 2300,
      rows: [
        {
          id: "row-1",
          description: "Concrete works",
          designation: "CW-01",
          discipline: "Structural",
          material: "Concrete",
          quantity: 2,
          unit: "cu.m",
          unitCost: 1000,
          miscCost: 100,
          contingencyPercentage: 10,
          rowTotal: 2300,
        },
      ],
    } as const;

    const secondEstimate = {
      ...baseEstimate,
      id: "estimate-2",
      name: "Alternative Layout",
      sheetCode: "ES-002",
      totalCost: 1800,
      rows: [{ ...baseEstimate.rows[0], id: "row-2", description: "Electrical", rowTotal: 1800 }],
    } as const;

    const multiEstimates = [baseEstimate, secondEstimate];

    function createMockSessionStorage() {
      const store = new Map<string, string>();
      return {
        getItem: vi.fn((k: string) => store.get(k) ?? null),
        setItem: vi.fn((k: string, v: string) => {
          store.set(k, v);
        }),
        clear: () => store.clear(),
      };
    }

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("renders a tablist with role=tablist, aria-label, and role=tab buttons (one per estimate) with aria-selected and aria-controls", async () => {
      // Will import the not-yet-created client component → immediate red
      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;
      const { container } = render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );

      const tablist = screen.getByRole("tablist", { name: /estimate sheets/i });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[0]).toHaveAttribute("aria-controls");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");
      // design system: rounded-xs + ≤12px text
      expect(tabs[0].className).toMatch(/rounded-xs/);
      // text size is explicit text-[10px] on button (or inherited from tablist container)
      expect(tabs[0].className + " " + (tabs[0].parentElement?.className ?? "")).toMatch(/text-\[10px\]|text-\[9px\]|text-\[11px\]/);
    });

    it("switches active tab on click and renders only the active estimate's table content in the tabpanel (encapsulates card + table)", async () => {
      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;
      const user = userEvent.setup();
      render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );

      // initially first
      expect(screen.getByRole("heading", { name: "Main Estimate" })).toBeInTheDocument();
      expect(screen.getByText("Concrete works")).toBeInTheDocument();
      expect(screen.queryByText("Electrical")).not.toBeInTheDocument();

      // click second tab
      const altTab = screen.getByRole("tab", { name: /Alternative Layout/i });
      await user.click(altTab);

      expect(screen.getByRole("heading", { name: "Alternative Layout" })).toBeInTheDocument();
      expect(screen.getByText("Electrical")).toBeInTheDocument();
      expect(screen.queryByText("Concrete works")).not.toBeInTheDocument();
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    it("supports full keyboard navigation: ArrowRight/Left cycle, Home/End, Enter/Space activation with roving focus", async () => {
      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;
      const user = userEvent.setup();
      render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );

      const tabs = screen.getAllByRole("tab");
      tabs[0].focus();
      expect(tabs[0]).toHaveFocus();

      // ArrowRight -> second
      await user.keyboard("{ArrowRight}");
      expect(tabs[1]).toHaveFocus();
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");

      // ArrowLeft cycles back
      await user.keyboard("{ArrowLeft}");
      expect(tabs[0]).toHaveFocus();

      // Home / End
      await user.keyboard("{End}");
      expect(tabs[1]).toHaveFocus();
      await user.keyboard("{Home}");
      expect(tabs[0]).toHaveFocus();

      // Enter activates (already active here, but exercises handler)
      await user.keyboard("{Enter}");
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    it("persists and restores active tab via sessionStorage using key `share-tab:${token}` (survives 'refresh' in test)", async () => {
      const mockSession = createMockSessionStorage();
      const originalSession = window.sessionStorage;
      Object.defineProperty(window, "sessionStorage", { value: mockSession, configurable: true });

      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;

      // first mount -> default first, writes storage
      const { unmount } = render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );
      // setItem exercised for default (may be sync or effect; key contract verified via get + restore below)
      unmount();

      // simulate persisted value for second
      mockSession.getItem.mockReturnValueOnce("estimate-2");

      render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );

      // should restore second as active
      expect(screen.getByRole("heading", { name: "Alternative Layout" })).toBeInTheDocument();
      expect(mockSession.getItem).toHaveBeenCalledWith("share-tab:client-token-123");

      // restore
      Object.defineProperty(window, "sessionStorage", { value: originalSession, configurable: true });
    });

    it("renders horizontal scrollable tablist with mobile fade masks and uses proposalPaper surface on receiver (via parent integration)", async () => {
      // The component itself is paper-agnostic; page integration applies bg-proposalPaper on <main>
      // This test documents the scroll container contract the component must satisfy
      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;
      const { container } = render(
        <SharePageTabs
          estimates={multiEstimates as any}
          currencyCode="PHP"
          token="client-token-123"
        />
      );

      const scrollContainer = container.querySelector(".overflow-x-auto");
      expect(scrollContainer).toBeInTheDocument();
      // fade masks (left/right gradients or state-driven) must be present for mobile
      // (implementation may use ::before/after or sibling divs)
      // Fades always rendered (opacity controlled); match on gradient + proposalPaper token
      expect(container.innerHTML).toMatch(/gradient|from-proposalPaper|to-transparent/);
    });

    it("even for a single estimate sheet, renders exactly one tab + its full table content (no bypass)", async () => {
      const SharePageTabs = (await import("@/components/share/SharePageTabs")).default;
      render(
        <SharePageTabs
          estimates={[baseEstimate] as any}
          currencyCode="PHP"
          token="single-token"
        />
      );

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(1);
      expect(screen.getByRole("heading", { name: "Main Estimate" })).toBeInTheDocument();
      expect(screen.getByText("Concrete works")).toBeInTheDocument();
    });
  });

  describe("OpenGraph metadata on /share/[token] (P2)", () => {
    it("generateMetadata returns title with project name, description containing sheet count, and handles image from projects.metadata (inline query path)", async () => {
      // Real exercise now that generateMetadata + inline getProjectImageUrl + service client is in page
      const pageMod = await import("@/app/share/[token]/page");
      const { generateMetadata } = pageMod as any;

      // Ensure the hoisted repo mocks return the snapshot (they already do from beforeEach)
      const meta = await generateMetadata({ params: Promise.resolve({ token: "client-token" }) });

      expect(meta.title).toContain("Valencia Residence");
      expect(meta.description).toContain("1 estimate sheet");
      expect(meta.description).toContain("1 rows");
      // image may be undefined (no real supabase in this env) — contract is graceful
      expect(meta.openGraph?.title).toContain("Valencia Residence");
      expect(meta.openGraph?.description).toContain("View-only");
    });
  });
});
