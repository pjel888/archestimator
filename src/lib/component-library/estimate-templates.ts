import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

export type EstimateTemplate = {
  id: string;
  workspaceId?: string;
  name: string;
  description: string;
  category: string;
  nodes: EstimateTreeNode[];
  /** Aggregate facts supplied by bounded list reads when `nodes` is not hydrated. */
  summary?: EstimateTemplateSummary;
  /** ISO timestamp of the last template write; optional because seed/fixture templates predate the column mapping. */
  updatedAt?: string;
  /** Stored sibling order within the workspace template list. */
  sortOrder?: number;
  currentVersionNumber?: number;
  archivedAt?: string | null;
  archivedBy?: string | null;
};

export type EstimateTemplateSummary = {
  groupCount: number;
  areaCount: number;
  rowCount: number;
  total: number;
};

type TemplateRowInput = Pick<
  EstimateRowItem,
  "id" | "material" | "description" | "supplier" | "unit" | "itemCost" | "quantity" | "miscCost" | "category" | "pricingSource" | "pricingDate"
> & {
  categoryNodeId?: string;
  contingencyPercentage?: number;
  adjustmentPercentage?: number;
  discipline?: string;
  designation?: string;
};

function templateRow(input: TemplateRowInput): EstimateRowItem {
  const subTotal = input.itemCost * input.quantity;
  const contingencyPercentage = 0;
  const contingencyValue = 0;
  const adjustmentPercentage = input.adjustmentPercentage ?? input.contingencyPercentage ?? 0;
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
  return {
    ...input,
    name: input.material,
    source: "library",
    price: input.itemCost,
    currency: "PHP",
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCostDefault: input.miscCost,
    totalItemCosts: subTotal + input.miscCost + contingencyValue + adjustmentValue,
  };
}

