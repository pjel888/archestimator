import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SharePageSummaryCard } from "@/components/share/SharePageSummaryCard";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

// Minimal inline snapshot (the shared fixtures file only exports rows, not full
// ProjectPublicationSnapshot objects). All Summary-card fields are sourced from here.
const snapshot: ProjectPublicationSnapshot = {
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
  estimateCount: 3,
  rowCount: 128,
  totalCost: 1234567.5,
  estimates: [],
};

describe("SharePageSummaryCard (AC-UX-12 trust card)", () => {
  it("renders the formatted grand total at the 24px anchor size", () => {
    const { container } = render(<SharePageSummaryCard snapshot={snapshot} />);

    const total = screen.getByText("PHP 1,234,567.50");
    expect(total).toBeInTheDocument();
    // The grand total is the visual anchor: 24px tabular-nums.
    expect(total.className).toMatch(/text-\[24px\]/);
    expect(total.className).toMatch(/tabular-nums/);

    // No element in the card renders client-facing text below the 11px floor.
    expect(container.innerHTML).not.toMatch(/text-\[(?:8|9|10)px\]/);
  });

  it("renders sheet count, line-item (row) count, currency, client name, and prepared-on from the snapshot", () => {
    render(<SharePageSummaryCard snapshot={snapshot} />);

    // Sheet / line-item counts
    expect(screen.getByText("Sheets")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Line items")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();

    // Currency code
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("PHP")).toBeInTheDocument();

    // Client name
    expect(screen.getByText("Prepared for")).toBeInTheDocument();
    expect(screen.getByText("Client Family")).toBeInTheDocument();

    // Prepared on — generatedAt formatted as a human date (en-PH long form)
    expect(screen.getByText("Prepared on")).toBeInTheDocument();
    expect(screen.getByText("May 27, 2026")).toBeInTheDocument();
  });

  it("singularizes count labels and omits the client row when no client name is present", () => {
    const soloSnapshot: ProjectPublicationSnapshot = {
      ...snapshot,
      estimateCount: 1,
      rowCount: 1,
      project: { ...snapshot.project, clientName: null },
    };

    render(<SharePageSummaryCard snapshot={soloSnapshot} />);

    expect(screen.getByText("Sheet")).toBeInTheDocument();
    expect(screen.getByText("Line item")).toBeInTheDocument();
    expect(screen.queryByText("Prepared for")).not.toBeInTheDocument();
  });
});
