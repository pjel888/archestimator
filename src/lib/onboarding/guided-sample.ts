import type { EstimateRowItem } from "@/lib/estimates/types";

export const GUIDED_SAMPLE_VERSION = 1;
export const GUIDED_SAMPLE_PROJECT_NAME = "Guided Sample — First Project";
export const GUIDED_SAMPLE_ESTIMATE_NAME = "Guided Sample Estimate";
export const GUIDED_SAMPLE_AREA_NAME = "Guided Sample Area";
export const GUIDED_SAMPLE_ROW_MATERIAL = "Guided Sample Finish Allowance";

export const GUIDED_SAMPLE_ROW: EstimateRowItem = {
  id: "guided-sample-row",
  material: GUIDED_SAMPLE_ROW_MATERIAL,
  description: "Demo finish allowance for exploring an editable first estimate.",
  supplier: "Guided sample",
  source: "project",
  unit: "sqm",
  itemCost: 1250,
  quantity: 24,
  quantityBase: null,
  quantityContingencyAmount: null,
  subTotal: 30_000,
  contingencyPercentage: 0,
  adjustmentPercentage: 0,
  miscCost: 0,
  totalItemCosts: 30_000,
  category: "Guided sample",
  designation: "Demo allowance",
  pricingSource: "Archestimator guided sample v1",
  pricingDate: "2026-07-12",
  metadata: {
    activationSampleVersion: GUIDED_SAMPLE_VERSION,
  },
};
