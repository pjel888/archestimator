import "server-only";

export type ClientPortalBrandTheme = { accentColor: string; backgroundColor: string; textColor: string };

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(foreground: string, background: string) {
  if (!HEX.test(foreground) || !HEX.test(background)) return 0;
  const [light, dark] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (light + 0.05) / (dark + 0.05);
}

export function normalizeClientPortalBrandTheme(value: unknown): ClientPortalBrandTheme {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Client Portal brand theme is invalid.");
  const record = value as Record<string, unknown>;
  const theme = { accentColor: record.accentColor, backgroundColor: record.backgroundColor, textColor: record.textColor };
  if (Object.values(theme).some((color) => typeof color !== "string" || !HEX.test(color))) throw new Error("Client Portal brand colors must be six-digit hex values.");
  if (contrastRatio(theme.textColor as string, theme.backgroundColor as string) < 4.5) throw new Error("Client Portal brand text must meet 4.5:1 contrast.");
  return theme as ClientPortalBrandTheme;
}

export function createIssuedClientPortalBrandSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Client Portal brand snapshot is invalid.");
  const snapshot = value as Record<string, unknown>;
  return { ...snapshot, theme: normalizeClientPortalBrandTheme(snapshot.theme ?? { accentColor: "#1E40AF", backgroundColor: "#FFFFFF", textColor: "#111827" }) };
}
