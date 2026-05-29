export type Variant = "A" | "B";

export interface Experiment {
  id: string;
  variants: Variant[];
}

export interface ExperimentResult {
  variantA: { views: number; conversions: number; rate: number };
  variantB: { views: number; conversions: number; rate: number };
  uplift: number; // percentage
  pValue: number;
  significant: boolean; // p < 0.05
  recommendation: "A" | "B" | "inconclusive";
}
