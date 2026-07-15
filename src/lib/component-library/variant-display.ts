export function formatVariantCode(index: number) {
  return `V-${index + 1}`;
}

export function formatVariantDropdownLabel(index: number, name: string | null | undefined) {
  const code = formatVariantCode(index);
  const normalizedName = name?.trim();
  return normalizedName ? `${code} — ${normalizedName}` : code;
}
