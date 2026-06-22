const BUDGET_HEALTH_GRADIENT_STOPS = [
  { at: 0, color: "#5A95E8", tone: "blue" },
  { at: 0.12, color: "#55ACEF", tone: "sky" },
  { at: 0.24, color: "#4EC6E8", tone: "cyan" },
  { at: 0.36, color: "#57D5C0", tone: "teal" },
  { at: 0.48, color: "#73D98C", tone: "green" },
  { at: 0.6, color: "#B8DC6E", tone: "lime" },
  { at: 0.72, color: "#E1CD66", tone: "yellow" },
  { at: 0.82, color: "#E8AA5F", tone: "amber" },
  { at: 0.92, color: "#E77F60", tone: "orange" },
  { at: 1, color: "#D96565", tone: "red" },
] as const;

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function interpolateHexColor(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);

  return rgbToHex({
    r: Math.round(start.r + (end.r - start.r) * amount),
    g: Math.round(start.g + (end.g - start.g) * amount),
    b: Math.round(start.b + (end.b - start.b) * amount),
  });
}

export function getBudgetHealthGradientStop(ratioToBudget: number) {
  const clampedRatio = Math.min(1, Math.max(0, ratioToBudget));

  for (let index = 1; index < BUDGET_HEALTH_GRADIENT_STOPS.length; index += 1) {
    const previousStop = BUDGET_HEALTH_GRADIENT_STOPS[index - 1];
    const nextStop = BUDGET_HEALTH_GRADIENT_STOPS[index];

    if (clampedRatio <= nextStop.at) {
      const localAmount = (clampedRatio - previousStop.at) / (nextStop.at - previousStop.at);
      return {
        color: interpolateHexColor(previousStop.color, nextStop.color, localAmount),
        tone: nextStop.tone,
      };
    }
  }

  return BUDGET_HEALTH_GRADIENT_STOPS[BUDGET_HEALTH_GRADIENT_STOPS.length - 1];
}
