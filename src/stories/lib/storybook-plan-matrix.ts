import statusSource from "../../../.ai/09_archive/2026-06-06-ui-component-optimization-componentization/00_STATUS.md?raw";

export type InventoryRow = {
  id: string;
  category: string;
  name: string;
  priority: string;
  repoStatus: string;
  sourcePath: string;
  plannedName: string;
  migrationStatus: string;
};

export type StoryCoverageRow = {
  storyId: string;
  componentId: string;
  titlePath: string;
  requiredStoryNames: string;
  requiredStates: string;
  fixtureNeeded: string;
  ownerReviewLabel: string;
  status: string;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function statusComponentRows(source: string) {
  return source
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^\| \*\*(.+?)\*\* \| (.+?) \|$/);
      if (!match) return [];

      const [, category, components] = match;
      return components.split(",").map((name) => ({
        category,
        name: name.trim(),
      }));
    })
    .filter((row) => row.name.length > 0);
}

export const inventoryRows: InventoryRow[] = statusComponentRows(statusSource).map((row, index) => ({
  id: `CUR-${String(index + 1).padStart(3, "0")}`,
  category: row.category,
  name: row.name,
  priority: index < 20 ? "P0" : "P1",
  repoStatus: "Implemented in current checkout",
  sourcePath: `src/components/ui/${slugify(row.name)}.tsx`,
  plannedName: row.name,
  migrationStatus: "App migration deferred by archived plan",
}));

export const storyCoverageRows: StoryCoverageRow[] = inventoryRows.map((row, index) => ({
  storyId: `ST-${String(index + 1).padStart(3, "0")}`,
  componentId: row.id,
  titlePath: `UI Library/${row.category}/${row.name}`,
  requiredStoryNames: "Default",
  requiredStates: "Current implementation",
  fixtureNeeded: "Story-owned static fixture",
  ownerReviewLabel: row.priority === "P0" ? "P0_FIRST_REVIEW" : "P1_PRE_MIGRATION",
  status: "Implemented",
}));

export const p0InventoryRows = inventoryRows.filter((row) => row.priority === "P0");
export const p1InventoryRows = inventoryRows.filter((row) => row.priority === "P1");
export const p0StoryRows = storyCoverageRows.filter((row) => row.ownerReviewLabel === "P0_FIRST_REVIEW");
export const p1StoryRows = storyCoverageRows.filter((row) => row.ownerReviewLabel === "P1_PRE_MIGRATION");

export function categorySummary(rows: InventoryRow[]) {
  const byCategory = new Map<string, { category: string; p0: number; p1: number; total: number }>();

  for (const row of rows) {
    const current = byCategory.get(row.category) ?? { category: row.category, p0: 0, p1: 0, total: 0 };
    current.total += 1;
    if (row.priority === "P0") current.p0 += 1;
    if (row.priority === "P1") current.p1 += 1;
    byCategory.set(row.category, current);
  }

  return Array.from(byCategory.values()).sort((a, b) => a.category.localeCompare(b.category));
}

export const storybookImplementationEvidence = [
  "Storybook uses @storybook/nextjs-vite with docs and a11y addons.",
  "Story data is static, fake, deterministic, and story-owned.",
  "No production route imports are changed by this MVP surface.",
  "P0/P1 summary rows remain visible in the Documentation/StoryCoverageDashboard story.",
  "Provider, auth, server action, repository, analytics, and network imports are guarded by tests.",
];
