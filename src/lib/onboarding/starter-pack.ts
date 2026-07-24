import "server-only";

export const STARTER_PACK_VERSION = 1;
export const GUIDED_SAMPLE_VERSION = 2;
export const GUIDED_SAMPLE_KIND = "estimate_sheet_foundations";
export const GUIDED_SAMPLE_PROJECT_NAME = "Practice — Residential Fit-Out";
export const STARTER_EXAMPLES_GROUP_NAME = "Starter Examples";

export type StarterRowDefinition = {
  key: string;
  material: string;
  description: string;
  designation: string;
  discipline: string;
  unit: string;
  quantity: number;
  unitCost: number;
  miscCost?: number;
  source: "project" | "worked" | "practice";
};

export function createStarterRowMetadata(
  row: StarterRowDefinition,
  input: {
    createdAt: string;
    estimateId: string;
    nodeId: string;
    origin: "guided_practice" | "starter_pack";
    projectId: string;
    rowId: string;
  },
) {
  if (row.source === "worked") return {};
  const expressComponent = {
    kind: "express" as const,
    schemaVersion: 1 as const,
    id: input.rowId,
    componentId: input.rowId,
    componentName: row.material,
    createdFrom: input.origin,
    createdAt: input.createdAt,
  };
  if (row.source === "practice") {
    return {
      expressComponent,
      ...(input.origin === "guided_practice"
        ? { guidedPracticeRole: "price_and_save" as const }
        : {}),
    };
  }
  return {
    expressComponent,
    projectComponentProjection: {
      classification: "express" as const,
      componentId: input.rowId,
      estimateId: input.estimateId,
      nodeId: input.nodeId,
      projectId: input.projectId,
      sourceRowId: input.rowId,
    },
  };
}

export type StarterNodeDefinition = {
  key: string;
  parentKey: string | null;
  kind: "group" | "area";
  name: string;
  rows: readonly StarterRowDefinition[];
};

export type StarterEstimateDefinition = {
  key: string;
  name: string;
  sheetCode: string;
  tabName: string;
  nodes: readonly StarterNodeDefinition[];
};

export type StarterProjectDefinition = {
  key: string;
  name: string;
  projectCode: string;
  currencyCode: "PHP";
  label: "Tutorial" | "Reference" | "Sandbox";
  estimates: readonly StarterEstimateDefinition[];
};

export type StarterComponentDefinition = {
  key: string;
  name: string;
  description: string;
  folderKey: "folder.finishes" | "folder.fixtures_services" | "protected.uncategorized";
  unit: string;
  variants: readonly {
    label: string;
    unit: string;
    unitCost: number;
    isDefault: boolean;
  }[];
};

export type StarterTemplateDefinition = {
  key: string;
  name: string;
  description: string;
  category: "Residential Rooms" | "Exterior + Site";
  sourceComponentKey: string;
  groupName: string;
  areaName: string;
};

export const GUIDED_ESTIMATE_BLUEPRINT: StarterEstimateDefinition = {
  key: "estimate.foundations",
  name: "Estimate Sheet Foundations",
  sheetCode: "ES-001",
  tabName: "Main Estimate",
  nodes: [
    {
      key: "group.interior_fit_out",
      parentKey: null,
      kind: "group",
      name: "Interior Fit-Out",
      rows: [],
    },
    {
      key: "area.living_dining",
      parentKey: "group.interior_fit_out",
      kind: "area",
      name: "Living & Dining",
      rows: [
        {
          key: "row.paint_worked",
          material: "Interior Paint Finish",
          description: "Worked example with a saved quantity and unit cost.",
          designation: "Worked example",
          discipline: "Finishes",
          unit: "sqm",
          quantity: 42,
          unitCost: 385,
          source: "worked",
        },
        {
          key: "row.partition_project",
          material: "Project-specific Feature Partition",
          description: "A Project-owned row for practicing reuse decisions.",
          designation: "Project source",
          discipline: "Partitions",
          unit: "sqm",
          quantity: 12,
          unitCost: 1450,
          source: "project",
        },
      ],
    },
    {
      key: "area.kitchen",
      parentKey: "group.interior_fit_out",
      kind: "area",
      name: "Kitchen",
      rows: [
        {
          key: "row.tile_practice",
          material: "Porcelain Floor Tile",
          description: "Practice row: review the quantity and save a deliberate change.",
          designation: "Practice",
          discipline: "Finishes",
          unit: "sqm",
          quantity: 18,
          unitCost: 0,
          source: "practice",
        },
      ],
    },
    {
      key: "area.bathroom",
      parentKey: "group.interior_fit_out",
      kind: "area",
      name: "Bathroom",
      rows: [
        {
          key: "row.fixture_allowance",
          material: "Plumbing Fixture Allowance",
          description: "Allowance row showing a complete saved cost.",
          designation: "Allowance",
          discipline: "Plumbing",
          unit: "lot",
          quantity: 1,
          unitCost: 48_000,
          source: "worked",
        },
      ],
    },
  ],
};

