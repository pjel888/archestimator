import inventorySource from "../../../.ai/03_plans/2026-06-06-ui-component-optimization-componentization/15_COMPONENT_INVENTORY_MATRIX.md?raw";
import storyCoverageSource from "../../../.ai/03_plans/2026-06-06-ui-component-optimization-componentization/17_STORYBOOK_STORY_COVERAGE_MATRIX.md?raw";

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

function markdownTableRows(source: string, rowPrefix: string) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`| ${rowPrefix}`))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

export const inventoryRows: InventoryRow[] = markdownTableRows(inventorySource, "").flatMap((cells) => {
  if (!/^[A-Z]{3}-\d{3}$/.test(cells[0] ?? "")) return [];

  return {
    id: cells[0],
    category: cells[1],
    name: cells[2],
    priority: cells[3],
    repoStatus: cells[4],
    sourcePath: cells[5],
    plannedName: cells[7],
    migrationStatus: cells[14],
  };
});

export const storyCoverageRows: StoryCoverageRow[] = markdownTableRows(storyCoverageSource, "ST-").map((cells) => ({
  storyId: cells[0],
  componentId: cells[1],
  titlePath: cells[2],
  requiredStoryNames: cells[3],
  requiredStates: cells[5],
  fixtureNeeded: cells[6],
  ownerReviewLabel: cells[11],
  status: cells[12],
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
  "P0/P1 manifest rows remain visible in the Documentation/StoryCoverageDashboard story.",
  "Provider, auth, server action, repository, analytics, and network imports are guarded by tests.",
];
