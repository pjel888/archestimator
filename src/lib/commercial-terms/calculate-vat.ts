import {
  COMMERCIAL_CALCULATION_VERSION,
  MAX_VAT_RATE_BPS,
  VAT_BASIS_POINTS_DENOMINATOR,
  VAT_TREATMENTS,
  type CalculateVatInput,
  type CalculateVatFailure,
  type CalculateVatResult,
  type CommercialCalculationErrorCode,
  type VatCalculation,
  type VatTreatment,
} from "./contracts";

const SUPPORTED_CURRENCIES = new Set([
  "AUD",
  "CAD",
  "EUR",
  "GBP",
  "HKD",
  "NZD",
  "PHP",
  "SGD",
  "USD",
]);
const SUPPORTED_CURRENCY_SCALES = new Set([0, 2, 3]);
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

function failure(
  code: CommercialCalculationErrorCode,
  field: string,
): CalculateVatFailure {
  return { ok: false, code, field };
}

function isVatTreatment(value: unknown): value is VatTreatment {
  return VAT_TREATMENTS.includes(value as VatTreatment);
}

function fromCheckedBigInt(value: bigint, field: string): CalculateVatFailure | number {
  if (value > MAX_SAFE_BIGINT || value < MIN_SAFE_BIGINT) {
    return failure("amount_out_of_range", field);
  }
  return Number(value);
}

function checkedMultiply(left: number, right: number, field: string): CalculateVatFailure | number {
  return fromCheckedBigInt(BigInt(left) * BigInt(right), field);
}

function checkedAdd(left: number, right: number, field: string): CalculateVatFailure | number {
  return fromCheckedBigInt(BigInt(left) + BigInt(right), field);
}

function checkedSubtract(left: number, right: number, field: string): CalculateVatFailure | number {
  return fromCheckedBigInt(BigInt(left) - BigInt(right), field);
}

/** Nearest integer division with exact-half ties away from zero. */
function roundDiv(numerator: number, denominator: number, field: string): CalculateVatFailure | number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    return failure("amount_out_of_range", field);
  }

  const signedNumerator = BigInt(numerator);
  const divisor = BigInt(denominator);
  const zero = BigInt(0);
  const one = BigInt(1);
  const sign = signedNumerator < zero ? -one : one;
  const absoluteNumerator = signedNumerator < zero ? -signedNumerator : signedNumerator;
  const quotient = absoluteNumerator / divisor;
  const remainder = absoluteNumerator % divisor;
  const rounded = (remainder * BigInt(2) >= divisor ? quotient + one : quotient) * sign;
  return fromCheckedBigInt(rounded, field);
}

function success(
  input: CalculateVatInput,
  currencyCode: string,
  preVatMinorUnits: number,
  vatMinorUnits: number,
  vatExemptMinorUnits: number,
  grandTotalMinorUnits: number,
): CalculateVatResult {
  const value: VatCalculation = {
    calculationVersion: COMMERCIAL_CALCULATION_VERSION,
    currencyCode,
    currencyScale: input.currencyScale,
    treatment: input.terms.treatment,
    rateBps: input.terms.rateBps,
    enteredMinorUnits: input.enteredMinorUnits,
    preVatMinorUnits,
    vatMinorUnits,
    vatExemptMinorUnits,
    grandTotalMinorUnits,
  };
  return { ok: true, value };
}

/** Calculates one row's VAT entirely in safe integer minor units. */
export function calculateVat(input: CalculateVatInput): CalculateVatResult {
  if (!Number.isSafeInteger(input.enteredMinorUnits) || input.enteredMinorUnits < 0) {
    return failure("invalid_amount", "enteredMinorUnits");
  }

  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currencyCode)) {
    return failure("unsupported_currency", "currencyCode");
  }
  if (!Number.isSafeInteger(input.currencyScale) || !SUPPORTED_CURRENCY_SCALES.has(input.currencyScale)) {
    return failure("invalid_currency_scale", "currencyScale");
  }
  if (!isVatTreatment(input.terms.treatment)) {
    return failure("invalid_vat_treatment", "treatment");
  }
  if (
    !Number.isSafeInteger(input.terms.rateBps) ||
    input.terms.rateBps < 0 ||
    input.terms.rateBps > MAX_VAT_RATE_BPS ||
    (input.terms.treatment === "exempt" && input.terms.rateBps !== 0)
  ) {
    return failure("invalid_vat_rate", "rateBps");
  }

  if (input.terms.treatment === "exempt") {
    return success(
      input,
      currencyCode,
      input.enteredMinorUnits,
      0,
      input.enteredMinorUnits,
      input.enteredMinorUnits,
    );
  }

  if (input.terms.treatment === "exclusive") {
    const numerator = checkedMultiply(input.enteredMinorUnits, input.terms.rateBps, "vatMinorUnits");
    if (typeof numerator !== "number") return numerator;
    const vatMinorUnits = roundDiv(numerator, VAT_BASIS_POINTS_DENOMINATOR, "vatMinorUnits");
    if (typeof vatMinorUnits !== "number") return vatMinorUnits;
    const grandTotalMinorUnits = checkedAdd(input.enteredMinorUnits, vatMinorUnits, "grandTotalMinorUnits");
    if (typeof grandTotalMinorUnits !== "number") return grandTotalMinorUnits;
    return success(input, currencyCode, input.enteredMinorUnits, vatMinorUnits, 0, grandTotalMinorUnits);
  }

  const numerator = checkedMultiply(
    input.enteredMinorUnits,
    VAT_BASIS_POINTS_DENOMINATOR,
    "preVatMinorUnits",
  );
  if (typeof numerator !== "number") return numerator;
  const preVatMinorUnits = roundDiv(
    numerator,
    VAT_BASIS_POINTS_DENOMINATOR + input.terms.rateBps,
    "preVatMinorUnits",
  );
  if (typeof preVatMinorUnits !== "number") return preVatMinorUnits;
  const vatMinorUnits = checkedSubtract(input.enteredMinorUnits, preVatMinorUnits, "vatMinorUnits");
  if (typeof vatMinorUnits !== "number") return vatMinorUnits;
  return success(input, currencyCode, preVatMinorUnits, vatMinorUnits, 0, input.enteredMinorUnits);
}
