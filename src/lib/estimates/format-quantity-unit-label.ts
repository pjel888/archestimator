const QUANTITY_UNIT_UNCHANGED = new Set([
  "cm",
  "cu m",
  "cu ft",
  "cu in",
  "cu yd",
  "cu.m",
  "cu.m.",
  "cum",
  "ea",
  "fl oz",
  "ft",
  "ft2",
  "ft3",
  "ft²",
  "ft³",
  "g",
  "gal",
  "hr",
  "hrs",
  "in",
  "kg",
  "km",
  "l",
  "lb",
  "lbs",
  "lf",
  "lm",
  "m",
  "m2",
  "m3",
  "m²",
  "m³",
  "mm",
  "ml",
  "oz",
  "pc",
  "pcs",
  "pt",
  "qt",
  "rm",
  "sf",
  "sq cm",
  "sq ft",
  "sq in",
  "sq m",
  "sq yd",
  "sq.ft",
  "sq.ft.",
  "sq.m",
  "sq.m.",
  "sqft",
  "sqm",
  "t",
  "ton",
  "tonne",
  "yd",
]);

const IRREGULAR_QUANTITY_UNIT_PLURALS = new Map([
  ["foot", "feet"],
  ["inch", "inches"],
  ["person", "people"],
]);

function matchWordCase(source: string, target: string) {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source[0] === source[0]?.toUpperCase()) return `${target[0]?.toUpperCase() ?? ""}${target.slice(1)}`;
  return target;
}

function pluralizeQuantityUnitWord(word: string) {
  const lowerWord = word.toLowerCase();
  if (QUANTITY_UNIT_UNCHANGED.has(lowerWord)) return word;

  const irregular = IRREGULAR_QUANTITY_UNIT_PLURALS.get(lowerWord);
  if (irregular) return matchWordCase(word, irregular);

  if (/[sxz]$/i.test(word) || /(?:ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

export function formatQuantityUnitLabel(quantity: number, unit: string) {
  const trimmedUnit = unit.trim();
  if (!trimmedUnit) return "";
  if (Math.abs(quantity) === 1) return trimmedUnit;

  const lowerUnit = trimmedUnit.toLowerCase();
  if (lowerUnit.includes("/")) return trimmedUnit;
  if (QUANTITY_UNIT_UNCHANGED.has(lowerUnit)) return trimmedUnit;

  return trimmedUnit.replace(/[A-Za-z]+$/, (word) => pluralizeQuantityUnitWord(word));
}
