import {
  COMPANY_SIZE_OPTIONS,
  ACCOUNT_DISPLAY_NAME_MAX_LENGTH,
  ACCOUNT_ORGANIZATION_NAME_MAX_LENGTH,
  ACCOUNT_REGION_MAX_LENGTH,
  ACCOUNT_STUDENT_DETAIL_MAX_LENGTH,
  ORGANIZATION_TYPE_OPTIONS,
  PRIMARY_USE_OPTIONS,
  USER_CATEGORY_OPTIONS,
  type ProfileSettingsPayload,
  type WorkspaceSettingsPayload,
} from "@/lib/auth/account-data";
import {
  CONTROL_INPUT_SURFACE_CLASS,
  ControlField,
  ControlInput,
} from "@/components/ui/control-input";
import { AccountSettingsSelectField } from "@/components/workshop/AccountSettingsSelectField";

type ProfileSettingsFieldsProps = {
  initial?: Partial<ProfileSettingsPayload>;
  namePrefix?: string;
};

type WorkspaceSettingsFieldsProps = {
  initial?: Partial<WorkspaceSettingsPayload>;
  disabled?: boolean;
  namePrefix?: string;
};

const NOT_SET_OPTION = { value: "", label: "Not set" } as const;
const PRIMARY_USE_SELECT_OPTIONS = [NOT_SET_OPTION, ...PRIMARY_USE_OPTIONS];
const COMPANY_SIZE_SELECT_OPTIONS = [NOT_SET_OPTION, ...COMPANY_SIZE_OPTIONS];

function fieldName(name: string, prefix: string | undefined) {
  return `${prefix ?? ""}${name}`;
}

export function ProfileSettingsFields({ initial, namePrefix }: ProfileSettingsFieldsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <ControlField label="Display name" required>
        <ControlInput
          name={fieldName("display_name", namePrefix)}
          defaultValue={initial?.display_name ?? ""}
          autoComplete="name"
          maxLength={ACCOUNT_DISPLAY_NAME_MAX_LENGTH}
          className={CONTROL_INPUT_SURFACE_CLASS}
          required
        />
      </ControlField>
      <ControlField label="User category" required>
        <AccountSettingsSelectField
          name={fieldName("user_category", namePrefix)}
          defaultValue={initial?.user_category ?? ""}
          options={USER_CATEGORY_OPTIONS}
          placeholder="Select category"
          aria-label="User category"
          required
        />
      </ControlField>
      <ControlField label="Country / region" required>
        <ControlInput
          name={fieldName("country_region", namePrefix)}
          defaultValue={initial?.country_region ?? ""}
          autoComplete="country-name"
          maxLength={ACCOUNT_REGION_MAX_LENGTH}
          className={CONTROL_INPUT_SURFACE_CLASS}
          required
        />
      </ControlField>
      <ControlField label="Primary use">
        <AccountSettingsSelectField
          name={fieldName("primary_use", namePrefix)}
          defaultValue={initial?.primary_use ?? ""}
          options={PRIMARY_USE_SELECT_OPTIONS}
          aria-label="Primary use"
        />
      </ControlField>
      <ControlField label="Student / educator detail" className="md:col-span-2">
        <ControlInput
          name={fieldName("student_educator_detail", namePrefix)}
          defaultValue={initial?.student_educator_detail ?? ""}
          maxLength={ACCOUNT_STUDENT_DETAIL_MAX_LENGTH}
          className={CONTROL_INPUT_SURFACE_CLASS}
        />
      </ControlField>
    </div>
  );
}

export function WorkspaceSettingsFields({
  initial,
  disabled = false,
  namePrefix,
}: WorkspaceSettingsFieldsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <ControlField label="Organization / workspace name" required>
        <ControlInput
          name={fieldName("organization_name", namePrefix)}
          defaultValue={initial?.organization_name ?? ""}
          disabled={disabled}
          maxLength={ACCOUNT_ORGANIZATION_NAME_MAX_LENGTH}
          className={CONTROL_INPUT_SURFACE_CLASS}
          required
        />
      </ControlField>
      <ControlField label="Organization type" required>
        <AccountSettingsSelectField
          name={fieldName("organization_type", namePrefix)}
          defaultValue={initial?.organization_type ?? ""}
          disabled={disabled}
          options={ORGANIZATION_TYPE_OPTIONS}
          placeholder="Select type"
          aria-label="Organization type"
          required
        />
      </ControlField>
      <ControlField label="Country / region" required>
        <ControlInput
          name={fieldName("country_region", namePrefix)}
          defaultValue={initial?.country_region ?? ""}
          disabled={disabled}
          autoComplete="country-name"
          maxLength={ACCOUNT_REGION_MAX_LENGTH}
          className={CONTROL_INPUT_SURFACE_CLASS}
          required
        />
      </ControlField>
      <ControlField label="Company size">
        <AccountSettingsSelectField
          name={fieldName("company_size", namePrefix)}
          defaultValue={initial?.company_size ?? ""}
          disabled={disabled}
          options={COMPANY_SIZE_SELECT_OPTIONS}
          aria-label="Company size"
        />
      </ControlField>
      <ControlField label="Default currency">
        <ControlInput
          name={fieldName("default_currency", namePrefix)}
          defaultValue={initial?.default_currency ?? "PHP"}
          disabled={disabled}
          maxLength={3}
          className={CONTROL_INPUT_SURFACE_CLASS}
        />
      </ControlField>
      <ControlField label="Primary use">
        <AccountSettingsSelectField
          name={fieldName("primary_use", namePrefix)}
          defaultValue={initial?.primary_use ?? ""}
          disabled={disabled}
          options={PRIMARY_USE_SELECT_OPTIONS}
          aria-label="Primary use"
        />
      </ControlField>
    </div>
  );
}
