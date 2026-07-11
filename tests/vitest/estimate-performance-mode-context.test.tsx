import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createEstimatePerformanceModeSnapshot,
  getEstimatePerformanceModeMetadata,
} from "@/lib/estimates/estimate-performance-modes";
import {
  EstimatePerformanceModeProvider,
  useEstimatePerformanceModeSnapshot,
} from "@/components/workshop/estimate-performance-mode-context";

function SnapshotProbe() {
  const snapshot = useEstimatePerformanceModeSnapshot();
  return (
    <output data-testid="estimate-performance-mode-snapshot">
      {JSON.stringify(getEstimatePerformanceModeMetadata(snapshot))}
    </output>
  );
}

describe("estimate performance mode context", () => {
  it("returns the immutable all-off fallback without a provider", () => {
    render(<SnapshotProbe />);

    expect(screen.getByTestId("estimate-performance-mode-snapshot")).toHaveTextContent(
      JSON.stringify({
        schemaVersion: "estimate-performance-mode-snapshot.v1",
        source: "default",
        routeFastPath: "off",
        graph: "off",
        incrementalDerivation: "off",
        renderBoundary: "off",
        entityPatch: "off",
      }),
    );
  });

  it("exposes the server-provided snapshot unchanged to descendants", () => {
    const snapshot = createEstimatePerformanceModeSnapshot({
      source: "cloudflare",
      modes: {
        routeFastPath: "shadow",
        graph: "on",
        incrementalDerivation: "off",
        renderBoundary: "shadow",
        entityPatch: "on",
      },
    });

    render(
      <EstimatePerformanceModeProvider snapshot={snapshot}>
        <SnapshotProbe />
      </EstimatePerformanceModeProvider>,
    );

    expect(screen.getByTestId("estimate-performance-mode-snapshot")).toHaveTextContent(
      JSON.stringify({
        schemaVersion: "estimate-performance-mode-snapshot.v1",
        source: "cloudflare",
        routeFastPath: "shadow",
        graph: "on",
        incrementalDerivation: "off",
        renderBoundary: "shadow",
        entityPatch: "on",
      }),
    );
  });
});
