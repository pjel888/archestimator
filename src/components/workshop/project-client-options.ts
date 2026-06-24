import type { CreatableComboboxOption } from "@/components/ui/creatable-combobox";

function normalizeClientName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function createProjectClientOptions(clientNames: readonly string[] = []): CreatableComboboxOption[] {
  const optionsByKey = new Map<string, CreatableComboboxOption>();

  for (const value of clientNames) {
    const label = value.trim();
    const key = normalizeClientName(label);
    if (!key || optionsByKey.has(key)) continue;
    optionsByKey.set(key, {
      id: key,
      label,
      searchText: label,
    });
  }

  return Array.from(optionsByKey.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
  );
}
