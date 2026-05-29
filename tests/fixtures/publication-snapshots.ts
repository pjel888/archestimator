/**
 * Publication Snapshot Test Fixtures — 7 Categories for P0.5 Fidelity Audit + P3 Tree View
 *
 * Per .ai/03_plans/share-page-estimate-view-enhancement/11-test-data-fixture-spec.md
 * and autopilot prompt §2 (P0.5) + §11 (XSS safety).
 *
 * These are synthetic but realistic, derived from the Lewis Residence seed structure
 * (groups: Lot, House, Services House; areas with "/" and " > " style names).
 * They exercise every edge the reconstruction must handle.
 *
 * DO NOT use these as production data. They exist solely for unit testing
 * reconstructTreeFromRows / reconstructTreeByDiscipline.
 */

import type { PublicationSnapshotRow } from "@/lib/publication/types";

function makeRow(
  id: string,
  description: string,
  designation: string | null,
  discipline: string,
  quantity: number,
  unit: string,
  rowTotal: number,
  imageUrl?: string | null
): PublicationSnapshotRow {
  return {
    id,
    description,
    designation: designation ?? "",
    discipline,
    material: "Various",
    quantity,
    unit,
    unitCost: rowTotal / Math.max(1, quantity),
    miscCost: 0,
    contingencyPercentage: 0,
    rowTotal,
    imageUrl: imageUrl ?? null,
  };
}

/** Category 1: Rich hierarchical (Lewis-like "Lot > House > Bedroom 1 / Guest Room" patterns) */
export const richHierarchical: PublicationSnapshotRow[] = [
  makeRow("r1", "Excavation", "Lot > House", "Site Works", 1, "LS", 12500),
  makeRow("r2", "Concrete works", "Lot > House > Ground Floor", "Structural", 1, "LS", 87500),
  makeRow("r3", "Bedroom 1 fit-out", "Lot > House > Bedroom 1 / Guest Room", "Finishes", 1, "LS", 24500),
  makeRow("r4", "Kitchen cabinets", "Lot > House > Show Kitchen", "Finishes", 1, "LS", 31200),
  makeRow("r5", "Electrical rough-in", "Lot > House > Bedroom 1 / Guest Room", "Electrical", 1, "LS", 4800),
  makeRow("r6", "Plumbing for ensuite", "Lot > House > Bedroom 2", "Plumbing", 1, "LS", 6200),
];

/** Category 2: Flat / Area-only (simple room names, no deep groups) */
export const flatAreaOnly: PublicationSnapshotRow[] = [
  makeRow("f1", "Living room flooring", "Living Room", "Finishes", 45, "m2", 18900),
  makeRow("f2", "Master bedroom paint", "Master Bedroom", "Finishes", 1, "LS", 4200),
  makeRow("f3", "Dining lighting", "Dining Area", "Electrical", 1, "LS", 3100),
];

/** Category 3: Null / Empty / Unassigned */
export const nullEmptyUnassigned: PublicationSnapshotRow[] = [
  makeRow("u1", "Contingency sum", null, "General Requirements", 1, "LS", 15000),
  makeRow("u2", "Permits and fees", "", "General Requirements", 1, "LS", 4800),
  makeRow("u3", "Misc sundries", "   ", "Unspecified", 1, "LS", 1250),
];

/** Category 4: Inconsistent delimiters (mix of >, /, -, spaces) */
export const inconsistentDelimiters: PublicationSnapshotRow[] = [
  makeRow("i1", "Roof structure", "Lot-House-Roof", "Structural", 1, "LS", 67500),
  makeRow("i2", "Guest bath tiles", "Lot / House / Bedroom 1 / Guest Room - Ensuite", "Finishes", 1, "LS", 8900),
  makeRow("i3", "Driveway", "Lot>Site Works>Driveway", "Site Works", 1, "LS", 22400),
];

