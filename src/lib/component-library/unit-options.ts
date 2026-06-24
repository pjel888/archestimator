export type ComponentUnitOption = {
  value: string;
  label: string;
  description: string;
  searchText?: string;
};

export const COMPONENT_UNIT_OPTIONS: ComponentUnitOption[] = [
  { value: "unit", label: "unit", description: "Generic unit" },
  { value: "pc", label: "pc", description: "Piece", searchText: "each pcs piece pieces item count" },
  { value: "pair", label: "pair", description: "Pair" },
  { value: "set", label: "set", description: "Set" },
  { value: "lot", label: "lot", description: "Lump sum lot" },

  { value: "mm", label: "mm", description: "Millimeter" },
  { value: "cm", label: "cm", description: "Centimeter" },
  { value: "m", label: "m", description: "Meter" },
  { value: "lm", label: "lm", description: "Linear meter", searchText: "lineal meter running meter" },
  { value: "sqm", label: "sqm", description: "Square meter", searchText: "m2 area square metre" },
  { value: "m3", label: "m3", description: "Cubic meter", searchText: "cubic metre cu m volume" },
  { value: "ha", label: "ha", description: "Hectare" },
  { value: "mL", label: "mL", description: "Milliliter" },
  { value: "L", label: "L", description: "Liter" },
  { value: "g", label: "g", description: "Gram" },
  { value: "kg", label: "kg", description: "Kilogram" },
  { value: "tonne", label: "tonne", description: "Metric tonne" },

  { value: "in", label: "in", description: "Inch" },
  { value: "ft", label: "ft", description: "Foot" },
  { value: "yd", label: "yd", description: "Yard" },
  { value: "lf", label: "lf", description: "Linear foot", searchText: "lineal foot running foot" },
  { value: "sq in", label: "sq in", description: "Square inch", searchText: "in2 area" },
  { value: "sq ft", label: "sq ft", description: "Square foot", searchText: "sf ft2 area" },
  { value: "sq yd", label: "sq yd", description: "Square yard", searchText: "yd2 area" },
  { value: "cu ft", label: "cu ft", description: "Cubic foot", searchText: "cf ft3 volume" },
  { value: "cu yd", label: "cu yd", description: "Cubic yard", searchText: "yd3 volume" },
  { value: "oz", label: "oz", description: "Ounce" },
  { value: "lb", label: "lb", description: "Pound" },
  { value: "gal", label: "gal", description: "Gallon" },

  { value: "box", label: "box", description: "Box / carton" },
  { value: "pack", label: "pack", description: "Pack" },
  { value: "bundle", label: "bundle", description: "Bundle" },
  { value: "roll", label: "roll", description: "Roll goods" },
  { value: "sheet", label: "sheet", description: "Sheet material" },
  { value: "panel", label: "panel", description: "Panel" },
  { value: "board", label: "board", description: "Board" },
  { value: "slab", label: "slab", description: "Slab" },
  { value: "tile", label: "tile", description: "Tile" },
  { value: "bag", label: "bag", description: "Bag" },
  { value: "sack", label: "sack", description: "Sack" },
  { value: "bucket", label: "bucket", description: "Bucket" },
  { value: "pail", label: "pail", description: "Pail" },
  { value: "can", label: "can", description: "Can" },
  { value: "tube", label: "tube", description: "Tube" },
  { value: "cartridge", label: "cartridge", description: "Cartridge" },
  { value: "drum", label: "drum", description: "Drum" },
  { value: "pallet", label: "pallet", description: "Pallet" },
  { value: "crate", label: "crate", description: "Crate" },
  { value: "load", label: "load", description: "Truck/load delivery" },
  { value: "bar", label: "bar", description: "Bar stock" },
  { value: "rod", label: "rod", description: "Rod" },

  { value: "hr", label: "hr", description: "Hour" },
  { value: "day", label: "day", description: "Day" },
  { value: "week", label: "week", description: "Week" },
  { value: "month", label: "month", description: "Month" },
  { value: "crew hr", label: "crew hr", description: "Crew hour" },
  { value: "crew day", label: "crew day", description: "Crew day" },

  { value: "sqm/box", label: "sqm/box", description: "Square meters per box", searchText: "tile coverage" },
  { value: "sq ft/box", label: "sq ft/box", description: "Square feet per box", searchText: "tile coverage" },
  { value: "sqm/roll", label: "sqm/roll", description: "Square meters per roll" },
  { value: "sq ft/roll", label: "sq ft/roll", description: "Square feet per roll" },
  { value: "lm/pc", label: "lm/pc", description: "Linear meters per piece" },
  { value: "ft/pc", label: "ft/pc", description: "Feet per piece" },
  { value: "kg/bag", label: "kg/bag", description: "Kilograms per bag" },
  { value: "L/can", label: "L/can", description: "Liters per can" },
  { value: "gal/can", label: "gal/can", description: "Gallons per can" },
];

