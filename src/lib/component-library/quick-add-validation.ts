export const QUICK_ADD_TEXT_LIMITS = {
  name: 120,
  category: 120,
  unit: 32,
  supplier: 120,
  brand: 120,
  pricingSource: 2048,
  confidence: 120,
} as const;

export type QuickAddField =
  | "name"
  | "category"
  | "unit"
  | "unitCost"
  | "miscCost"
  | "supplier"
  | "brand"
  | "pricingDate"
  | "pricingSource"
  | "confidence";

export type QuickAddComponentValidationInput = {
  name: unknown;
  category: unknown;
  unit: unknown;
  unitCost: unknown;
  miscCost?: unknown;
  supplier?: unknown;
  brand?: unknown;
  pricingDate?: unknown;
  pricingSource?: unknown;
  confidence?: unknown;
  libraryFolderId?: string | null;
};

export type NormalizedQuickAddComponentInput = {
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  supplier: string | null;
  brand: string | null;
  pricingDate: string | null;
  pricingSource: string | null;
  confidence: string | null;
  libraryFolderId: string | null;
};

export type QuickAddValidationResult = {
  errors: Partial<Record<QuickAddField, string>>;
  normalized: Partial<NormalizedQuickAddComponentInput>;
};

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/g;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SPREADSHEET_FORMULA_PREFIX_PATTERN = /^[=+\-@]/;
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const URL_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

export function stripComponentControlCharacters(value: string) {
  return value.replace(CONTROL_CHARACTER_PATTERN, "");
}

export function normalizeQuickAddText(value: unknown) {
  return stripComponentControlCharacters(String(value ?? "")).trim();
}

function addTextLengthError(
  errors: Partial<Record<QuickAddField, string>>,
  field: QuickAddField,
  value: string,
  limit: number,
  message: string,
) {
  if (value.length > limit) errors[field] = message;
}

function addFormulaPrefixError(
  errors: Partial<Record<QuickAddField, string>>,
  field: QuickAddField,
  value: string,
  message: string,
) {
  if (value && SPREADSHEET_FORMULA_PREFIX_PATTERN.test(value)) errors[field] = message;
}

export function parseQuickAddMoney(value: unknown) {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "").replace(/[₱,\s]/g, "").trim();
  if (!normalized) return NaN;
  return Number(normalized);
}

export function roundQuickAddMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeDateOnly(value: unknown) {
  const date = normalizeQuickAddText(value);
  return date || null;
}

export function isValidDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isFutureDateOnly(value: string, today = new Date().toISOString().slice(0, 10)) {
  return value > today;
}

export function isInvalidPricingSource(value: string) {
  if (!value) return false;
  if (!URL_SCHEME_PATTERN.test(value) && !URL_LIKE_PATTERN.test(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol !== "http:" && url.protocol !== "https:";
  } catch {
    return true;
  }
}

export function validateQuickAddComponentInput(
  input: QuickAddComponentValidationInput,
  options: { today?: string } = {},
): QuickAddValidationResult {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const errors: Partial<Record<QuickAddField, string>> = {};

  const name = normalizeQuickAddText(input.name);
  const category = normalizeQuickAddText(input.category);
  const unit = normalizeQuickAddText(input.unit);
  const supplier = normalizeQuickAddText(input.supplier);
  const brand = normalizeQuickAddText(input.brand);
  const pricingDate = normalizeDateOnly(input.pricingDate);
  const pricingSource = normalizeQuickAddText(input.pricingSource);
  const confidence = normalizeQuickAddText(input.confidence);
  const unitCost = parseQuickAddMoney(input.unitCost);
  const miscCost = input.miscCost === undefined || normalizeQuickAddText(input.miscCost) === ""
    ? 0
    : parseQuickAddMoney(input.miscCost);

  if (!name) errors.name = "Enter a component name.";
  if (!category) errors.category = "Choose or enter a category.";
  if (!unit) errors.unit = "Enter a unit (e.g. each, m2, hr).";

  addTextLengthError(errors, "name", name, QUICK_ADD_TEXT_LIMITS.name, "Use 120 characters or fewer for the name.");
  addTextLengthError(errors, "category", category, QUICK_ADD_TEXT_LIMITS.category, "Use 120 characters or fewer for the category.");
  addTextLengthError(errors, "unit", unit, QUICK_ADD_TEXT_LIMITS.unit, "Use 32 characters or fewer for the unit.");
  addTextLengthError(errors, "supplier", supplier, QUICK_ADD_TEXT_LIMITS.supplier, "Use 120 characters or fewer.");
  addTextLengthError(errors, "brand", brand, QUICK_ADD_TEXT_LIMITS.brand, "Use 120 characters or fewer.");
  addTextLengthError(errors, "confidence", confidence, QUICK_ADD_TEXT_LIMITS.confidence, "Use 120 characters or fewer for the confidence note.");

  addFormulaPrefixError(errors, "name", name, "Remove spreadsheet formula prefixes from the name.");
  addFormulaPrefixError(errors, "category", category, "Remove spreadsheet formula prefixes from the category.");
  addFormulaPrefixError(errors, "unit", unit, "Remove spreadsheet formula prefixes from the unit.");
  addFormulaPrefixError(errors, "supplier", supplier, "Remove spreadsheet formula prefixes.");
  addFormulaPrefixError(errors, "brand", brand, "Remove spreadsheet formula prefixes.");
  addFormulaPrefixError(errors, "pricingSource", pricingSource, "Remove spreadsheet formula prefixes from the pricing source.");
  addFormulaPrefixError(errors, "confidence", confidence, "Remove spreadsheet formula prefixes from the confidence note.");

  if (normalizeQuickAddText(input.unitCost) === "") {
    errors.unitCost = "Enter a unit cost.";
  } else if (!Number.isFinite(unitCost)) {
    errors.unitCost = "Enter a number for unit cost.";
  } else if (unitCost < 0) {
    errors.unitCost = "Enter a unit cost of zero or more.";
  }

  if (!Number.isFinite(miscCost)) {
    errors.miscCost = "Enter a number for misc cost.";
  } else if (miscCost < 0) {
    errors.miscCost = "Enter a misc cost of zero or more.";
  }

  if (pricingDate) {
    if (!isValidDateOnly(pricingDate)) {
      errors.pricingDate = "Enter a valid date.";
    } else if (isFutureDateOnly(pricingDate, today)) {
      errors.pricingDate = "Enter a pricing date that is not in the future.";
    }
  }

  if (pricingSource.length > QUICK_ADD_TEXT_LIMITS.pricingSource) {
    errors.pricingSource = "Shorten this URL.";
  } else if (isInvalidPricingSource(pricingSource)) {
    errors.pricingSource = "Enter a valid https URL.";
  }

  return {
    errors,
    normalized: {
      name,
      category,
      unit,
      unitCost: Number.isFinite(unitCost) ? roundQuickAddMoney(unitCost) : undefined,
      miscCost: Number.isFinite(miscCost) ? roundQuickAddMoney(miscCost) : undefined,
      supplier: supplier || null,
      brand: brand || null,
      pricingDate,
      pricingSource: pricingSource || null,
      confidence: confidence || null,
      libraryFolderId: input.libraryFolderId ?? null,
    },
  };
}

export function assertQuickAddComponentInput(
  input: QuickAddComponentValidationInput,
  options: { today?: string } = {},
): NormalizedQuickAddComponentInput {
  const result = validateQuickAddComponentInput(input, options);
  const firstError = Object.values(result.errors)[0];
  if (firstError) throw new Error(firstError);
  return result.normalized as NormalizedQuickAddComponentInput;
}
