type ComponentImageFallbackInput = {
  category?: string | null;
  material?: string | null;
};

type ComponentImageFallbackTheme = {
  label: string;
  background: string;
  accent: string;
};

const componentImageFallbackThemes: Record<string, ComponentImageFallbackTheme> = {
  furniture: { label: "Furniture", background: "#f2eee6", accent: "#7a5a3a" },
  cabinetry: { label: "Cabinetry", background: "#ece7dc", accent: "#6f5f47" },
  finishes: { label: "Finishes", background: "#e8edf0", accent: "#4d6874" },
  "wall paints / interior finishes": { label: "Wall Finish", background: "#edf0e8", accent: "#627045" },
  "lighting / electrical fixtures": { label: "Electrical", background: "#eef1f6", accent: "#455b7a" },
  "electrical fixtures": { label: "Electrical", background: "#eef1f6", accent: "#455b7a" },
  "lighting fixtures": { label: "Lighting", background: "#f4f0df", accent: "#8a6f24" },
  "plumbing fixtures": { label: "Plumbing", background: "#e7f0ef", accent: "#3f6c70" },
  "kitchen fixtures": { label: "Kitchen", background: "#f0e9e5", accent: "#7a5547" },
  outdoor: { label: "Outdoor", background: "#e8efe7", accent: "#4e7149" },
  general: { label: "Component", background: "#eceff1", accent: "#5b6670" },
};

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function makeLocalComponentPlaceholder({ label, background, accent }: ComponentImageFallbackTheme) {
  const safeLabel = escapeSvgText(label);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" aria-label="${safeLabel} placeholder">`,
    `<rect width="600" height="400" fill="${background}"/>`,
    `<path d="M0 322h600v78H0z" fill="${accent}" opacity=".13"/>`,
    `<path d="M92 277h416" stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".28"/>`,
    `<rect x="132" y="96" width="336" height="168" rx="10" fill="none" stroke="${accent}" stroke-width="16" opacity=".62"/>`,
    `<path d="M174 228l67-70 58 53 47-42 80 59" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>`,
    `<circle cx="397" cy="137" r="23" fill="${accent}" opacity=".4"/>`,
    `<text x="300" y="338" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" letter-spacing="0" fill="${accent}">${safeLabel}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const componentImageFallbacks = Object.fromEntries(
  Object.entries(componentImageFallbackThemes).map(([key, theme]) => [key, makeLocalComponentPlaceholder(theme)]),
) as Record<keyof typeof componentImageFallbackThemes, string>;

export function getLocalComponentImageFallback(item: ComponentImageFallbackInput) {
  const category = item.category?.toLowerCase();
  if (category && category in componentImageFallbacks) return componentImageFallbacks[category as keyof typeof componentImageFallbacks];

  const material = (item.material ?? "").toLowerCase();
  if (material.includes("paint") || material.includes("skimcoat") || material.includes("wallpaper")) {
    return componentImageFallbacks["wall paints / interior finishes"];
  }
  if (material.includes("light") || material.includes("outlet") || material.includes("switch") || material.includes("led")) {
    return componentImageFallbacks["electrical fixtures"];
  }
  if (material.includes("toilet") || material.includes("lavatory") || material.includes("vanity") || material.includes("sink")) {
    return componentImageFallbacks["plumbing fixtures"];
  }
  if (material.includes("tile") || material.includes("floor")) return componentImageFallbacks.finishes;
  if (material.includes("wardrobe") || material.includes("cabinet")) return componentImageFallbacks.cabinetry;
  return componentImageFallbacks.furniture;
}
