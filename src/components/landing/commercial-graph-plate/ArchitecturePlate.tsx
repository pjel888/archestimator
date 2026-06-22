import type { PlateNode } from "./plate-data";
import { PlateNodeCard } from "./PlateNode";
import { PlateEdgeConnector } from "./PlateEdge";

/**
 * ArchitecturePlate — the commercial-graph architecture plate renderer
 * (doc 04 §4.2 / §4.6). RSC.
 *
 * Renders from `PLATE_NODES` (passed in). The composition is a RESPONSIVE
 * HTML grid (not one giant SVG) so the nodes are real DOM buttons (a11y +
 * crawlable claims text, doc 13 §3) and the connectors are tiny decorative
 * fragments.
 *
 * Layout (doc 04 §4.6):
 *  - Desktop (≥1024px): L1 top-center, then the L2/L3/L4 Live band as a
 *    3-up grid, then B1, then P1, connected by vertical PlateEdgeConnectors.
 *  - Tablet (768–1023px): L2/L3/L4 stack vertically beneath L1.
 *  - Mobile (≤414px): full vertical named list — every node a full-width
 *    glass tile. Sub-labels drop at ≤360px (handled in PlateNodeCard).
 *
 * The container carries `data-plate-root` so the client PlateCaption island
 * can attach ONE focusin listener and read the active node's data attributes.
 */
export interface ArchitecturePlateProps {
  nodes: readonly PlateNode[];
}

export function ArchitecturePlate({ nodes }: ArchitecturePlateProps) {
  const byId = (id: PlateNode["id"]) => nodes.find((n) => n.id === id);
  const l1 = byId("L1");
  const l2 = byId("L2");
  const l3 = byId("L3");
  const l4 = byId("L4");
  const b1 = byId("B1");
  const p1 = byId("P1");
  const liveBand = [l2, l3, l4].filter((n): n is PlateNode => Boolean(n));

  return (
    <div data-plate-root="true" className="flex flex-col">
      {/* L1 — The Estimate Tree (top center) */}
      {l1 ? (
        <div className="mx-auto w-full max-w-[420px]">
          <PlateNodeCard node={l1} />
        </div>
      ) : null}

      {/* L1 → Live band connector */}
      <div className="mx-auto">
        <PlateEdgeConnector kind="solid" label="reuses · records · becomes" />
      </div>

      {/* L2 / L3 / L4 — the horizontal Live band on desktop, vertical stack on tablet/mobile */}
      {liveBand.length > 0 ? (
        <div className="grid grid-cols-1 gap-[var(--landing-space-md)] md:grid-cols-3 md:gap-[var(--landing-space-sm)]">
          {liveBand.map((node) => (
            <PlateNodeCard key={node.id} node={node} />
          ))}
        </div>
      ) : null}

      {/* Live band → B1 connector (lighter = Building) */}
      {b1 ? (
        <div className="mx-auto">
          <PlateEdgeConnector kind="lighter" label="surfaces your accumulated history" />
        </div>
      ) : null}

      {/* B1 — Surfacing (Building) */}
      {b1 ? (
        <div className="mx-auto w-full max-w-[420px]">
          <PlateNodeCard node={b1} />
        </div>
      ) : null}

      {/* B1 → P1 connector (dashed-accent = Planned aspiration arrow, D-3) */}
      {p1 ? (
        <div className="mx-auto">
          <PlateEdgeConnector kind="dashed-accent" label="future bridge" />
        </div>
      ) : null}

      {/* P1 — The Supplier Bridge (Planned) */}
      {p1 ? (
        <div className="mx-auto w-full max-w-[420px]">
          <PlateNodeCard node={p1} />
        </div>
      ) : null}
    </div>
  );
}
