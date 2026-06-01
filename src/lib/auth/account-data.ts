import type { Json } from "@/lib/supabase/types";

type Option<Value extends string> = {
  value: Value;
  label: string;
};

type AccountSecurityMetadata = Record<string, Json>;

const SECRET_METADATA_KEY_PATTERN =
  /(^code$)|callback_code|auth_code|(^otp$)|token|magic|secret|cookie|session|raw_provider|provider_payload/i;

export const USER_CATEGORY_OPTIONS = [
  { value: "architect", label: "Architect" },
  { value: "contractor", label: "Contractor" },
  { value: "engineer", label: "Engineer" },
  { value: "quantity_surveyor", label: "Quantity surveyor" },
  { value: "owner_developer", label: "Owner / developer" },
  { value: "student_educator", label: "Student / educator" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option<string>[];

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: "architecture_design", label: "Architecture / design" },
  { value: "construction_contractor", label: "Construction contractor" },
  { value: "engineering_consultancy", label: "Engineering consultancy" },
  { value: "quantity_surveying", label: "Quantity surveying" },
  { value: "owner_developer", label: "Owner / developer" },
  { value: "education", label: "Education" },
  { value: "solo_practice", label: "Solo practice" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option<string>[];

export const PRIMARY_USE_OPTIONS = [
  { value: "project_estimating", label: "Project estimating" },
  { value: "cost_library", label: "Cost library" },
  { value: "proposal_packages", label: "Proposal packages" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option<string>[];

export const COMPANY_SIZE_OPTIONS = [
  { value: "solo", label: "Solo" },
  { value: "2_10", label: "2-10" },
  { value: "11_50", label: "11-50" },
  { value: "51_200", label: "51-200" },
  { value: "201_plus", label: "201+" },
] as const satisfies readonly Option<string>[];

export type UserCategory = (typeof USER_CATEGORY_OPTIONS)[number]["value"];
export type OrganizationType = (typeof ORGANIZATION_TYPE_OPTIONS)[number]["value"];
export type PrimaryUse = (typeof PRIMARY_USE_OPTIONS)[number]["value"];
export type CompanySize = (typeof COMPANY_SIZE_OPTIONS)[number]["value"];
export type WorkspaceAccountRole = "owner" | "admin" | "member" | "viewer";

export type ProfileSettingsPayload = {
  display_name: string;
  user_category: UserCategory;
  country_region: string;
  primary_use: PrimaryUse | null;
  student_educator_detail: string | null;
  marketing_consent_at: string | null;
};

export type WorkspaceSettingsPayload = {
  organization_name: string;
  organization_type: OrganizationType;
  country_region: string;
  company_size: CompanySize | null;
  default_currency: string;
  primary_use: PrimaryUse | null;
};

type FieldErrors = Record<string, string>;

type ParseResult<Key extends string, Value> =
  | ({ ok: true } & Record<Key, Value>)
  | { ok: false; fieldErrors: FieldErrors };

type OnboardingParseResult =
  | {
      ok: true;
      profile: ProfileSettingsPayload;
      workspace: WorkspaceSettingsPayload | null;
    }
  | { ok: false; fieldErrors: FieldErrors };

type ParseOptions = {
  prefix?: string;
};

export const ACCOUNT_DISPLAY_NAME_MAX_LENGTH = 120;
export const ACCOUNT_REGION_MAX_LENGTH = 80;
export const ACCOUNT_STUDENT_DETAIL_MAX_LENGTH = 160;
export const ACCOUNT_ORGANIZATION_NAME_MAX_LENGTH = 160;

export type AccountSecurityEventType =
  | "auth_email_link_requested"
  | "auth_google_started"
  | "auth_callback_missing_code"
  | "auth_callback_failed"
  | "auth_callback_succeeded"
  | "auth_callback_beta_access_denied"
  | "onboarding_completed"
  | "profile_settings_updated"
  | "workspace_settings_updated";

export function sanitizeAccountSecurityMetadata(
  metadata: Record<string, unknown> | null | undefined,
) {
  return sanitizeMetadataRecord(metadata ?? {});
}

function sanitizeMetadataRecord(metadata: Record<string, unknown>) {
  const sanitized: AccountSecurityMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_METADATA_KEY_PATTERN.test(key)) continue;
    const sanitizedValue = sanitizeMetadataValue(value);
    if (!isJsonValue(sanitizedValue)) continue;
    sanitized[key] = sanitizedValue;
  }

  return sanitized;
}

function sanitizeMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeMetadataValue(item));
  if (Object.prototype.toString.call(value) === "[object Object]") {
    return sanitizeMetadataRecord(value as Record<string, unknown>);
  }
  return value;
}

