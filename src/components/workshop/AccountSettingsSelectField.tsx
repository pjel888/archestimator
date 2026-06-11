"use client";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";

/**
 * Client island for the account-settings select fields. The settings form
 * fields module stays server-compatible (it is rendered by server-action
 * pages), so the interactive picker is isolated here instead of marking the
 * whole fields module "use client".
 *
 * Matches the previous ControlSelect register in these forms: h-8 underline
 * control on a white surface. Form semantics (name/defaultValue/required and
 * reset resync) ride on DropdownSelect's hidden native select.
 */

type AccountSettingsSelectFieldProps = {
  name: string;
  options: readonly DropdownSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

export function AccountSettingsSelectField({
  name,
  options,
  defaultValue,
  placeholder,
  required,
  disabled,
  "aria-label": ariaLabel,
}: AccountSettingsSelectFieldProps) {
  return (
    <DropdownSelect
      name={name}
      options={options}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-8 w-full bg-white px-2"
    />
  );
}
