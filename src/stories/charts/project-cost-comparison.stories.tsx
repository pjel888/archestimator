import type { Meta, StoryObj } from "@storybook/react";

import { ProjectChartsClient } from "@/components/workshop/project-charts/ProjectChartsClient";
import { buildSeriesByEstimate } from "@/lib/project-charts/project-comparison-view";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
  ProjectChartsData,
} from "@/lib/project-charts/types";

/**
 * Provider-free visual-QA harness for the cost-comparison page (`13` R-6 /
 * `09` P-1.8). Every story builds static, deterministic `ProjectChartsData` from
 * authored facts (no database or provider) so the empty / single / two / three /
 * truncated / null-delta states render in isolation for screenshots, the a11y
 * addon, 320px reflow, grayscale, and reduced-motion checks.
 */

const CATEGORIES: ProjectChartCategoryNodeFact[] = [
  { id: "cat-struct", parentId: null, nodeType: "category", label: "Structural", sortOrder: 1 },
  { id: "cat-mep", parentId: null, nodeType: "category", label: "MEP", sortOrder: 2 },
  { id: "cat-finish", parentId: null, nodeType: "category", label: "Finishes", sortOrder: 3 },
];
const SUPPLIERS: ProjectChartSupplierFact[] = [
  { id: "sup-1", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 },
  { id: "sup-2", name: "MEP Co", normalizedName: "mep-co", sortOrder: 2 },
];

function area(estimateId: string, slug: string, name: string): ProjectChartNodeFact {
  return { id: `${estimateId}-${slug}`, estimateId, parentId: null, kind: "Area", name, sortOrder: 1 };
}
function row(
  estimateId: string,
  id: string,
  areaSlug: string,
  categoryNodeId: string,
  supplierId: string | null,
  qty: number,
  unit: number,
): ProjectChartRowFact {
  return {
    id,
    estimateId,
    nodeId: `${estimateId}-${areaSlug}`,
    categoryNodeId,
    supplierId,
    supplierName: null,
    sourceSupplierId: null,
    sourceSupplierName: null,
    quantity: qty,
    unitCost: unit,
    miscCost: 0,
  };
}

function makeData(opts: {
  estimateOptions: ProjectChartEstimateOption[];
  rows: ProjectChartRowFact[];
  nodes: ProjectChartNodeFact[];
  requiresSelectedPair?: boolean;
  didTruncate?: boolean;
}): ProjectChartsData {
  return {
    projectId: "story-project",
    projectName: "Lewis Residence",
    estimateOptions: opts.estimateOptions,
    seriesByEstimateId: buildSeriesByEstimate(
      { estimates: opts.estimateOptions, rows: opts.rows, nodes: opts.nodes, categoryNodes: CATEGORIES, suppliers: SUPPLIERS },
      opts.estimateOptions.map((estimate) => estimate.id),
    ),
    loadMode: "all-estimates",
    requiresSelectedPair: opts.requiresSelectedPair ?? false,
    didTruncate: opts.didTruncate ?? false,
    rowLimit: 5000,
    estimateLimit: 20,
  };
}

function estimate(id: string, name: string): ProjectChartEstimateOption {
  return { id, name, sheetCode: id.toUpperCase(), currencyCode: "PHP", updatedAt: null, rowCount: 0, totalCost: 0 };
}

const TWO = makeData({
  estimateOptions: [estimate("schematic", "Schematic"), estimate("tender", "Tender")],
  nodes: [
    area("schematic", "struct", "Structural"),
    area("schematic", "mep", "MEP"),
    area("schematic", "finish", "Finishes"),
    area("tender", "struct", "Structural"),
    area("tender", "mep", "MEP"),
    area("tender", "finish", "Finishes"),
  ],
  rows: [
    row("schematic", "s1", "struct", "cat-struct", "sup-1", 30, 100),
    row("schematic", "s2", "mep", "cat-mep", "sup-2", 18, 100),
    row("schematic", "s3", "finish", "cat-finish", "sup-1", 9, 100),
    row("tender", "t1", "struct", "cat-struct", "sup-1", 24, 100),
    row("tender", "t2", "mep", "cat-mep", "sup-2", 16, 100),
    row("tender", "t3", "finish", "cat-finish", "sup-1", 10, 100),
  ],
});

