import "server-only";

export const STARTER_PACK_VERSION = 2;
export const GUIDED_SAMPLE_VERSION = 2;
export const GUIDED_SAMPLE_KIND = "estimate_sheet_foundations";
export const GUIDED_SAMPLE_PROJECT_NAME = "Practice - Casa Amihan Residence";
export const STARTER_EXAMPLES_GROUP_NAME = "Starter Examples";

export const STARTER_REFERENCE_SOURCES = {
  bir_vat: {
    label: "BIR Value-Added Tax guidance",
    url: "https://www.bir.gov.ph/value-addedtax",
  },
  dpwh_blue_book: {
    label: "DPWH Standard Specifications reference",
    url: "https://www.dpwh.gov.ph/dpwh/sites/default/files/webform/civil_works/bid_bulletin/pbd-revised_final.pdf",
  },
  nwpc_ncr: {
    label: "NWPC National Capital Region wage orders",
    url: "https://nwpc.dole.gov.ph/ncr/",
  },
  nwpc_region_iva: {
    label: "NWPC Region IV-A wage orders",
    url: "https://nwpc.dole.gov.ph/region-iva/",
  },
  nwpc_region_vii: {
    label: "NWPC Region VII wage orders",
    url: "https://nwpc.dole.gov.ph/region-vii/",
  },
  psa_cmrpi: {
    label: "PSA Construction Materials Retail Price Index",
    url: "https://psa.gov.ph/price-indices/cmrpi",
  },
} as const;

type StarterReferenceId = keyof typeof STARTER_REFERENCE_SOURCES;

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
  clientName: string;
  location: string;
  projectType: string;
  floorAreaSqm: number;
  region: "NCR" | "Region IV-A" | "Region VII";
  pricingAsOf: string;
  referenceIds: readonly [StarterReferenceId, ...StarterReferenceId[]];
  sourceDisclaimer: string;
  taxBasis: "EX_VAT";
  vatRate: 0.12;
  estimates: readonly StarterEstimateDefinition[];
};

