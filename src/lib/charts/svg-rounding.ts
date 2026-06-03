const SVG_PRECISION = 4;

export function roundSvgNumber(value: number, precision = SVG_PRECISION): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function formatSvgNumber(value: number, precision = SVG_PRECISION): string {
  return String(roundSvgNumber(value, precision));
}

export function roundSvgPath(pathD: string, precision = SVG_PRECISION): string {
  return pathD.replace(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi, (match) => {
    const value = Number.parseFloat(match);
    return Number.isFinite(value) ? formatSvgNumber(value, precision) : match;
  });
}