const CONTENT_CONVERSION_UNIT_VALUES = new Set([
  "box",
  "pack",
  "bundle",
  "roll",
  "bag",
  "sack",
  "bucket",
  "pail",
  "can",
  "tube",
  "cartridge",
  "drum",
  "pallet",
  "crate",
  "load",
  "set",
]);
const CUSTOM_CONTENT_CONVERSION_TOKENS = [
  "box",
  "carton",
  "case",
  "pack",
  "bundle",
  "roll",
  "bag",
  "sack",
  "bucket",
  "pail",
  "can",
  "tube",
  "cartridge",
  "drum",
  "pallet",
  "crate",
  "load",
];

function normalizeUnitValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function unitUsesContentConversion(value: string) {
  const normalized = normalizeUnitValue(value);
  if (!normalized || normalized.includes("/")) return false;
  if (CONTENT_CONVERSION_UNIT_VALUES.has(normalized)) return true;
  return CUSTOM_CONTENT_CONVERSION_TOKENS.some((token) => new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(normalized));
}

export function getUnitDisplayLabel(value: string) {
  const normalized = normalizeUnitValue(value);
  const option = COMPONENT_UNIT_OPTIONS.find((candidate) => normalizeUnitValue(candidate.value) === normalized || normalizeUnitValue(candidate.label) === normalized);
  return (option?.label ?? value.trim() ?? "unit").replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
}

export const CONTENT_UNIT_OPTIONS: ComponentUnitOption[] = [
  { value: "pieces", label: "pieces", description: "Count", searchText: "each pc pcs piece item count" },
  { value: "pair", label: "pair", description: "Count" },
  { value: "set", label: "set", description: "Count" },
  { value: "tile", label: "tile", description: "Count" },
  { value: "sheet", label: "sheet", description: "Count" },
  { value: "panel", label: "panel", description: "Count" },
  { value: "board", label: "board", description: "Count" },
  { value: "bar", label: "bar", description: "Count" },
  { value: "rod", label: "rod", description: "Count" },

  { value: "m", label: "m", description: "Length", searchText: "meter metre linear meter" },
  { value: "lm", label: "lm", description: "Length", searchText: "linear meter lineal meter running meter" },
  { value: "ft", label: "ft", description: "Length", searchText: "foot linear foot" },
  { value: "lf", label: "lf", description: "Length", searchText: "linear foot lineal foot running foot" },

  { value: "sqm", label: "sqm", description: "Area", searchText: "m2 square meter square metre" },
  { value: "sq ft", label: "sq ft", description: "Area", searchText: "sf ft2 square foot" },

  { value: "m3", label: "m3", description: "Volume", searchText: "cubic meter cubic metre cu m" },
  { value: "cu ft", label: "cu ft", description: "Volume", searchText: "cf ft3 cubic foot" },

  { value: "kg", label: "kg", description: "Mass", searchText: "kilogram weight" },
  { value: "lb", label: "lb", description: "Mass", searchText: "pound weight" },

  { value: "L", label: "L", description: "Liquid", searchText: "liter litre" },
  { value: "gal", label: "gal", description: "Liquid", searchText: "gallon" },
];

const PACKAGE_UNIT_OPTIONS: ComponentUnitOption[] = CONTENT_UNIT_OPTIONS;

export const DIMENSION_UNIT_OPTIONS: ComponentUnitOption[] = [
  { value: "mm", label: "mm", description: "Millimeter" },
  { value: "cm", label: "cm", description: "Centimeter" },
  { value: "m", label: "m", description: "Meter" },
  { value: "in", label: "in", description: "Inch" },
  { value: "ft", label: "ft", description: "Foot" },
  { value: "yd", label: "yd", description: "Yard" },
];

const MASS_UNIT_OPTIONS: ComponentUnitOption[] = [
  { value: "g", label: "g", description: "Gram" },
  { value: "kg", label: "kg", description: "Kilogram" },
  { value: "tonne", label: "tonne", description: "Metric tonne" },
  { value: "oz", label: "oz", description: "Ounce" },
  { value: "lb", label: "lb", description: "Pound" },
];