/** Category 5: Lewis-representative (mirrors real seeded Lewis Residence tree) */
export const lewisRepresentative: PublicationSnapshotRow[] = [
  ...richHierarchical,
  makeRow("l7", "2-Car Parking paving", "Lot > House > 2-Car Parking", "Site Works", 1, "LS", 9800),
  makeRow("l8", "Dirty Kitchen rough-in", "Lot > House > Dirty Kitchen", "Plumbing", 1, "LS", 5600),
  makeRow("l9", "Maid's Room electrical", "Lot > House > Maid's Room", "Electrical", 1, "LS", 2100),
  makeRow("l10", "Driver's Room fit-out", "Lot > House > Driver's Room", "Finishes", 1, "LS", 7800),
];

/** Category 6: Large / Stress (300+ rows simulation — duplicates pattern for perf testing) */
export function generateLargeStress(rows: number = 420): PublicationSnapshotRow[] {
  const base = [...lewisRepresentative];
  const out: PublicationSnapshotRow[] = [...base];
  for (let i = 0; i < rows - base.length; i++) {
    const template = base[i % base.length];
    // Deterministic multiplier (no Math.random) so totals are reproducible across runs
    const factor = 0.85 + ((i * 17) % 31) / 100; // 0.85 – 1.15 range, deterministic
    out.push({
      ...template,
      id: `stress-${i}`,
      description: `${template.description} (item ${i})`,
      rowTotal: Math.round(template.rowTotal * factor),
    });
  }
  return out;
}

/** Category 7: Short/relative designation (real-world Lewis snapshot shape — rows under deep area only, e.g. "Balcony" as top segment).
 * Mirrors the reported discrepancy case where published estimate_row_items.designation leads reconstruction
 * to start mid-tree (no "General Requirements"/"Site Works"/"Lot" prefixes in the snapshot rows).
 * Virtual root wrapper (in share UI) ensures "complete available" hierarchy is presented.
 */
export const shortDesignationBalcony: PublicationSnapshotRow[] = [
  makeRow("b1", "Balcony railing", "Balcony", "Finishes", 12, "m", 18500),
  makeRow("b2", "Floor tiles - balcony", "Balcony", "Finishes", 18, "m2", 12400),
  makeRow("b3", "Drainage point", "Balcony", "Site Works", 1, "LS", 3200),
];

/** Category 7: Single-discipline / Edge totals (one discipline dominates, zero/negative edge cases) */
export const singleDisciplineEdge: PublicationSnapshotRow[] = [
  makeRow("s1", "Main structural slab", "Lot > House > Ground Floor", "Structural", 1, "LS", 142000),
  makeRow("s2", "Upper floor beams", "Lot > House > First Floor", "Structural", 1, "LS", 78500),
  makeRow("s3", "Retaining wall", "Lot > Site Works", "Structural", 1, "LS", 22100),
  makeRow("s4", "Zero cost line (edge)", "Lot > House > Storage", "Structural", 0, "LS", 0),
];

/**
 * All fixture categories (incl. shortDesignationBalcony for reported Lewis snapshot shape) exported as map.
 */
export const publicationSnapshotFixtures = {
  richHierarchical,
  flatAreaOnly,
  nullEmptyUnassigned,
  inconsistentDelimiters,
  lewisRepresentative,
  largeStress: generateLargeStress(420),
  singleDisciplineEdge,
  shortDesignationBalcony,
} as const;

export type FixtureName = keyof typeof publicationSnapshotFixtures;

/**
 * XSS safety test strings (must be rendered as literal text, never interpreted as HTML/JS)
 * Per autopilot R6 + §11 + P3 exit gate.
 */
export const maliciousXssLabels = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `"><script>evil()</script>`,
  `&lt;script&gt;alert('xss')&lt;/script&gt;`,
  `javascript:alert(1)`,
];

/**
 * Helper to inject malicious labels into a fixture for XSS unit tests.
 */
export function injectMaliciousLabels(rows: PublicationSnapshotRow[]): PublicationSnapshotRow[] {
  return rows.map((r, idx) => ({
    ...r,
    description: maliciousXssLabels[idx % maliciousXssLabels.length],
    designation: idx % 2 === 0 ? `${r.designation} ${maliciousXssLabels[(idx + 1) % maliciousXssLabels.length]}` : r.designation,
  }));
}