const THREE = makeData({
  estimateOptions: [estimate("schematic", "Schematic"), estimate("tender", "Tender"), estimate("revised", "Revised")],
  nodes: [
    area("schematic", "struct", "Structural"),
    area("schematic", "mep", "MEP"),
    area("tender", "struct", "Structural"),
    area("tender", "mep", "MEP"),
    area("revised", "struct", "Structural"),
    area("revised", "mep", "MEP"),
  ],
  rows: [
    row("schematic", "s1", "struct", "cat-struct", "sup-1", 30, 100),
    row("schematic", "s2", "mep", "cat-mep", "sup-2", 18, 100),
    row("tender", "t1", "struct", "cat-struct", "sup-1", 24, 100),
    row("tender", "t2", "mep", "cat-mep", "sup-2", 16, 100),
    row("revised", "r1", "struct", "cat-struct", "sup-1", 27, 100),
    row("revised", "r2", "mep", "cat-mep", "sup-2", 17, 100),
  ],
});

const SINGLE = makeData({
  estimateOptions: [estimate("schematic", "Schematic")],
  nodes: [area("schematic", "struct", "Structural"), area("schematic", "mep", "MEP")],
  rows: [row("schematic", "s1", "struct", "cat-struct", "sup-1", 30, 100), row("schematic", "s2", "mep", "cat-mep", "sup-2", 18, 100)],
});

// A bucket present only in the comparand → deltaPercent null → "new".
const NULL_DELTA = makeData({
  estimateOptions: [estimate("schematic", "Schematic"), estimate("tender", "Tender")],
  nodes: [area("schematic", "struct", "Structural"), area("tender", "struct", "Structural"), area("tender", "mep", "MEP")],
  rows: [
    row("schematic", "s1", "struct", "cat-struct", "sup-1", 20, 100),
    row("tender", "t1", "struct", "cat-struct", "sup-1", 20, 100),
    row("tender", "t2", "mep", "cat-mep", "sup-2", 12, 100),
  ],
});

const TRUNCATED = makeData({
  estimateOptions: [estimate("schematic", "Schematic"), estimate("tender", "Tender")],
  nodes: [area("schematic", "struct", "Structural"), area("tender", "struct", "Structural")],
  rows: [row("schematic", "s1", "struct", "cat-struct", "sup-1", 30, 100), row("tender", "t1", "struct", "cat-struct", "sup-1", 24, 100)],
  requiresSelectedPair: true,
  didTruncate: true,
});

const EMPTY = makeData({ estimateOptions: [], rows: [], nodes: [] });

const meta = {
  title: "Charts/ProjectCostComparison",
  component: ProjectChartsClient,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Provider-free cost-comparison page across its key states. Static data props only; no database or provider context.",
      },
    },
  },
  args: { initialGroupingMode: "space" },
  decorators: [
    (Story) => (
      <div className="h-[640px] w-full overflow-hidden border border-hairline">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectChartsClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoEstimateVariance: Story = {
  args: { data: TWO, initialLeftEstimateId: "schematic", initialRightEstimateId: "tender" },
};
export const ThreeEstimateMax: Story = {
  args: { data: THREE, initialLeftEstimateId: "schematic", initialRightEstimateId: "tender" },
};
export const SingleEstimate: Story = {
  args: { data: SINGLE, initialLeftEstimateId: "schematic", initialRightEstimateId: "schematic" },
};
export const NullDeltaNewBucket: Story = {
  args: { data: NULL_DELTA, initialLeftEstimateId: "schematic", initialRightEstimateId: "tender" },
};
export const LargeTruncated: Story = {
  args: { data: TRUNCATED, initialLeftEstimateId: "schematic", initialRightEstimateId: "tender" },
};
export const NoEstimates: Story = {
  args: { data: EMPTY, initialLeftEstimateId: null, initialRightEstimateId: null },
};
