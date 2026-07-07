import type { CreatableComboboxOption } from "@/components/ui/creatable-combobox";
import {
  COMPONENT_UNIT_OPTIONS,
  CONTENT_UNIT_OPTIONS,
  type ComponentUnitOption,
} from "@/lib/component-library/unit-options";

export function toUnitComboboxOptions(options: ComponentUnitOption[]): CreatableComboboxOption[] {
  return options.map((option) => ({
    id: option.value,
    label: option.label,
    description: option.description,
    searchText: option.searchText,
  }));
}

export const COMPONENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(COMPONENT_UNIT_OPTIONS);
export const CONTENT_UNIT_COMBOBOX_OPTIONS = toUnitComboboxOptions(CONTENT_UNIT_OPTIONS);

export function getSelectedUnitId(value: string, options: CreatableComboboxOption[]): string | null {
  const trimmedValue = value.trim();
  return options.some((option) => option.id === trimmedValue) ? trimmedValue : null;
}

export function getUnitComboboxValue(change: { id: string | null; label: string }) {
  return change.id ?? change.label;
}