export const STARTER_PACK_MANIFEST = {
  version: STARTER_PACK_VERSION,
  folders: [
    { key: "folder.finishes", name: "Starter — Finishes", sortOrder: 10 },
    { key: "folder.fixtures_services", name: "Starter — Fixtures & Services", sortOrder: 20 },
  ],
  projects: [
    {
      key: "project.tutorial",
      name: "Tutorial — Residential Fit-Out",
      projectCode: "START-TUT",
      currencyCode: "PHP",
      label: "Tutorial",
      estimates: [GUIDED_ESTIMATE_BLUEPRINT],
    },
    {
      key: "project.reference",
      name: "Reference — Small Commercial Refresh",
      projectCode: "START-REF",
      currencyCode: "PHP",
      label: "Reference",
      estimates: [
        {
          key: "estimate.base_scope",
          name: "Base Scope",
          sheetCode: "ES-001",
          tabName: "Main Estimate",
          nodes: [
            {
              key: "area.base_scope",
              parentKey: null,
              kind: "area",
              name: "Base Scope",
              rows: [
                {
                  key: "row.base_paint",
                  material: "Interior Paint Finish",
                  description: "Completed commercial refresh paint scope.",
                  designation: "Base",
                  discipline: "Finishes",
                  unit: "sqm",
                  quantity: 85,
                  unitCost: 385,
                  source: "worked",
                },
              ],
            },
          ],
        },
        {
          key: "estimate.value_option",
          name: "Value Option",
          sheetCode: "ES-002",
          tabName: "Main Estimate",
          nodes: [
            {
              key: "area.value_scope",
              parentKey: null,
              kind: "area",
              name: "Value Scope",
              rows: [
                {
                  key: "row.value_light",
                  material: "LED Downlight Point",
                  description: "Completed value-engineered lighting option.",
                  designation: "Value",
                  discipline: "Electrical",
                  unit: "point",
                  quantity: 18,
                  unitCost: 1650,
                  source: "worked",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      key: "project.sandbox",
      name: "Sandbox — Quick Estimate",
      projectCode: "START-SBX",
      currencyCode: "PHP",
      label: "Sandbox",
      estimates: [
        {
          key: "estimate.quick",
          name: "Quick Estimate",
          sheetCode: "ES-001",
          tabName: "Main Estimate",
          nodes: [
            {
              key: "area.quick",
              parentKey: null,
              kind: "area",
              name: "Quick Scope",
              rows: [
                {
                  key: "row.quick_worked",
                  material: "General Labor Allowance",
                  description: "Worked row ready for experimentation.",
                  designation: "Worked",
                  discipline: "General",
                  unit: "day",
                  quantity: 3,
                  unitCost: 2200,
                  source: "worked",
                },
                {
                  key: "row.quick_incomplete",
                  material: "Add your next item",
                  description: "Incomplete row for a quick first edit.",
                  designation: "Practice",
                  discipline: "",
                  unit: "unit",
                  quantity: 0,
                  unitCost: 0,
                  source: "practice",
                },
              ],
            },
          ],
        },
      ],
    },
  ] satisfies readonly StarterProjectDefinition[],
  components: [
    {
      key: "component.interior_paint_finish",
      name: "Interior Paint Finish",
      description: "Interior wall preparation and finish coating.",
      folderKey: "folder.finishes",
      unit: "sqm",
      variants: [
        { label: "Standard Acrylic", unit: "sqm", unitCost: 385, isDefault: true },
        { label: "Premium Washable", unit: "sqm", unitCost: 525, isDefault: false },
      ],
    },
    {
      key: "component.porcelain_floor_tile",
      name: "Porcelain Floor Tile",
      description: "Supply and install porcelain floor tile.",
      folderKey: "folder.finishes",
      unit: "sqm",
      variants: [{ label: "600 × 600 mm", unit: "sqm", unitCost: 1850, isDefault: true }],
    },
    {
      key: "component.gypsum_board_partition",
      name: "Gypsum Board Partition",
      description: "Metal stud partition with gypsum board finish.",
      folderKey: "folder.finishes",
      unit: "sqm",
      variants: [{ label: "Standard 100 mm", unit: "sqm", unitCost: 1450, isDefault: true }],
    },
    {
      key: "component.led_downlight_point",
      name: "LED Downlight Point",
      description: "Complete recessed LED downlight point.",
      folderKey: "folder.fixtures_services",
      unit: "point",
      variants: [{ label: "Warm White 9 W", unit: "point", unitCost: 1650, isDefault: true }],
    },
    {
      key: "component.plumbing_fixture_allowance",
      name: "Plumbing Fixture Allowance",
      description: "Allowance for a coordinated plumbing fixture set.",
      folderKey: "folder.fixtures_services",
      unit: "lot",
      variants: [{ label: "Basic Fixture Set", unit: "lot", unitCost: 48_000, isDefault: true }],
    },
    {
      key: "component.general_labor_allowance",
      name: "General Labor Allowance",
      description: "General site labor allowance.",
      folderKey: "protected.uncategorized",
      unit: "day",
      variants: [{ label: "Skilled Labor Day", unit: "day", unitCost: 2200, isDefault: true }],
    },
  ] satisfies readonly StarterComponentDefinition[],
  templates: [
    {
      key: "template.condo_fit_out",
      name: "Condo Fit-Out Starter",
      description: "A compact residential fit-out structure.",
      category: "Residential Rooms",
      sourceComponentKey: "component.interior_paint_finish",
      groupName: "Condo Fit-Out",
      areaName: "Living Area",
    },
    {
      key: "template.powder_room",
      name: "Powder Room Basic",
      description: "A focused powder-room scope.",
      category: "Residential Rooms",
      sourceComponentKey: "component.plumbing_fixture_allowance",
      groupName: "Powder Room",
      areaName: "Fixtures",
    },
    {
      key: "template.roof_deck_lounge",
      name: "Roof Deck Lounge",
      description: "A small exterior lounge scope.",
      category: "Exterior + Site",
      sourceComponentKey: "component.led_downlight_point",
      groupName: "Roof Deck",
      areaName: "Lounge",
    },
  ] satisfies readonly StarterTemplateDefinition[],
} as const;

export const STARTER_WORKSPACE_ASSET_KEYS = Object.freeze([
  ...STARTER_PACK_MANIFEST.projects.map((asset) => asset.key),
  ...STARTER_PACK_MANIFEST.folders.map((asset) => asset.key),
  ...STARTER_PACK_MANIFEST.components.map((asset) => asset.key),
  ...STARTER_PACK_MANIFEST.templates.map((asset) => asset.key),
]);

export const STARTER_USER_ASSET_KEYS = Object.freeze([
  "group.starter_examples",
  "membership.starter_examples.tutorial",
  "membership.starter_examples.reference",
] as const);

if (
  STARTER_PACK_MANIFEST.projects.length !== 3
  || STARTER_PACK_MANIFEST.projects.reduce((count, project) => count + project.estimates.length, 0) !== 4
  || STARTER_PACK_MANIFEST.components.length !== 6
  || STARTER_PACK_MANIFEST.templates.length !== 3
  || STARTER_PACK_MANIFEST.folders.length !== 2
) {
  throw new Error("The starter-pack manifest cardinality is invalid.");
}
