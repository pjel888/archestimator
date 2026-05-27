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
import { ControlSelect } from "@/components/ui/control-select";

type ProfileSettingsFieldsProps = {
  initial?: Partial<ProfileSettingsPayload>;
  namePrefix?: string;
};

type WorkspaceSettingsFieldsProps = {
  initial?: Partial<WorkspaceSettingsPayload>;
  disabled?: boolean;
  namePrefix?: string;
};

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
        <ControlSelect
          name={fieldName("user_category", namePrefix)}
          defaultValue={initial?.user_category ?? ""}
          className="h-8 w-full bg-white px-2"
          required
        >
          <option value="" disabled>
            Select category
          </option>
          {USER_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ControlSelect>
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
        <ControlSelect
          name={fieldName("primary_use", namePrefix)}
          defaultValue={initial?.primary_use ?? ""}
          className="h-8 w-full bg-white px-2"
        >
          <option value="">Not set</option>
          {PRIMARY_USE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ControlSelect>
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
        <ControlSelect
          name={fieldName("organization_type", namePrefix)}
          defaultValue={initial?.organization_type ?? ""}
          disabled={disabled}
          className="h-8 w-full bg-white px-2"
          required
        >
          <option value="" disabled>
            Select type
          </option>
          {ORGANIZATION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ControlSelect>
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
        <ControlSelect
          name={fieldName("company_size", namePrefix)}
          defaultValue={initial?.company_size ?? ""}
          disabled={disabled}
          className="h-8 w-full bg-white px-2"
        >
          <option value="">Not set</option>
          {COMPANY_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ControlSelect>
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
        <ControlSelect
          name={fieldName("primary_use", namePrefix)}
          defaultValue={initial?.primary_use ?? ""}
          disabled={disabled}
          className="h-8 w-full bg-white px-2"
        >
          <option value="">Not set</option>
          {PRIMARY_USE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </ControlSelect>
      </ControlField>
    </div>
  );
}
