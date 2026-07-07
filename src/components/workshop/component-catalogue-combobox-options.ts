import type { CreatableComboboxChange, CreatableComboboxOption } from "@/components/ui/creatable-combobox";

type ComponentCatalogueOptionKind = "brand" | "supplier";

export type ComponentCatalogueOptionInput =
  | string
  | {
      id?: string | null;
      label?: string | null;
      name?: string | null;
      description?: string | null;
      searchText?: string | null;
    };

function normalizeCatalogueOptionLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCatalogueOptionKey(value: string): string {
  return normalizeCatalogueOptionLabel(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toFallbackOptionId(kind: ComponentCatalogueOptionKind, label: string) {
  return `${kind}:${normalizeCatalogueOptionKey(label).replace(/\s+/g, "-")}`;
}

function readInputLabel(input: ComponentCatalogueOptionInput): string {
  if (typeof input === "string") return normalizeCatalogueOptionLabel(input);
  return normalizeCatalogueOptionLabel(input.name ?? input.label ?? "");
}

export function buildComponentCatalogueComboboxOptions(
  kind: ComponentCatalogueOptionKind,
  inputs: Array<ComponentCatalogueOptionInput | null | undefined>,
): CreatableComboboxOption[] {
  const seen = new Set<string>();
  const options: CreatableComboboxOption[] = [];

  for (const input of inputs) {
    if (!input) continue;
    const label = readInputLabel(input);
    const key = normalizeCatalogueOptionKey(label);
    if (!label || !key || seen.has(key)) continue;
    seen.add(key);

    if (typeof input === "string") {
      options.push({ id: toFallbackOptionId(kind, label), label });
      continue;
    }

    options.push({
      id: input.id || toFallbackOptionId(kind, label),
      label,
      description: input.description ?? undefined,
      searchText: input.searchText ?? undefined,
    });
  }

  return options;
}

export function getSelectedComponentCatalogueOptionId(value: string, options: CreatableComboboxOption[]) {
  const key = normalizeCatalogueOptionKey(value);
  if (!key) return null;
  return options.find((option) => normalizeCatalogueOptionKey(option.label) === key)?.id ?? null;
}

export function getComponentCatalogueComboboxValue(change: CreatableComboboxChange) {
  return change.label;
}
