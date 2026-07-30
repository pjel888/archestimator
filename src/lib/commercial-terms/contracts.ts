export const VAT_BASIS_POINTS_DENOMINATOR = 10_000;
export const MAX_VAT_RATE_BPS = 10_000;
export const COMMERCIAL_CALCULATION_VERSION = 1;

export const VAT_TREATMENTS = ["inclusive", "exclusive", "exempt"] as const;
export type VatTreatment = (typeof VAT_TREATMENTS)[number];

export const QUOTATION_REQUIREMENTS = ["not_required", "required"] as const;
type QuotationRequirement = (typeof QUOTATION_REQUIREMENTS)[number];

export const QUOTATION_STATUSES = [
  "not_requested",
  "requested",
  "available",
  "unavailable",
] as const;
type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export type QuotationFacts = {
  quotationRequirement: QuotationRequirement;
  quotationStatus: QuotationStatus;
  quotationReference: string | null;
};

export type CommercialTermsSource =
  | "row_override"
  | "captured_selected_option"
  | "estimate_default"
  | "project_default";

export type VatTermsPair = {
  treatment: VatTreatment;
  rateBps: number;
};

/** A persistence-shaped pair. Both fields must be present or both absent. */
export type OptionalVatTermsPair = {
  treatment?: VatTreatment | null;
  rateBps?: number | null;
};

type CapturedSelectedOptionTerms = OptionalVatTermsPair & {
  selectedOptionId: string;
  selectedOptionTermsRevision: number;
};

export type ResolveCommercialTermsInput = {
  rowOverride?: OptionalVatTermsPair | null;
  capturedSelectedOption?: CapturedSelectedOptionTerms | null;
  estimateDefault?: OptionalVatTermsPair | null;
  projectDefault?: OptionalVatTermsPair | null;
};

export type ResolvedCommercialTerms = VatTermsPair & {
  source: CommercialTermsSource;
  selectedOptionId: string | null;
  selectedOptionTermsRevision: number | null;
};

export type CommercialTermsErrorCode =
  | "incomplete_vat_pair"
  | "invalid_vat_treatment"
  | "invalid_vat_rate"
  | "invalid_selected_option_snapshot"
  | "missing_commercial_terms";

export type CommercialCalculationErrorCode =
  | "invalid_amount"
  | "unsupported_currency"
  | "invalid_currency_scale"
  | "amount_out_of_range"
  | "invalid_vat_treatment"
  | "invalid_vat_rate";

type CommercialDomainFailure<Code extends string> = {
  ok: false;
  code: Code;
  field: string;
  source?: CommercialTermsSource;
};

type CommercialDomainResult<T, Code extends string> =
  | { ok: true; value: T }
  | CommercialDomainFailure<Code>;

export type ResolveCommercialTermsResult = CommercialDomainResult<
  ResolvedCommercialTerms,
  CommercialTermsErrorCode
>;
export type ResolveCommercialTermsFailure = CommercialDomainFailure<CommercialTermsErrorCode>;

export type CalculateVatInput = {
  enteredMinorUnits: number;
  currencyCode: string;
  currencyScale: number;
  terms: VatTermsPair;
};

export type VatCalculation = VatTermsPair & {
  calculationVersion: typeof COMMERCIAL_CALCULATION_VERSION;
  currencyCode: string;
  currencyScale: number;
  enteredMinorUnits: number;
  preVatMinorUnits: number;
  vatMinorUnits: number;
  vatExemptMinorUnits: number;
  grandTotalMinorUnits: number;
};

export type CalculateVatResult = CommercialDomainResult<
  VatCalculation,
  CommercialCalculationErrorCode
>;
export type CalculateVatFailure = CommercialDomainFailure<CommercialCalculationErrorCode>;