export const estimateTemplates: EstimateTemplate[] = [
  {
    id: "77770000-0000-4000-8000-000000000001",
    name: "Condo Fit-Out Starter",
    description: "Room-ready interior fit-out structure with living, kitchen, and primary bedroom allowance rows.",
    category: "Residential Rooms",
    nodes: [
      {
        id: "77771000-0000-4000-8000-000000000001",
        name: "Interior Fit-Out",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "77771000-0000-4000-8000-000000000002",
            name: "Living + Dining",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000001",
                material: "HEMLINGBY Loveseat",
                description: "Compact living-room loveseat allowance.",
                supplier: "IKEA Philippines",
                unit: "pc",
                itemCost: 7999,
                quantity: 1,
                miscCost: 1200,
                category: "Furniture",
                categoryNodeId: "furniture",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000002",
                material: "SANDSBERG Dining Table",
                description: "Compact dining-table benchmark.",
                supplier: "IKEA Philippines",
                unit: "pc",
                itemCost: 2999,
                quantity: 1,
                miscCost: 3700,
                category: "Tables",
                categoryNodeId: "furniture-tables",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000003",
                material: "IKEA Dining Chair",
                description: "Loose dining chair allowance.",
                supplier: "IKEA Philippines",
                unit: "pc",
                itemCost: 1990,
                quantity: 6,
                miscCost: 250,
                category: "Seating",
                categoryNodeId: "furniture-seating",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
          {
            id: "77771000-0000-4000-8000-000000000003",
            name: "Kitchen",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000004",
                material: "Franke Single Bowl Sink",
                description: "Stainless kitchen sink allowance.",
                supplier: "Wilcon Depot / Franke dealers",
                unit: "pc",
                itemCost: 9800,
                quantity: 1,
                miscCost: 900,
                category: "Kitchen Fixtures",
                categoryNodeId: "plumbing-kitchen-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000005",
                material: "IKEA Kitchen Mixer",
                description: "Single-lever kitchen faucet allowance.",
                supplier: "IKEA Philippines",
                unit: "pc",
                itemCost: 4999,
                quantity: 1,
                miscCost: 750,
                category: "Kitchen Fixtures",
                categoryNodeId: "plumbing-kitchen-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
        ],
      },
      {
        id: "77771000-0000-4000-8000-000000000004",
        name: "Private Rooms",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "77771000-0000-4000-8000-000000000005",
            name: "Primary Bedroom",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000006",
                material: "BRUKSVARA Bed Frame",
                description: "Queen bed-frame benchmark.",
                supplier: "IKEA Philippines",
                unit: "set",
                itemCost: 6999,
                quantity: 1,
                miscCost: 3300,
                category: "Beds",
                categoryNodeId: "furniture-beds",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000007",
                material: "IKEA Bedside Table",
                description: "Pair of bedside table allowances.",
                supplier: "IKEA Philippines",
                unit: "pc",
                itemCost: 2799,
                quantity: 2,
                miscCost: 250,
                category: "Tables",
                categoryNodeId: "furniture-tables",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000008",
                material: "KLEPPSTAD Wardrobe",
                description: "Bedroom wardrobe allowance.",
                supplier: "IKEA Philippines",
                unit: "set",
                itemCost: 8999,
                quantity: 1,
                miscCost: 2200,
                category: "Storage Systems",
                categoryNodeId: "casework-storage-systems",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "77770000-0000-4000-8000-000000000002",
    name: "Powder Room Basic",
    description: "Compact toilet and bath area template with vanity, faucet, floor drain, and wall finish rows.",
    category: "Residential Rooms",
    nodes: [
      {
        id: "77771000-0000-4000-8000-000000000006",
        name: "Powder Room",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "77771000-0000-4000-8000-000000000007",
            name: "Toilet + Bath",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000009",
                material: "Pozzi Vanity Cabinet Allowance",
                description: "Compact vanity with basin allowance.",
                supplier: "Wilcon Depot / Pozzi",
                unit: "set",
                itemCost: 32000,
                quantity: 1,
                miscCost: 7000,
                category: "Storage Systems",
                categoryNodeId: "casework-storage-systems",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000010",
                material: "GROHE Lavatory Faucet",
                description: "Lavatory faucet allowance.",
                supplier: "Wilcon Depot / GROHE dealers",
                unit: "pc",
                itemCost: 6200,
                quantity: 1,
                miscCost: 850,
                category: "Plumbing Fixtures",
                categoryNodeId: "plumbing-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000011",
                material: "Stainless Floor Drain",
                description: "Stainless bathroom floor drain allowance.",
                supplier: "Wilcon Depot",
                unit: "pc",
                itemCost: 1250,
                quantity: 1,
                miscCost: 250,
                category: "Plumbing Fixtures",
                categoryNodeId: "plumbing-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000012",
                material: "Porcelain Tile",
                description: "Wall or floor tile allowance.",
                supplier: "Tile supplier quote required",
                unit: "sqm",
                itemCost: 950,
                quantity: 14,
                miscCost: 300,
                category: "Tile Flooring",
                categoryNodeId: "floor-finishes-tile-flooring",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "77770000-0000-4000-8000-000000000003",
    name: "Roof Deck Lounge",
    description: "Exterior entertainment structure with lounge, bar counter, and toilet areas.",
    category: "Exterior + Site",
    nodes: [
      {
        id: "77771000-0000-4000-8000-000000000008",
        name: "Roof Deck",
        kind: "group",
        total: "PHP 0.00",
        children: [
          {
            id: "77771000-0000-4000-8000-000000000009",
            name: "Lounge",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000013",
                material: "Outdoor Lounge Set",
                description: "Weather-resistant outdoor lounge set allowance.",
                supplier: "Outdoor Living PH",
                unit: "set",
                itemCost: 76000,
                quantity: 1,
                miscCost: 4200,
                category: "Outdoor",
                categoryNodeId: "landscape-outdoor-furniture",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
          {
            id: "77771000-0000-4000-8000-000000000010",
            name: "Toilet",
            kind: "area",
            total: "PHP 0.00",
            estimateRowItems: [
              templateRow({
                id: "77772000-0000-4000-8000-000000000014",
                material: "HCG One-Piece WC",
                description: "One-piece water closet allowance.",
                supplier: "Wilcon Depot / HCG dealers",
                unit: "pc",
                itemCost: 14200,
                quantity: 1,
                miscCost: 1500,
                category: "Plumbing Fixtures",
                categoryNodeId: "plumbing-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
              templateRow({
                id: "77772000-0000-4000-8000-000000000015",
                material: "Stainless Floor Drain",
                description: "Stainless bathroom floor drain allowance.",
                supplier: "Wilcon Depot",
                unit: "pc",
                itemCost: 1250,
                quantity: 1,
                miscCost: 250,
                category: "Plumbing Fixtures",
                categoryNodeId: "plumbing-fixtures",
                pricingSource: "Template allowance",
                pricingDate: "2026-05-22",
              }),
            ],
          },
        ],
      },
    ],
  },
];

export function summarizeEstimateTemplate(template: EstimateTemplate): EstimateTemplateSummary {
  if (template.summary) return template.summary;
  const summary: EstimateTemplateSummary = {
    groupCount: 0,
    areaCount: 0,
    rowCount: 0,
    total: 0,
  };

  function visit(node: EstimateTreeNode) {
    if (node.kind === "group") summary.groupCount += 1;
    if (node.kind === "area") summary.areaCount += 1;
    for (const row of node.estimateRowItems ?? []) {
      summary.rowCount += 1;
      summary.total += row.totalItemCosts;
    }
    node.children?.forEach(visit);
  }

  template.nodes.forEach(visit);
  return summary;
}