export function buildAccountSecurityEvent({
  eventType,
  userId,
  workspaceId,
  requestId,
  ipHash,
  userAgentHash,
  metadata,
}: {
  eventType: AccountSecurityEventType;
  userId: string | null;
  workspaceId: string | null;
  requestId?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return {
    event_type: eventType,
    user_id: userId,
    workspace_id: workspaceId,
    request_id: requestId ?? null,
    ip_hash: ipHash ?? null,
    user_agent_hash: userAgentHash ?? null,
    metadata_json: sanitizeAccountSecurityMetadata(metadata),
  };
}

function isJsonValue(value: unknown): value is Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") return Number.isFinite(value);

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

export function parseOnboardingSubmission(
  formData: FormData,
  options: { invitedCollaborator?: boolean } = {},
): OnboardingParseResult {
  const profileResult = parseProfileSettingsSubmission(formData, { prefix: "profile_" });
  const invitedCollaborator = options.invitedCollaborator === true;

  if (!profileResult.ok) {
    if (invitedCollaborator) {
      return { ok: false, fieldErrors: { ...profileResult.fieldErrors } };
    }

    const workspaceResult = parseWorkspaceSettingsSubmission(formData, { prefix: "workspace_" });
    return {
      ok: false,
      fieldErrors: {
        ...profileResult.fieldErrors,
        ...(workspaceResult.ok ? {} : workspaceResult.fieldErrors),
      },
    };
  }

  if (invitedCollaborator) {
    return {
      ok: true,
      profile: profileResult.profile,
      workspace: null,
    };
  }

  const workspaceResult = parseWorkspaceSettingsSubmission(formData, { prefix: "workspace_" });
  if (!workspaceResult.ok) {
    return { ok: false, fieldErrors: { ...workspaceResult.fieldErrors } };
  }

  return {
    ok: true,
    profile: profileResult.profile,
    workspace: workspaceResult.workspace,
  };
}

export function parseProfileSettingsSubmission(
  formData: FormData,
  options: ParseOptions = {},
): ParseResult<"profile", ProfileSettingsPayload> {
  const fieldErrors: FieldErrors = {};
  const displayName = getRequiredField(formData, fieldName("display_name", options), fieldErrors);
  validateMaxLength(fieldErrors, fieldName("display_name", options), displayName, ACCOUNT_DISPLAY_NAME_MAX_LENGTH);
  const userCategory = getOptionField(
    formData,
    fieldName("user_category", options),
    USER_CATEGORY_OPTIONS,
    fieldErrors,
  );
  const countryRegion = getRequiredField(formData, fieldName("country_region", options), fieldErrors);
  validateMaxLength(fieldErrors, fieldName("country_region", options), countryRegion, ACCOUNT_REGION_MAX_LENGTH);
  const primaryUse = getOptionalOptionField(
    formData,
    fieldName("primary_use", options),
    PRIMARY_USE_OPTIONS,
    fieldErrors,
  );
  const studentEducatorDetail = getOptionalTextField(
    formData,
    fieldName("student_educator_detail", options),
  );
  validateMaxLength(
    fieldErrors,
    fieldName("student_educator_detail", options),
    studentEducatorDetail,
    ACCOUNT_STUDENT_DETAIL_MAX_LENGTH,
  );

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    profile: {
      display_name: displayName,
      user_category: userCategory,
      country_region: countryRegion,
      primary_use: primaryUse,
      student_educator_detail: studentEducatorDetail,
      marketing_consent_at: null,
    },
  };
}

export function parseWorkspaceSettingsSubmission(
  formData: FormData,
  options: ParseOptions = {},
): ParseResult<"workspace", WorkspaceSettingsPayload> {
  const fieldErrors: FieldErrors = {};
  const organizationName = getRequiredField(formData, fieldName("organization_name", options), fieldErrors);
  validateMaxLength(
    fieldErrors,
    fieldName("organization_name", options),
    organizationName,
    ACCOUNT_ORGANIZATION_NAME_MAX_LENGTH,
  );
  const organizationType = getOptionField(
    formData,
    fieldName("organization_type", options),
    ORGANIZATION_TYPE_OPTIONS,
    fieldErrors,
  );
  const countryRegion = getRequiredField(formData, fieldName("country_region", options), fieldErrors);
  validateMaxLength(fieldErrors, fieldName("country_region", options), countryRegion, ACCOUNT_REGION_MAX_LENGTH);
  const companySize = getOptionalOptionField(
    formData,
    fieldName("company_size", options),
    COMPANY_SIZE_OPTIONS,
    fieldErrors,
  );
  const primaryUse = getOptionalOptionField(
    formData,
    fieldName("primary_use", options),
    PRIMARY_USE_OPTIONS,
    fieldErrors,
  );
  const defaultCurrency = getOptionalTextField(formData, fieldName("default_currency", options)) ?? "PHP";
  const normalizedCurrency = defaultCurrency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    fieldErrors.default_currency = "Use a 3-letter currency code";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    workspace: {
      organization_name: organizationName,
      organization_type: organizationType,
      country_region: countryRegion,
      company_size: companySize,
      default_currency: normalizedCurrency,
      primary_use: primaryUse,
    },
  };
}

export function canManageWorkspaceAccountSettings(role: WorkspaceAccountRole | null | undefined) {
  return role === "owner" || role === "admin";
}

function fieldName(name: string, options: ParseOptions) {
  return `${options.prefix ?? ""}${name}`;
}

function validateMaxLength(
  fieldErrors: FieldErrors,
  name: string,
  value: string | null,
  maxLength: number,
) {
  if (!value || value.length <= maxLength) return;
  fieldErrors[name] = `Use ${maxLength} characters or fewer`;
}

function getRequiredField(formData: FormData, name: string, fieldErrors: FieldErrors) {
  const value = getOptionalTextField(formData, name);
  if (!value) {
    fieldErrors[name] = "Required";
    return "";
  }
  return value;
}

function getOptionalTextField(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getOptionField<const Options extends readonly Option<string>[]>(
  formData: FormData,
  name: string,
  options: Options,
  fieldErrors: FieldErrors,
) {
  const value = getRequiredField(formData, name, fieldErrors);
  if (!value) return options[0].value as Options[number]["value"];
  if (options.some((option) => option.value === value)) {
    return value as Options[number]["value"];
  }

  fieldErrors[name] = "Choose a valid option";
  return options[0].value as Options[number]["value"];
}

function getOptionalOptionField<const Options extends readonly Option<string>[]>(
  formData: FormData,
  name: string,
  options: Options,
  fieldErrors: FieldErrors,
) {
  const value = getOptionalTextField(formData, name);
  if (!value) return null;
  if (options.some((option) => option.value === value)) {
    return value as Options[number]["value"];
  }

  fieldErrors[name] = "Choose a valid option";
  return null;
}
