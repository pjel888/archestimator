import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
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

describe("public project publication page", () => {
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

    const estimate = screen.getByRole("region", { name: "Main Estimate" });
    expect(within(estimate).getByText("Concrete works")).toBeInTheDocument();
    expect(within(estimate).getAllByText("PHP 2,300.00").length).toBeGreaterThan(0);
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
});