export type StarterComponentDefinition = {
  key: string;
  name: string;
  description: string;
  folderKey: "folder.finishes" | "folder.fixtures_services" | "protected.uncategorized";
  unit: string;
  brand: string | null;
  region: "NCR" | "Region IV-A" | "Region VII" | "Philippines";
  pricingAsOf: string;
  expiresOn: string;
  referenceIds: readonly [StarterReferenceId, ...StarterReferenceId[]];
  taxBasis: "EX_VAT";
  vatRate: 0.12;
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
  sourceComponentKeys: readonly string[];
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
        {
          key: "row.casa_preliminaries",
          material: "Mobilization and Construction Safety",
          description: "Fictional allowance for temporary facilities, PPE, supervision, and turnover.",
          designation: "Preliminaries",
          discipline: "General",
          unit: "lot",
          quantity: 1,
          unitCost: 95_000,
          source: "worked",
        },
        {
          key: "row.casa_rc_repairs",
          material: "Reinforced Concrete Minor Works",
          description: "Illustrative concrete, formwork, reinforcement, labor, and equipment assembly.",
          designation: "Structural",
          discipline: "Structural",
          unit: "m3",
          quantity: 8,
          unitCost: 14_800,
          source: "worked",
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
        {
          key: "row.casa_kitchen_joinery",
          material: "Kitchen Base and Wall Cabinets",
          description: "Illustrative laminated joinery assembly; verify shop drawings and hardware quotation.",
          designation: "Joinery",
          discipline: "Architectural",
          unit: "lm",
          quantity: 8,
          unitCost: 12_500,
          source: "worked",
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
        {
          key: "row.casa_agila_pipe",
          material: "AgilaPipe Water and Sanitary Rough-In",
          description: "Fictional plumbing brand teaching assembly; obtain approved product and installer quotations.",
          designation: "Rough-in",
          discipline: "Plumbing",
          unit: "fixture",
          quantity: 9,
          unitCost: 5_200,
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
      name: "Casa Amihan - Guided Rizal Residence",
      projectCode: "PH-DEMO-CA",
      currencyCode: "PHP",
      label: "Tutorial",
      clientName: "Amihan Family (Fictional)",
      location: "Fictional Antipolo site, Rizal",
      projectType: "160 sqm two-storey residence",
      floorAreaSqm: 160,
      region: "Region IV-A",
      pricingAsOf: "2026-07-26",
      referenceIds: ["dpwh_blue_book", "psa_cmrpi", "nwpc_region_iva", "bir_vat"],
      sourceDisclaimer: "DEMO_ILLUSTRATIVE - not a supplier quotation or construction advice.",
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      estimates: [GUIDED_ESTIMATE_BLUEPRINT],
    },
    {
      key: "project.reference",
      name: "Habi Studio - Quezon City Fit-Out",
      projectCode: "PH-DEMO-HS",
      currencyCode: "PHP",
      label: "Reference",
      clientName: "Habi Studio Collective (Fictional)",
      location: "Fictional Quezon City tenancy, NCR",
      projectType: "82 sqm commercial tenant fit-out",
      floorAreaSqm: 82,
      region: "NCR",
      pricingAsOf: "2026-07-26",
      referenceIds: ["dpwh_blue_book", "psa_cmrpi", "nwpc_ncr", "bir_vat"],
      sourceDisclaimer: "DEMO_ILLUSTRATIVE - ex-VAT teaching rates; obtain current trade quotations.",
      taxBasis: "EX_VAT",
      vatRate: 0.12,
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
                {
                  key: "row.habi_preliminaries",
                  material: "Fit-Out Protection and Safety",
                  description: "Site protection, temporary signs, coordination, PPE, cleaning, and handover allowance.",
                  designation: "Preliminaries",
                  discipline: "General",
                  unit: "lot",
                  quantity: 1,
                  unitCost: 45_000,
                  source: "worked",
                },
                {
                  key: "row.habi_partition",
                  material: "Metal Stud Gypsum Partition",
                  description: "105 sqm fictional fit-out partition quantity including board, framing, and labor.",
                  designation: "Partition",
                  discipline: "Architectural",
                  unit: "sqm",
                  quantity: 105,
                  unitCost: 1_450,
                  source: "worked",
                },
                {
                  key: "row.habi_flooring",
                  material: "LuntianTile Floor Finish",
                  description: "Fictional tile brand teaching rate including adhesive, grout, trims, and installation.",
                  designation: "Floor finish",
                  discipline: "Finishes",
                  unit: "sqm",
                  quantity: 82,
                  unitCost: 1_850,
                  source: "worked",
                },
                {
                  key: "row.habi_joinery",
                  material: "Reception and Display Joinery",
                  description: "Illustrative laminated joinery assembly with hardware allowance.",
                  designation: "Joinery",
                  discipline: "Architectural",
                  unit: "lm",
                  quantity: 12,
                  unitCost: 9_500,
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
                {
                  key: "row.habi_power_data",
                  material: "KislapWire Power and Data Point",
                  description: "Fictional electrical brand teaching rate for coordinated outlet and data points.",
                  designation: "Power and data",
                  discipline: "Electrical",
                  unit: "point",
                  quantity: 48,
                  unitCost: 1_250,
                  source: "worked",
                },
                {
                  key: "row.habi_ac",
                  material: "Inverter Split AC Allowance",
                  description: "Illustrative supply, piping, drain, controls, testing, and installation allowance.",
                  designation: "Mechanical",
                  discipline: "Mechanical",
                  unit: "set",
                  quantity: 3,
                  unitCost: 58_000,
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
      name: "Silaw Learning Pavilion - Cebu",
      projectCode: "PH-DEMO-SP",
      currencyCode: "PHP",
      label: "Sandbox",
      clientName: "Silaw Learning Cooperative (Fictional)",
      location: "Fictional Cebu City barangay site, Region VII",
      projectType: "216 sqm community learning pavilion",
      floorAreaSqm: 216,
      region: "Region VII",
      pricingAsOf: "2026-07-26",
      referenceIds: ["dpwh_blue_book", "psa_cmrpi", "nwpc_region_vii", "bir_vat"],
      sourceDisclaimer: "DEMO_ILLUSTRATIVE - quantities and rates require professional review.",
      taxBasis: "EX_VAT",
      vatRate: 0.12,
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
                  key: "row.silaw_safety",
                  material: "Mobilization and CSHP Allowance",
                  description: "Fictional mobilization, construction safety, temporary works, and turnover allowance.",
                  designation: "Preliminaries",
                  discipline: "General",
                  unit: "lot",
                  quantity: 1,
                  unitCost: 85_000,
                  source: "worked",
                },
                {
                  key: "row.silaw_concrete",
                  material: "Reinforced Concrete Frame and Slab",
                  description: "Illustrative 21 MPa concrete assembly excluding final engineering design.",
                  designation: "Concrete",
                  discipline: "Structural",
                  unit: "m3",
                  quantity: 68,
                  unitCost: 14_800,
                  source: "worked",
                },
                {
                  key: "row.silaw_rebar",
                  material: "SikatSteel Reinforcing Bars",
                  description: "Fictional steel brand teaching rate including tie wire, cutting, bending, and placement.",
                  designation: "Reinforcement",
                  discipline: "Structural",
                  unit: "kg",
                  quantity: 6_300,
                  unitCost: 78,
                  source: "worked",
                },
                {
                  key: "row.silaw_wall",
                  material: "100 mm CHB Wall and Plaster",
                  description: "Illustrative blockwork, reinforcement, mortar, plaster, labor, and access assembly.",
                  designation: "Masonry",
                  discipline: "Architectural",
                  unit: "sqm",
                  quantity: 420,
                  unitCost: 2_150,
                  source: "worked",
                },
                {
                  key: "row.silaw_roof",
                  material: "Steel Roof and Long-Span Sheets",
                  description: "Illustrative fabricated framing, roofing, insulation, gutters, labor, and access.",
                  designation: "Roofing",
                  discipline: "Structural",
                  unit: "sqm",
                  quantity: 285,
                  unitCost: 2_450,
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
      brand: "Boyson",
      region: "Philippines",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-09-24",
      referenceIds: ["psa_cmrpi", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
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
      brand: "LuntianTile",
      region: "Philippines",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-09-24",
      referenceIds: ["psa_cmrpi", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      variants: [{ label: "600 × 600 mm", unit: "sqm", unitCost: 1850, isDefault: true }],
    },
    {
      key: "component.gypsum_board_partition",
      name: "Gypsum Board Partition",
      description: "Metal stud partition with gypsum board finish.",
      folderKey: "folder.finishes",
      unit: "sqm",
      brand: null,
      region: "NCR",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-09-24",
      referenceIds: ["psa_cmrpi", "nwpc_ncr", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      variants: [{ label: "Standard 100 mm", unit: "sqm", unitCost: 1450, isDefault: true }],
    },
    {
      key: "component.led_downlight_point",
      name: "LED Downlight Point",
      description: "Complete recessed LED downlight point.",
      folderKey: "folder.fixtures_services",
      unit: "point",
      brand: "KislapWire",
      region: "NCR",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-09-24",
      referenceIds: ["psa_cmrpi", "nwpc_ncr", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      variants: [{ label: "Warm White 9 W", unit: "point", unitCost: 1650, isDefault: true }],
    },
    {
      key: "component.plumbing_fixture_allowance",
      name: "Plumbing Fixture Allowance",
      description: "Allowance for a coordinated plumbing fixture set.",
      folderKey: "folder.fixtures_services",
      unit: "lot",
      brand: "AgilaPipe",
      region: "Region IV-A",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-09-24",
      referenceIds: ["psa_cmrpi", "nwpc_region_iva", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      variants: [{ label: "Basic Fixture Set", unit: "lot", unitCost: 48_000, isDefault: true }],
    },
    {
      key: "component.general_labor_allowance",
      name: "General Labor Allowance",
      description: "General site labor allowance.",
      folderKey: "protected.uncategorized",
      unit: "day",
      brand: null,
      region: "Philippines",
      pricingAsOf: "2026-07-26",
      expiresOn: "2026-08-25",
      referenceIds: ["psa_cmrpi", "dpwh_blue_book", "bir_vat"],
      taxBasis: "EX_VAT",
      vatRate: 0.12,
      variants: [{ label: "Skilled Labor Day", unit: "day", unitCost: 2200, isDefault: true }],
    },
  ] satisfies readonly StarterComponentDefinition[],
  templates: [
    {
      key: "template.condo_fit_out",
      name: "Condo Fit-Out Starter",
      description: "A compact residential fit-out structure.",
      category: "Residential Rooms",
      sourceComponentKeys: [
        "component.interior_paint_finish",
        "component.porcelain_floor_tile",
        "component.led_downlight_point",
      ],
      groupName: "Condo Fit-Out",
      areaName: "Living Area",
    },
    {
      key: "template.powder_room",
      name: "Powder Room Basic",
      description: "A focused powder-room scope.",
      category: "Residential Rooms",
      sourceComponentKeys: [
        "component.plumbing_fixture_allowance",
        "component.porcelain_floor_tile",
        "component.interior_paint_finish",
      ],
      groupName: "Powder Room",
      areaName: "Fixtures",
    },
    {
      key: "template.roof_deck_lounge",
      name: "Roof Deck Lounge",
      description: "A small exterior lounge scope.",
      category: "Exterior + Site",
      sourceComponentKeys: [
        "component.led_downlight_point",
        "component.interior_paint_finish",
        "component.general_labor_allowance",
      ],
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
