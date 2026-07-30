import {
  MAX_VAT_RATE_BPS,
  VAT_TREATMENTS,
  type CommercialTermsErrorCode,
  type CommercialTermsSource,
  type OptionalVatTermsPair,
  type ResolveCommercialTermsInput,
  type ResolveCommercialTermsFailure,
  type ResolveCommercialTermsResult,
  type ResolvedCommercialTerms,
  type VatTermsPair,
  type VatTreatment,
} from "./contracts";

type Candidate = {
  pair: OptionalVatTermsPair | null | undefined;
  source: CommercialTermsSource;
  selectedOptionId: string | null;
  selectedOptionTermsRevision: number | null;
};

function failure(
  code: CommercialTermsErrorCode,
  field: string,
  source?: CommercialTermsSource,
): ResolveCommercialTermsFailure {
  return { ok: false, code, field, ...(source ? { source } : {}) };
}

function isVatTreatment(value: unknown): value is VatTreatment {
  return VAT_TREATMENTS.includes(value as VatTreatment);
}

function validatePair(
  pair: OptionalVatTermsPair | null | undefined,
  source: CommercialTermsSource,
): { ok: true; value: VatTermsPair | null } | ResolveCommercialTermsFailure {
  const treatment = pair?.treatment;
  const rateBps = pair?.rateBps;
  const hasTreatment = treatment !== null && treatment !== undefined;
  const hasRate = rateBps !== null && rateBps !== undefined;

  if (!hasTreatment && !hasRate) return { ok: true, value: null };
  if (hasTreatment !== hasRate) return failure("incomplete_vat_pair", "vat_pair", source);
  if (!isVatTreatment(treatment)) return failure("invalid_vat_treatment", "treatment", source);
  if (
    typeof rateBps !== "number" ||
    !Number.isSafeInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > MAX_VAT_RATE_BPS
  ) {
    return failure("invalid_vat_rate", "rateBps", source);
  }
  if (treatment === "exempt" && rateBps !== 0) {
    return failure("invalid_vat_rate", "rateBps", source);
  }

  return { ok: true, value: { treatment, rateBps } };
}

function resolved(candidate: Candidate, pair: VatTermsPair): ResolvedCommercialTerms {
  return {
    ...pair,
    source: candidate.source,
    selectedOptionId: candidate.selectedOptionId,
    selectedOptionTermsRevision: candidate.selectedOptionTermsRevision,
  };
}

/** Resolves the first complete VAT pair without combining fields across levels. */
export function resolveCommercialTerms(
  input: ResolveCommercialTermsInput,
): ResolveCommercialTermsResult {
  const candidates: Candidate[] = [
    {
      pair: input.rowOverride,
      source: "row_override",
      selectedOptionId: null,
      selectedOptionTermsRevision: null,
    },
    {
      pair: input.capturedSelectedOption,
      source: "captured_selected_option",
      selectedOptionId: input.capturedSelectedOption?.selectedOptionId ?? null,
      selectedOptionTermsRevision:
        input.capturedSelectedOption?.selectedOptionTermsRevision ?? null,
    },
    {
      pair: input.estimateDefault,
      source: "estimate_default",
      selectedOptionId: null,
      selectedOptionTermsRevision: null,
    },
    {
      pair: input.projectDefault,
      source: "project_default",
      selectedOptionId: null,
      selectedOptionTermsRevision: null,
    },
  ];

  for (const candidate of candidates) {
    const pair = validatePair(candidate.pair, candidate.source);
    if (!pair.ok) return pair;
    if (!pair.value) continue;

    if (
      candidate.source === "captured_selected_option" &&
      (candidate.selectedOptionId === null ||
        candidate.selectedOptionId.trim() === "" ||
        typeof candidate.selectedOptionTermsRevision !== "number" ||
        !Number.isSafeInteger(candidate.selectedOptionTermsRevision) ||
        candidate.selectedOptionTermsRevision < 0)
    ) {
      return failure(
        "invalid_selected_option_snapshot",
        "capturedSelectedOption",
        candidate.source,
      );
    }

    return { ok: true, value: resolved(candidate, pair.value) };
  }

  return failure("missing_commercial_terms", "commercialTerms");
}
