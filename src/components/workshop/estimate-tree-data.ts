export type EstimateRowItemSource = "project" | "supplier" | "library";

export type EstimateRowItem = {
  id: string;
  material: string;
  name?: string;
  description: string;
  supplier: string;
  source: EstimateRowItemSource;
  unit: string;
  itemCost: number;
  price?: number;
  currency?: string;
  quantity: number;
  subTotal: number;
  supplementaryCosts: number;
  laborCost: number;
  laborCostDefault?: number;
  otherCostDefault?: number;
  totalItemCosts: number;
  imageUrl?: string;
  category: string;
  discipline?: string;
  designation?: string;
  tags?: string[];
  sku?: string;
  sourceUrl?: string;
  notes?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  pricingSource: string;
  pricingDate: string;
};

export type EstimateTreeNode = {
  id: string;
  name: string;
  kind: "group" | "area";
  total: string;
  children?: EstimateTreeNode[];
  estimateRowItems?: EstimateRowItem[];
};

export type EstimateAreaNode = EstimateTreeNode;

export type FlatEstimateAreaNode = EstimateTreeNode & {
  depth: number;
  path: string[];
};

const fallbackComponentImages: Record<string, string> = {
  "Furniture": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  "Cabinetry": "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80",
  "Finishes": "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
  "Wall Paints / Interior Finishes": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  "Lighting / Electrical Fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "Electrical Fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "Lighting Fixtures": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80",
  "Plumbing Fixtures": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80",
  "Kitchen Fixtures": "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=600&q=80",
  "Outdoor": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
  "General": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
};

const componentThumbnailUrls: Record<string, string> = {
  "lib-sofa": "/component-thumbnails/lib-sofa.jpg",
  "lib-accent-chair": "/component-thumbnails/lib-accent-chair.jpg",
  "lib-coffee-table": "/component-thumbnails/lib-coffee-table.jpg",
  "lib-dining-table": "/component-thumbnails/lib-dining-table.jpg",
  "lib-dining-chair": "/component-thumbnails/lib-dining-chair.jpg",
  "lib-queen-bed": "/component-thumbnails/lib-queen-bed.jpg",
  "lib-single-bed": "/component-thumbnails/lib-single-bed.jpg",
  "lib-bedside-table": "/component-thumbnails/lib-bedside-table.jpg",
  "lib-wardrobe": "/component-thumbnails/lib-wardrobe.jpg",
  "lib-vanity": "/component-thumbnails/lib-vanity.jpg",
  "lib-porcelain-tile": "/component-thumbnails/lib-porcelain-tile.jpg",
  "lib-boysen-permacoat-4l": "/component-thumbnails/lib-boysen-permacoat-4l.jpg",
  "lib-boysen-permacoat-16l": "/component-thumbnails/lib-boysen-permacoat-16l.jpg",
  "lib-davies-megacryl-4l": "/component-thumbnails/lib-davies-megacryl-4l.jpg",
  "lib-davies-biofresh-4l": "/component-thumbnails/lib-davies-biofresh-4l.jpg",
  "lib-rain-or-shine-latex-16l": "/component-thumbnails/lib-rain-or-shine-latex-16l.jpg",
  "lib-masonry-primer-4l": "/component-thumbnails/lib-masonry-primer-4l.jpg",
  "lib-abc-skimcoat-20kg": "/component-thumbnails/lib-abc-skimcoat-20kg.jpg",
  "lib-concrete-putty-4l": "/component-thumbnails/lib-concrete-putty-4l.jpg",
  "lib-vinyl-wallpaper": "/component-thumbnails/lib-vinyl-wallpaper.jpg",
  "lib-pvc-marble-wall-panel": "/component-thumbnails/lib-pvc-marble-wall-panel.jpg",
  "lib-firefly-led-bulb-9w": "/component-thumbnails/lib-firefly-led-bulb-9w.jpg",
  "lib-led-panel-6w": "/component-thumbnails/lib-led-panel-6w.jpg",
  "lib-led-panel-12w": "/component-thumbnails/lib-led-panel-12w.jpg",
  "lib-led-downlight-18w": "/component-thumbnails/lib-led-downlight-18w.jpg",
  "lib-led-tube-t8-18w": "/component-thumbnails/lib-led-tube-t8-18w.jpg",
  "lib-led-strip-5m": "/component-thumbnails/lib-led-strip-5m.jpg",
  "lib-led-strip-driver-12v": "/component-thumbnails/lib-led-strip-driver-12v.jpg",
  "lib-outdoor-floodlight-30w": "/component-thumbnails/lib-outdoor-floodlight-30w.jpg",
  "lib-panasonic-duplex-outlet": "/component-thumbnails/lib-panasonic-duplex-outlet.jpg",
  "lib-light-switch-1gang": "/component-thumbnails/lib-light-switch-1gang.jpg",
  "lib-light-switch-2gang": "/component-thumbnails/lib-light-switch-2gang.jpg",
  "lib-weatherproof-outlet": "/component-thumbnails/lib-weatherproof-outlet.jpg",
  "lib-pendant-light-basic": "/component-thumbnails/lib-pendant-light-basic.jpg",
  "lib-emergency-light-twin": "/component-thumbnails/lib-emergency-light-twin.jpg",
  "lib-american-standard-close-coupled-wc": "/component-thumbnails/lib-american-standard-close-coupled-wc.jpg",
  "lib-hcg-one-piece-wc": "/component-thumbnails/lib-hcg-one-piece-wc.jpg",
  "lib-wall-hung-lavatory": "/component-thumbnails/lib-wall-hung-lavatory.jpg",
  "lib-countertop-lavatory": "/component-thumbnails/lib-countertop-lavatory.jpg",
  "lib-grohe-lavatory-faucet": "/component-thumbnails/lib-grohe-lavatory-faucet.jpg",
  "lib-rain-shower-set": "/component-thumbnails/lib-rain-shower-set.jpg",
  "lib-franke-single-bowl-sink": "/component-thumbnails/lib-franke-single-bowl-sink.jpg",
  "lib-franke-double-bowl-sink": "/component-thumbnails/lib-franke-double-bowl-sink.jpg",
  "lib-ikea-kitchen-mixer": "/component-thumbnails/lib-ikea-kitchen-mixer.jpg",
  "lib-stainless-floor-drain": "/component-thumbnails/lib-stainless-floor-drain.jpg",
  "lib-brass-angle-valve": "/component-thumbnails/lib-brass-angle-valve.jpg",
  "lib-braided-flexible-hose": "/component-thumbnails/lib-braided-flexible-hose.jpg",
  "lib-outdoor-lounge": "/component-thumbnails/lib-outdoor-lounge.jpg",
  "lib-mariwasa-ceramic-floor-tile-400": "/component-thumbnails/lib-mariwasa-ceramic-floor-tile-400.jpg",
  "lib-mariwasa-porcelain-matte-600": "/component-thumbnails/lib-mariwasa-porcelain-matte-600.jpg",
  "lib-floor-center-wood-look-tile": "/component-thumbnails/lib-floor-center-wood-look-tile.jpg",
  "lib-floor-center-homogeneous-tile": "/component-thumbnails/lib-floor-center-homogeneous-tile.jpg",
  "lib-niro-granite-porcelain-slab": "/component-thumbnails/lib-niro-granite-porcelain-slab.jpg",
  "lib-eurotiles-anti-slip-tile": "/component-thumbnails/lib-eurotiles-anti-slip-tile.jpg",
  "lib-kent-vinyl-floor-tile": "/component-thumbnails/lib-kent-vinyl-floor-tile.jpg",
  "lib-apo-vinyl-roll-flooring": "/component-thumbnails/lib-apo-vinyl-roll-flooring.jpg",
  "lib-matimco-engineered-wood-floor": "/component-thumbnails/lib-matimco-engineered-wood-floor.jpg",
  "lib-hornitex-laminate-flooring": "/component-thumbnails/lib-hornitex-laminate-flooring.jpg",
  "lib-bamboo-flooring-plank": "/component-thumbnails/lib-bamboo-flooring-plank.jpg",
  "lib-machuca-cement-tile": "/component-thumbnails/lib-machuca-cement-tile.jpg",
  "lib-granite-floor-tile-local": "/component-thumbnails/lib-granite-floor-tile-local.jpg",
  "lib-pebble-washout-floor": "/component-thumbnails/lib-pebble-washout-floor.jpg",
  "lib-polished-concrete-finish": "/component-thumbnails/lib-polished-concrete-finish.jpg",
  "lib-epoxy-floor-coating": "/component-thumbnails/lib-epoxy-floor-coating.jpg",
  "lib-carpet-tile-modular": "/component-thumbnails/lib-carpet-tile-modular.jpg",
  "lib-wood-plastic-composite-deck": "/component-thumbnails/lib-wood-plastic-composite-deck.jpg",
  "foyer-porcelain-entry-tile": "/component-thumbnails/foyer-porcelain-entry-tile.jpg",
  "foyer-console-table": "/component-thumbnails/foyer-console-table.jpg",
  "living-hardwood-oak-flooring": "/component-thumbnails/living-hardwood-oak-flooring.jpg",
  "living-sofa": "/component-thumbnails/living-sofa.jpg",
  "living-accent-chairs": "/component-thumbnails/living-accent-chairs.jpg",
  "living-coffee-table": "/component-thumbnails/living-coffee-table.jpg",
  "dining-table": "/component-thumbnails/dining-table.jpg",
  "dining-chairs": "/component-thumbnails/dining-chairs.jpg",
  "dining-chandelier": "/component-thumbnails/dining-chandelier.jpg",
  "kitchen-quartz-countertop": "/component-thumbnails/kitchen-quartz-countertop.jpg",
  "kitchen-base-cabinets": "/component-thumbnails/kitchen-base-cabinets.jpg",
  "powder-vanity": "/component-thumbnails/powder-vanity.jpg",
  "powder-wall-tile": "/component-thumbnails/powder-wall-tile.jpg",
  "primary-queen-bed": "/component-thumbnails/primary-queen-bed.jpg",
  "primary-bedside-tables": "/component-thumbnails/primary-bedside-tables.jpg",
  "wic-modular-wardrobe": "/component-thumbnails/wic-modular-wardrobe.jpg",
  "primary-bath-vanity": "/component-thumbnails/primary-bath-vanity.jpg",
  "bedroom-2-single-bed": "/component-thumbnails/bedroom-2-single-bed.jpg",
  "bedroom-2-study-desk": "/component-thumbnails/bedroom-2-study-desk.jpg",
  "bedroom-3-single-bed": "/component-thumbnails/bedroom-3-single-bed.jpg",
  "bedroom-3-wardrobe": "/component-thumbnails/bedroom-3-wardrobe.jpg",
  "family-hall-sofa": "/component-thumbnails/family-hall-sofa.jpg",
  "roof-outdoor-lounge": "/component-thumbnails/roof-outdoor-lounge.jpg",
  "roof-bar-counter": "/component-thumbnails/roof-bar-counter.jpg",
  "roof-toilet-vanity": "/component-thumbnails/roof-toilet-vanity.jpg",
};

function inferCategory(material: string) {
  const value = material.toLowerCase();
  if (value.includes("sofa") || value.includes("chair") || value.includes("table") || value.includes("bed") || value.includes("desk")) return "Furniture";
  if (value.includes("tile") || value.includes("floor")) return "Finishes";
  if (value.includes("cabinet") || value.includes("wardrobe") || value.includes("vanity") || value.includes("counter")) return "Cabinetry";
  if (value.includes("paint") || value.includes("primer") || value.includes("skimcoat") || value.includes("putty") || value.includes("wallpaper") || value.includes("panel")) return "Wall Paints / Interior Finishes";
  if (value.includes("chandelier") || value.includes("lighting") || value.includes("light") || value.includes("downlight") || value.includes("switch") || value.includes("outlet")) return "Lighting / Electrical Fixtures";
  if (value.includes("closet") || value.includes("lavatory") || value.includes("faucet") || value.includes("shower") || value.includes("sink") || value.includes("drain") || value.includes("valve") || value.includes("hose") || value.includes("trap")) return "Plumbing Fixtures";
  return "General";
}

function inferImageUrl(material: string, category: string) {
  if (fallbackComponentImages[category]) return fallbackComponentImages[category];
  const value = material.toLowerCase();
  if (value.includes("paint") || value.includes("skimcoat") || value.includes("wallpaper")) return fallbackComponentImages["Wall Paints / Interior Finishes"];
  if (value.includes("light") || value.includes("switch") || value.includes("outlet") || value.includes("led")) return fallbackComponentImages["Lighting / Electrical Fixtures"];
  if (value.includes("closet") || value.includes("lavatory") || value.includes("vanity") || value.includes("sink")) return fallbackComponentImages["Plumbing Fixtures"];
  if (value.includes("tile") || value.includes("floor")) return fallbackComponentImages.Finishes;
  if (value.includes("wardrobe") || value.includes("cabinet")) return fallbackComponentImages.Cabinetry;
  return fallbackComponentImages.General;
}

function row(input: Omit<EstimateRowItem, "subTotal" | "totalItemCosts" | "category" | "pricingSource" | "pricingDate"> & Partial<Pick<EstimateRowItem, "category" | "pricingSource" | "pricingDate">>): EstimateRowItem {
  const subTotal = input.itemCost * input.quantity;
  const category = input.category ?? inferCategory(input.material);
  return {
    ...input,
    category,
    imageUrl: componentThumbnailUrls[input.id] ?? input.imageUrl ?? inferImageUrl(input.material, category),
    pricingSource: input.pricingSource ?? "Demo seed assumption — verify supplier quote before issuing",
    pricingDate: input.pricingDate ?? "2026-05-17",
    subTotal,
    totalItemCosts: subTotal + input.supplementaryCosts + input.laborCost,
  };
}

export const estimateLibraryItems: EstimateRowItem[] = [
  row({ id: "lib-sofa", material: "HEMLINGBY Loveseat", description: "IKEA Philippines loveseat, Knisa dark gray. Seeded from public IKEA PH sofa category pricing.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 7999, quantity: 1, supplementaryCosts: 0, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH sofa category page", pricingDate: "2026-05-17", imageUrl: "https://www.ikea.com/ph/en/images/products/hemlingby-loveseat-knisa-dark-gray__1013892_pe829504_s5.jpg" }),
  row({ id: "lib-accent-chair", material: "Mandaue Foam Accent Chair", description: "Philippine furniture-retail placeholder using mid-market accent-chair allowance; verify exact branch quote.", supplier: "Mandaue Foam", source: "library", unit: "pc", itemCost: 12500, quantity: 1, supplementaryCosts: 0, laborCost: 500, category: "Furniture", pricingSource: "Philippine retail allowance — supplier quote required", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-coffee-table", material: "IKEA Coffee Table", description: "Compact living-room coffee table allowance based on IKEA PH catalog range.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 3999, quantity: 1, supplementaryCosts: 0, laborCost: 500, category: "Furniture", pricingSource: "IKEA PH table category pricing range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-dining-table", material: "SANDSBERG Dining Table", description: "IKEA Philippines SANDSBERG table, black, 110 × 67 cm. Good low-cost dining-table benchmark.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2999, quantity: 1, supplementaryCosts: 2500, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH dining tables category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-dining-chair", material: "IKEA Dining Chair", description: "Loose dining chair allowance from IKEA PH seating range; confirm final model before issuing.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 1990, quantity: 1, supplementaryCosts: 0, laborCost: 250, category: "Furniture", pricingSource: "IKEA PH chairs category range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-queen-bed", material: "BRUKSVARA Bed Frame", description: "IKEA Philippines BRUKSVARA bed-frame benchmark; adjust size/model for actual bedroom spec.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 6999, quantity: 1, supplementaryCosts: 1500, laborCost: 1800, category: "Furniture", pricingSource: "IKEA PH beds category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-single-bed", material: "IKEA Single Bed Frame", description: "Single bed-frame allowance from IKEA PH bed category range.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 5999, quantity: 1, supplementaryCosts: 800, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH beds category range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-bedside-table", material: "IKEA Bedside Table", description: "Nightstand allowance from IKEA PH bedroom-storage/table catalog range.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2799, quantity: 1, supplementaryCosts: 0, laborCost: 250, category: "Furniture", pricingSource: "IKEA PH bedroom furniture range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-wardrobe", material: "KLEPPSTAD Wardrobe", description: "IKEA Philippines KLEPPSTAD wardrobe with 3 doors, white, 117 × 55 × 176 cm.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 8999, quantity: 1, supplementaryCosts: 0, laborCost: 2200, category: "Cabinetry", pricingSource: "IKEA PH wardrobes category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-vanity", material: "Pozzi Vanity Cabinet Allowance", description: "Bathroom vanity allowance using Philippine bath-retail brand context; verify model through Wilcon/branch quote.", supplier: "Wilcon Depot / Pozzi", source: "library", unit: "set", itemCost: 32000, quantity: 1, supplementaryCosts: 2500, laborCost: 4500, category: "Plumbing Fixtures", pricingSource: "Wilcon Depot brand availability + demo allowance", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-porcelain-tile", material: "Mariwasa 600 × 600 Porcelain Tile", description: "Philippine tile-brand floor finish allowance; confirm exact series, finish, and per-sqm quote before issuing.", supplier: "Wilcon Depot / Mariwasa", source: "supplier", unit: "sqm", itemCost: 950, quantity: 1, supplementaryCosts: 0, laborCost: 350, category: "Finishes", pricingSource: "Wilcon/Mariwasa retail allowance — quote required", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80" }),

  row({ id: "lib-boysen-permacoat-4l", material: "Boysen Permacoat Latex Paint, Semi-Gloss White, 4L", description: "Interior/exterior acrylic latex finish paint for plastered walls and ceilings; final color and coverage to be verified by painter schedule.", supplier: "Pacific Paint / Boysen Philippines", source: "supplier", unit: "gal", itemCost: 980, quantity: 1, supplementaryCosts: 0, laborCost: 450, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine retail allowance based on Boysen Permacoat 4L availability — verify current depot quote", pricingDate: "2026-05-17", imageUrl: "https://www.boysen.com.ph/wp-content/uploads/2021/03/Permacoat-Latex.jpg" }),
  row({ id: "lib-boysen-permacoat-16l", material: "Boysen Permacoat Latex Paint, Semi-Gloss White, 16L", description: "Pail-size finish paint benchmark for larger interior wall areas; useful for room-level quantity estimates.", supplier: "Pacific Paint / Boysen Philippines", source: "supplier", unit: "pail", itemCost: 3450, quantity: 1, supplementaryCosts: 0, laborCost: 1600, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine retail allowance based on Boysen Permacoat 16L availability — verify current depot quote", pricingDate: "2026-05-17", imageUrl: "https://www.boysen.com.ph/wp-content/uploads/2021/03/Permacoat-Latex.jpg" }),
  row({ id: "lib-davies-megacryl-4l", material: "Davies Megacryl Latex Paint, White, 4L", description: "Acrylic latex paint allowance for interior/exterior concrete and masonry wall finishes.", supplier: "Davies Paints Philippines", source: "supplier", unit: "gal", itemCost: 950, quantity: 1, supplementaryCosts: 0, laborCost: 450, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine retail allowance based on Davies Megacryl 4L availability — verify supplier quote", pricingDate: "2026-05-17", imageUrl: "https://www.daviespaints.com.ph/wp-content/uploads/2020/06/Megacryl.png" }),
  row({ id: "lib-davies-biofresh-4l", material: "Davies Bio-Fresh+ Interior Paint, 4L", description: "Premium low-odor interior wall paint allowance for bedrooms and occupied spaces.", supplier: "Davies Paints Philippines", source: "supplier", unit: "gal", itemCost: 1450, quantity: 1, supplementaryCosts: 0, laborCost: 500, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine retail allowance for premium Davies interior paint — verify exact SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-rain-or-shine-latex-16l", material: "Rain or Shine Latex Paint, White, 16L", description: "Economy pail-size latex paint allowance for basic interior wall and ceiling repaint works.", supplier: "Rain or Shine Paints", source: "supplier", unit: "pail", itemCost: 2350, quantity: 1, supplementaryCosts: 0, laborCost: 1500, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine retail allowance based on economy latex paint pail pricing — verify supplier quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-masonry-primer-4l", material: "Concrete Wall Primer / Masonry Primer, White, 4L", description: "Primer/sealer coat for new plastered concrete or masonry wall surfaces before finish paint.", supplier: "Boysen / Davies / Common PH Retail", source: "supplier", unit: "gal", itemCost: 720, quantity: 1, supplementaryCosts: 0, laborCost: 350, category: "Wall Paints / Interior Finishes", pricingSource: "Common Philippine hardware/depot primer allowance — verify brand and quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-abc-skimcoat-20kg", material: "ABC Skimcoat, 20kg Bag", description: "Cementitious skimcoat for smoothing interior concrete walls before primer and paint.", supplier: "ABC Phil. / Wilcon Depot", source: "supplier", unit: "bag", itemCost: 360, quantity: 1, supplementaryCosts: 0, laborCost: 550, category: "Wall Paints / Interior Finishes", pricingSource: "Philippine hardware/depot skimcoat allowance — verify current quote", pricingDate: "2026-05-17", imageUrl: "https://abc.ph/wp-content/uploads/2020/11/skimcoat.jpg" }),
  row({ id: "lib-concrete-putty-4l", material: "Concrete Putty / Wall Filler, 4L", description: "Wall putty/filler for minor surface imperfections before primer and finish paint.", supplier: "Boysen / Davies / Common PH Retail", source: "supplier", unit: "gal", itemCost: 520, quantity: 1, supplementaryCosts: 0, laborCost: 350, category: "Wall Paints / Interior Finishes", pricingSource: "Common Philippine wall putty/filler retail allowance — verify supplier quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-vinyl-wallpaper", material: "Vinyl Wallpaper, Plain/Textured", description: "Decorative vinyl wallpaper material allowance for interior accent walls; pattern, roll size, waste, and adhesive vary by supplier.", supplier: "Wilcon Depot / CW Home Depot / Common PH Retail", source: "supplier", unit: "sqm", itemCost: 450, quantity: 1, supplementaryCosts: 0, laborCost: 220, category: "Wall Paints / Interior Finishes", pricingSource: "Allowance only — wallpaper varies widely by brand/pattern and requires supplier quote", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-pvc-marble-wall-panel", material: "PVC Marble Wall Panel, 3mm", description: "Decorative marble-look PVC wall cladding panel allowance for feature walls and dry interior areas.", supplier: "Home Depot PH / Wilcon Depot / Common PH Retail", source: "supplier", unit: "sqm", itemCost: 850, quantity: 1, supplementaryCosts: 0, laborCost: 300, category: "Wall Paints / Interior Finishes", pricingSource: "Imported/depot decorative PVC panel allowance — verify exact supplier and panel size", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-firefly-led-bulb-9w", material: "LED Bulb, 9W Daylight E27", description: "Standard screw-type LED bulb for residential ceiling or wall-mounted lamp holders.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 120, quantity: 1, supplementaryCosts: 0, laborCost: 120, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance for Firefly/Omni-class 9W LED bulb — verify current listing", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-panel-6w", material: "LED Panel Light, Recessed Round, 6W Daylight", description: "Small recessed LED downlight/panel light for toilets, corridors, and accent areas.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 280, quantity: 1, supplementaryCosts: 0, laborCost: 350, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify Firefly/Wilcon exact model", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-panel-12w", material: "LED Panel Light, Recessed Round, 12W Daylight", description: "Recessed round LED panel/downlight for residential ceilings and general room lighting.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 420, quantity: 1, supplementaryCosts: 0, laborCost: 400, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify Firefly/Wilcon exact model", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-downlight-18w", material: "LED Downlight, Recessed, 18W Daylight", description: "Higher-output recessed LED downlight for living areas, kitchens, offices, and commercial ceilings.", supplier: "Ace Hardware Philippines / Omni", source: "supplier", unit: "pc", itemCost: 650, quantity: 1, supplementaryCosts: 0, laborCost: 450, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance for Omni/Akari-class 18W downlight — verify exact SKU", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-tube-t8-18w", material: "LED Tube Light, T8, 18W, 4ft Daylight", description: "Four-foot LED T8 replacement for fluorescent fixtures, daylight color.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 280, quantity: 1, supplementaryCosts: 0, laborCost: 250, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify current Wilcon/Firefly listing", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-strip-5m", material: "LED Strip Light, 12V, Warm White, 5m Roll", description: "Flexible LED strip for cove lighting, shelves, counters, and indirect accent lighting.", supplier: "Wilcon Depot / Akari", source: "supplier", unit: "roll", itemCost: 650, quantity: 1, supplementaryCosts: 0, laborCost: 500, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify Akari/Wilcon exact model", pricingDate: "2026-05-17" }),
  row({ id: "lib-led-strip-driver-12v", material: "LED Strip Power Supply / Driver, 12V 5A", description: "12V DC driver/power supply for low-voltage LED strip installations.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 480, quantity: 1, supplementaryCosts: 0, laborCost: 250, category: "Electrical Fixtures", pricingSource: "Common Philippine electrical retail allowance — verify exact driver rating and supplier", pricingDate: "2026-05-17" }),
  row({ id: "lib-outdoor-floodlight-30w", material: "Outdoor LED Floodlight, 30W Daylight", description: "Weather-resistant LED floodlight for exterior walls, driveways, yards, and perimeter lighting.", supplier: "Ace Hardware Philippines / Omni", source: "supplier", unit: "pc", itemCost: 850, quantity: 1, supplementaryCosts: 0, laborCost: 600, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify IP rating and exact SKU", pricingDate: "2026-05-17" }),
  row({ id: "lib-panasonic-duplex-outlet", material: "Convenience Outlet, Duplex, Flush Type, White", description: "Flush-mounted duplex convenience outlet for standard residential electrical installations.", supplier: "Wilcon Depot / Panasonic", source: "supplier", unit: "pc", itemCost: 220, quantity: 1, supplementaryCosts: 0, laborCost: 180, category: "Electrical Fixtures", pricingSource: "Common Philippine retail allowance — verify current Panasonic/Wilcon listing", pricingDate: "2026-05-17" }),
  row({ id: "lib-light-switch-1gang", material: "Light Switch, 1-Gang 1-Way, Flush Type", description: "Single-gang one-way wall switch for one lighting circuit.", supplier: "Wilcon Depot / Panasonic", source: "supplier", unit: "pc", itemCost: 170, quantity: 1, supplementaryCosts: 0, laborCost: 160, category: "Electrical Fixtures", pricingSource: "Common Philippine retail allowance — verify exact plate/series quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-light-switch-2gang", material: "Light Switch, 2-Gang 1-Way, Flush Type", description: "Two-gang one-way wall switch for controlling two lighting circuits from one location.", supplier: "Wilcon Depot / Panasonic", source: "supplier", unit: "pc", itemCost: 260, quantity: 1, supplementaryCosts: 0, laborCost: 180, category: "Electrical Fixtures", pricingSource: "Common Philippine retail allowance — verify exact plate/series quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-weatherproof-outlet", material: "Weatherproof Convenience Outlet with Cover", description: "Outdoor-rated covered convenience outlet for balconies, service areas, garages, and exterior walls.", supplier: "Wilcon Depot / Panasonic", source: "supplier", unit: "pc", itemCost: 580, quantity: 1, supplementaryCosts: 0, laborCost: 280, category: "Electrical Fixtures", pricingSource: "Common Philippine retail allowance — verify weatherproof/IP rating and exact SKU", pricingDate: "2026-05-17" }),
  row({ id: "lib-pendant-light-basic", material: "Pendant Light Fixture, Single E27 Socket", description: "Basic single-socket pendant fixture for dining counters, accent lighting, or decorative residential use.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 750, quantity: 1, supplementaryCosts: 0, laborCost: 450, category: "Lighting Fixtures", pricingSource: "Decorative lighting allowance — verify exact model and supplier quote", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-emergency-light-twin", material: "Emergency Light, Twin Head LED, Rechargeable", description: "Rechargeable twin-head LED emergency light for backup illumination during power interruptions.", supplier: "Wilcon Depot / Firefly Electric", source: "supplier", unit: "pc", itemCost: 1850, quantity: 1, supplementaryCosts: 0, laborCost: 350, category: "Lighting Fixtures", pricingSource: "Common Philippine retail allowance — verify current Firefly/Wilcon listing", pricingDate: "2026-05-17" }),
  row({ id: "lib-american-standard-close-coupled-wc", material: "Water Closet, Close-Coupled, Dual Flush", description: "Mid-range ceramic close-coupled toilet set with tank, seat cover, and dual-flush fitting.", supplier: "Wilcon Depot / American Standard Philippines", source: "supplier", unit: "set", itemCost: 12500, quantity: 1, supplementaryCosts: 0, laborCost: 2500, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact Wilcon/American Standard SKU quote", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-hcg-one-piece-wc", material: "Water Closet, One-Piece, Dual Flush", description: "One-piece ceramic toilet with concealed-trap appearance and dual-flush tank for upgraded bathrooms.", supplier: "Wilcon Depot / HCG Philippines", source: "supplier", unit: "set", itemCost: 18500, quantity: 1, supplementaryCosts: 0, laborCost: 2800, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact Wilcon/HCG SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-wall-hung-lavatory", material: "Lavatory, Wall-Hung Ceramic Basin", description: "White ceramic wall-hung lavatory basin; excludes faucet, bottle trap, and angle valve unless bundled.", supplier: "CW Home Depot / TOTO Philippines", source: "supplier", unit: "pc", itemCost: 4800, quantity: 1, supplementaryCosts: 0, laborCost: 1200, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact CW Home Depot/TOTO SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-countertop-lavatory", material: "Countertop Lavatory Basin, Ceramic", description: "White ceramic vessel/countertop lavatory basin for vanity counter installation; faucet and drain fittings excluded.", supplier: "Wilcon Depot / American Standard Philippines", source: "supplier", unit: "pc", itemCost: 7200, quantity: 1, supplementaryCosts: 0, laborCost: 1300, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact American Standard SKU quote", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-grohe-lavatory-faucet", material: "Single-Lever Lavatory Faucet", description: "Chrome deck-mounted basin mixer faucet for standard lavatory installation.", supplier: "Wilcon Depot / Grohe", source: "supplier", unit: "pc", itemCost: 6200, quantity: 1, supplementaryCosts: 0, laborCost: 800, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact Wilcon/Grohe SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-rain-shower-set", material: "Rain Shower Set with Mixer", description: "Wall-mounted rain shower column with mixer, overhead shower, and hand shower.", supplier: "Wilcon Depot / HCG Philippines", source: "supplier", unit: "set", itemCost: 9500, quantity: 1, supplementaryCosts: 0, laborCost: 1800, category: "Plumbing Fixtures", pricingSource: "PH retail/brand allowance — verify exact shower-set SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-franke-single-bowl-sink", material: "Stainless Steel Kitchen Sink, Single Bowl", description: "Stainless steel single-bowl kitchen sink, top-mount or undermount depending on selected model; faucet excluded.", supplier: "Wilcon Depot / Franke Philippines", source: "supplier", unit: "pc", itemCost: 6800, quantity: 1, supplementaryCosts: 0, laborCost: 1500, category: "Kitchen Fixtures", pricingSource: "PH retail/brand allowance — verify exact Wilcon/Franke SKU quote", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80" }),
  row({ id: "lib-franke-double-bowl-sink", material: "Stainless Steel Kitchen Sink, Double Bowl", description: "Stainless steel double-bowl kitchen sink for residential kitchen counter; strainer and waste fittings depend on SKU.", supplier: "Wilcon Depot / Franke Philippines", source: "supplier", unit: "pc", itemCost: 12500, quantity: 1, supplementaryCosts: 0, laborCost: 1800, category: "Kitchen Fixtures", pricingSource: "PH retail/brand allowance — verify exact Wilcon/Franke SKU quote", pricingDate: "2026-05-17" }),
  row({ id: "lib-ikea-kitchen-mixer", material: "Kitchen Mixer Tap, Single-Lever", description: "Single-lever kitchen mixer faucet in chrome or stainless finish for modular kitchen installation.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 4200, quantity: 1, supplementaryCosts: 0, laborCost: 900, category: "Kitchen Fixtures", pricingSource: "IKEA Philippines kitchen mixer range allowance — verify current SKU price", pricingDate: "2026-05-17" }),
  row({ id: "lib-stainless-floor-drain", material: "Stainless Steel Floor Drain, 100 × 100mm", description: "Square stainless steel bathroom or balcony floor drain with removable grate.", supplier: "CW Home Depot / Local PH Supplier", source: "supplier", unit: "pc", itemCost: 450, quantity: 1, supplementaryCosts: 0, laborCost: 250, category: "Plumbing Fixtures", pricingSource: "Common Philippine hardware retail allowance — verify exact SKU locally", pricingDate: "2026-05-17" }),
  row({ id: "lib-brass-angle-valve", material: "Brass Angle Valve, Chrome Plated", description: "Chrome-plated brass angle valve for lavatory, water closet, or kitchen sink connection.", supplier: "Wilcon Depot / Local PH Supplier", source: "supplier", unit: "pc", itemCost: 380, quantity: 1, supplementaryCosts: 0, laborCost: 180, category: "Plumbing Fixtures", pricingSource: "Common Philippine hardware retail allowance — verify exact SKU locally", pricingDate: "2026-05-17" }),
  row({ id: "lib-braided-flexible-hose", material: "Flexible Braided Hose, Stainless Steel, 1/2in", description: "Stainless braided flexible water connector for faucet or toilet supply connection.", supplier: "Wilcon Depot / Local PH Supplier", source: "supplier", unit: "pc", itemCost: 220, quantity: 1, supplementaryCosts: 0, laborCost: 120, category: "Plumbing Fixtures", pricingSource: "Common Philippine hardware retail allowance — verify exact SKU locally", pricingDate: "2026-05-17" }),
  row({ id: "lib-outdoor-lounge", material: "Outdoor Lounge Set", description: "Weather-resistant roof deck lounge-set allowance from Philippine outdoor-furniture retail range.", supplier: "Our Home / Dimensione", source: "library", unit: "set", itemCost: 45000, quantity: 1, supplementaryCosts: 3000, laborCost: 1200, category: "Outdoor", pricingSource: "Philippine retail allowance — supplier quote required", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80" }),

  row({ id: "lib-mariwasa-ceramic-floor-tile-400", material: "Mariwasa Ceramic Floor Tile, 400 × 400mm", description: "Locally available ceramic floor tile benchmark for bedrooms, service areas, and light residential floors; verify series, shade, slip rating, and carton coverage.", supplier: "Mariwasa / Wilcon Depot / PH tile dealers", source: "supplier", unit: "sqm", itemCost: 620, quantity: 1, supplementaryCosts: 0, laborCost: 320, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "ceramic tile", "mariwasa", "philippines"], pricingSource: "Mariwasa Philippines brand availability + Philippine depot allowance — verify exact SKU quote", pricingDate: "2026-05-18", sourceUrl: "https://www.mariwasa.com/" }),
  row({ id: "lib-mariwasa-porcelain-matte-600", material: "Mariwasa Matte Porcelain Floor Tile, 600 × 600mm", description: "Matte porcelain tile allowance for living/dining/kitchen floors where larger-format local tile is specified; final price depends on collection and finish.", supplier: "Mariwasa / Wilcon Depot / PH tile dealers", source: "supplier", unit: "sqm", itemCost: 950, quantity: 1, supplementaryCosts: 0, laborCost: 380, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "porcelain tile", "mariwasa", "matte"], pricingSource: "Mariwasa Philippines availability + PH retail allowance — supplier quote required", pricingDate: "2026-05-18", sourceUrl: "https://www.mariwasa.com/" }),
  row({ id: "lib-floor-center-wood-look-tile", material: "Floor Center Wood-Look Porcelain Tile", description: "Wood-look porcelain plank tile for bedrooms, living areas, or condo fit-outs needing timber appearance with tile durability.", supplier: "Floor Center", source: "supplier", unit: "sqm", itemCost: 1150, quantity: 1, supplementaryCosts: 0, laborCost: 420, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "wood-look tile", "floor center"], pricingSource: "Floor Center Philippines catalog availability + demo allowance — verify current quote", pricingDate: "2026-05-18", sourceUrl: "https://floorcenter.com/" }),
  row({ id: "lib-floor-center-homogeneous-tile", material: "Floor Center Homogeneous Tile, 600 × 600mm", description: "Durable homogeneous tile allowance for higher-traffic interior floors, corridors, and small commercial spaces.", supplier: "Floor Center", source: "supplier", unit: "sqm", itemCost: 1350, quantity: 1, supplementaryCosts: 0, laborCost: 450, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "homogeneous tile", "floor center"], pricingSource: "Floor Center Philippines availability + demo allowance — verify current quote", pricingDate: "2026-05-18", sourceUrl: "https://floorcenter.com/" }),
  row({ id: "lib-niro-granite-porcelain-slab", material: "Niro Granite Large-Format Porcelain Tile", description: "Large-format porcelain/stone-look floor or wall finish allowance for premium interiors; handling, waste, and installer capability must be confirmed.", supplier: "Niro Granite Philippines / tile dealers", source: "supplier", unit: "sqm", itemCost: 2200, quantity: 1, supplementaryCosts: 0, laborCost: 650, category: "Finishes", discipline: "Architectural", designation: "Floor / Wall Finish", tags: ["flooring", "porcelain", "large format", "niro granite"], pricingSource: "Niro Granite Philippines presence + premium tile allowance — verify exact collection quote", pricingDate: "2026-05-18", sourceUrl: "https://nirogranite.com/" }),
  row({ id: "lib-eurotiles-anti-slip-tile", material: "Eurotiles Anti-Slip Outdoor Floor Tile", description: "Anti-slip ceramic/porcelain tile allowance for balconies, toilets, service areas, and semi-outdoor floors; confirm slip rating for wet areas.", supplier: "Eurotiles / PH tile dealers", source: "supplier", unit: "sqm", itemCost: 780, quantity: 1, supplementaryCosts: 0, laborCost: 380, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "anti-slip", "outdoor tile", "eurotiles"], pricingSource: "Philippine tile brand/dealer allowance — verify Eurotiles/current supplier quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-kent-vinyl-floor-tile", material: "Kent Vinyl Floor Tile", description: "Vinyl composition tile allowance for economical residential or light commercial flooring; confirm color, thickness, adhesive, and subfloor prep.", supplier: "Kent Vinyl Tiles / PH hardware dealers", source: "supplier", unit: "sqm", itemCost: 520, quantity: 1, supplementaryCosts: 0, laborCost: 240, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "vinyl tile", "kent"], pricingSource: "Common Philippine vinyl tile brand/dealer allowance — supplier quote required", pricingDate: "2026-05-18" }),
  row({ id: "lib-apo-vinyl-roll-flooring", material: "APO Vinyl Roll Flooring", description: "Sheet vinyl/roll flooring allowance for rental, utility, or budget interior areas; includes material only, with seams and adhesive verified per room.", supplier: "APO Floors / PH flooring dealers", source: "supplier", unit: "sqm", itemCost: 680, quantity: 1, supplementaryCosts: 0, laborCost: 260, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "vinyl roll", "sheet vinyl", "apo"], pricingSource: "PH vinyl flooring dealer allowance — verify APO/current supplier quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-matimco-engineered-wood-floor", material: "Matimco Engineered Wood Flooring", description: "Philippine wood-products brand allowance for engineered wood planks in bedrooms or living areas; verify species, plank size, finish, and moisture conditions.", supplier: "Matimco", source: "supplier", unit: "sqm", itemCost: 3800, quantity: 1, supplementaryCosts: 0, laborCost: 750, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "engineered wood", "matimco"], pricingSource: "Matimco Philippines brand/product availability + premium allowance — verify quote", pricingDate: "2026-05-18", sourceUrl: "https://www.matimco.com/" }),
  row({ id: "lib-hornitex-laminate-flooring", material: "Hornitex Laminate Wood Flooring", description: "Laminate flooring allowance commonly distributed in Philippine fit-out channels; confirm AC rating, underlayment, transition strips, and moisture suitability.", supplier: "Hornitex / PH flooring dealers", source: "supplier", unit: "sqm", itemCost: 1450, quantity: 1, supplementaryCosts: 0, laborCost: 420, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "laminate", "wood look", "hornitex"], pricingSource: "Philippine flooring dealer allowance — verify exact Hornitex quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-bamboo-flooring-plank", material: "Bamboo Flooring Plank", description: "Bamboo plank flooring allowance for warm interior finish schemes; confirm supplier stock, board construction, finish, and humidity warranty.", supplier: "PH wood/flooring dealers", source: "supplier", unit: "sqm", itemCost: 2600, quantity: 1, supplementaryCosts: 0, laborCost: 650, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "bamboo", "wood"], pricingSource: "Philippine specialty flooring allowance — supplier quote required", pricingDate: "2026-05-18" }),
  row({ id: "lib-machuca-cement-tile", material: "Machuca Pattern Cement Tile", description: "Decorative handmade cement tile allowance for feature floors, powder rooms, or accent areas; pattern, sealing, and lead time must be verified.", supplier: "Machuca Tile / PH tile dealers", source: "supplier", unit: "sqm", itemCost: 3200, quantity: 1, supplementaryCosts: 0, laborCost: 650, category: "Finishes", discipline: "Architectural", designation: "Floor / Accent Finish", tags: ["flooring", "cement tile", "machuca", "pattern tile"], pricingSource: "Machuca-style Philippine cement tile allowance — verify direct supplier quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-granite-floor-tile-local", material: "Polished Granite Floor Tile", description: "Natural granite tile allowance for stairs, lobbies, thresholds, and premium floor zones; exact stone, thickness, and finish drive pricing.", supplier: "Wilcon Depot / PH stone and tile suppliers", source: "supplier", unit: "sqm", itemCost: 2800, quantity: 1, supplementaryCosts: 0, laborCost: 700, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "granite", "stone"], pricingSource: "Philippine stone/tile retail allowance — verify exact stone quote", pricingDate: "2026-05-18", sourceUrl: "https://www.wilcon.com.ph/" }),
  row({ id: "lib-pebble-washout-floor", material: "Pebble Washout Floor Finish", description: "Textured pebble washout finish allowance for carports, walkways, garden paths, and wet exterior zones; aggregate color and sealer to be specified.", supplier: "Local PH contractor / aggregate supplier", source: "supplier", unit: "sqm", itemCost: 950, quantity: 1, supplementaryCosts: 0, laborCost: 520, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "pebble washout", "outdoor", "textured"], pricingSource: "Local contractor allowance — verify site and aggregate quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-polished-concrete-finish", material: "Polished Concrete Floor Finish", description: "Polished concrete finishing allowance for slab-on-grade interiors; final cost depends on slab condition, grinding stages, densifier, and sealer.", supplier: "Local PH specialty flooring contractor", source: "supplier", unit: "sqm", itemCost: 1800, quantity: 1, supplementaryCosts: 0, laborCost: 900, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "polished concrete", "specialty finish"], pricingSource: "Philippine specialty contractor allowance — site inspection and quote required", pricingDate: "2026-05-18" }),
  row({ id: "lib-epoxy-floor-coating", material: "Epoxy Floor Coating System", description: "Two-part epoxy floor coating allowance for garages, kitchens, utility rooms, or back-of-house spaces; substrate prep and moisture testing required.", supplier: "Boysen / Davies / PH specialty coating contractor", source: "supplier", unit: "sqm", itemCost: 1650, quantity: 1, supplementaryCosts: 0, laborCost: 850, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "epoxy", "coating", "garage"], pricingSource: "Philippine coating brand/contractor allowance — verify product system and quote", pricingDate: "2026-05-18" }),
  row({ id: "lib-carpet-tile-modular", material: "Modular Carpet Tile", description: "Commercial carpet tile allowance for office, AV, or bedroom accent areas; confirm tile size, pile, backing, adhesive, and attic stock.", supplier: "Wilcon Depot / PH interior flooring dealers", source: "supplier", unit: "sqm", itemCost: 1250, quantity: 1, supplementaryCosts: 0, laborCost: 380, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", tags: ["flooring", "carpet tile", "modular"], pricingSource: "Philippine carpet/flooring dealer allowance — supplier quote required", pricingDate: "2026-05-18", sourceUrl: "https://www.wilcon.com.ph/" }),
  row({ id: "lib-wood-plastic-composite-deck", material: "Wood-Plastic Composite Decking Board", description: "WPC decking allowance for balconies, roof decks, and outdoor lounge areas; confirm board profile, clips, subframe, UV warranty, and drainage.", supplier: "Wilcon Depot / PH outdoor decking suppliers", source: "supplier", unit: "sqm", itemCost: 3600, quantity: 1, supplementaryCosts: 0, laborCost: 900, category: "Outdoor", discipline: "Architectural", designation: "Floor / Deck Finish", tags: ["flooring", "decking", "wpc", "outdoor"], pricingSource: "Philippine WPC decking supplier allowance — verify system quote", pricingDate: "2026-05-18", sourceUrl: "https://www.wilcon.com.ph/" }),
];

export const sampleEstimateTree: EstimateAreaNode[] = [
  {
    id: "lot-primary-residence",
    name: "Lot A — Primary Residence",
    kind: "group",
    total: "₱0.00",
    children: [
      {
        id: "general-requirements",
        name: "General Requirements",
        kind: "group",
        total: "₱0.00",
        children: [],
      },
      {
        id: "site-works",
        name: "Site Works",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "site-works-front-yard",
            name: "Front Yard",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "front-yard-pebble-washout", material: "Pebble Washout Floor Finish", description: "Site works hardscape allowance for front yard finish.", supplier: "Local PH contractor / aggregate supplier", source: "supplier", unit: "sqm", itemCost: 950, quantity: 36, supplementaryCosts: 2500, laborCost: 5200, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Local contractor allowance — verify site and aggregate quote", pricingDate: "2026-05-18" }),
            ],
          },
        ],
      },
      {
        id: "main-house",
    name: "Main House",
    kind: "group",
    total: "₱0.00",
    children: [
      {
        id: "main-house-ground-floor",
        name: "Ground Floor",
        kind: "group",
        total: "₱0.00",
        children: [
          { id: "foyer", name: "Foyer", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "foyer-porcelain-entry-tile", material: "Porcelain Entry Floor Tile", description: "Slip-resistant 600 × 600 mm porcelain tile for foyer floor finish.", supplier: "Tile Works", source: "supplier", unit: "sqm", itemCost: 1180, quantity: 18, supplementaryCosts: 0, laborCost: 4200, imageUrl: "https://images.thdstatic.com/productImages/da56c8f7-abcd-4125-b9b5-96749c8de526/svn/pietra-gray-daltile-porcelain-tile-ar70rct1224pl-e1_600.jpg" }),
            row({ id: "foyer-console-table", material: "Entry Console Table", description: "Slim console table with delivery and placement allowance.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 24000, quantity: 1, supplementaryCosts: 0, laborCost: 600 }),
          ] },
          { id: "living-area", name: "Living Area", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "living-hardwood-oak-flooring", material: "Hardwood Oak Flooring", description: "Engineered oak flooring with underlayment and installation allowance.", supplier: "Elegant Floors Inc.", source: "supplier", unit: "sqm", itemCost: 1200, quantity: 48, supplementaryCosts: 12000, laborCost: 18000, imageUrl: "https://thumbor.forbes.com/thumbor/fit-in/900x510/https://www.forbes.com/home-improvement/wp-content/uploads/2023/05/solid-oak-flooring.jpeg-1-e1684409736918.jpg" }),
            row({ id: "living-sofa", material: "HEMLINGBY Loveseat", description: "IKEA Philippines loveseat benchmark linked from the component library.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 7999, quantity: 1, supplementaryCosts: 0, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH sofa category page", pricingDate: "2026-05-17", imageUrl: "https://www.ikea.com/ph/en/images/products/hemlingby-loveseat-knisa-dark-gray__1013892_pe829504_s5.jpg" }),
            row({ id: "living-accent-chairs", material: "Accent Lounge Chair", description: "Pair of lounge chairs for the living area.", supplier: "Fine Furniture Co.", source: "library", unit: "pc", itemCost: 18500, quantity: 2, supplementaryCosts: 0, laborCost: 800, imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "living-coffee-table", material: "Coffee Table", description: "Low center table for the living area.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 22000, quantity: 1, supplementaryCosts: 0, laborCost: 500, imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "dining-area", name: "Dining Area", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "dining-table", material: "SANDSBERG Dining Table", description: "IKEA Philippines table benchmark; replace with final six-seat model when specified.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2999, quantity: 1, supplementaryCosts: 2500, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH dining tables category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "dining-chairs", material: "IKEA Dining Chair", description: "Six loose dining chairs using IKEA PH seating allowance.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 1990, quantity: 6, supplementaryCosts: 0, laborCost: 1200, category: "Furniture", pricingSource: "IKEA PH chairs category range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "dining-chandelier", material: "Dining Chandelier", description: "Decorative suspended fixture with mounting accessories.", supplier: "Lighting Studio", source: "library", unit: "pc", itemCost: 32000, quantity: 1, supplementaryCosts: 1800, laborCost: 3500, imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz1Wos0qnYPhj44fAr3ZVOiZm0Ro2np2h25A&usqp=CAU" }),
          ] },
          { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "kitchen-quartz-countertop", material: "Quartz Countertop Slab", description: "20 mm quartz countertop with eased edges and sink cutout.", supplier: "StoneMasters Countertops", source: "library", unit: "lm", itemCost: 8500, quantity: 7.2, supplementaryCosts: 6500, laborCost: 8500 }),
            row({ id: "kitchen-base-cabinets", material: "Base Cabinet Modules", description: "Modular base cabinets with soft-close hardware.", supplier: "Cabinetry Works", source: "supplier", unit: "lm", itemCost: 14500, quantity: 6.4, supplementaryCosts: 4800, laborCost: 16000 }),
          ] },
          { id: "powder-room", name: "Powder Room", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "powder-vanity", material: "Bathroom Vanity", description: "Compact vanity with basin and faucet allowance.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 36000, quantity: 1, supplementaryCosts: 1500, laborCost: 4500, imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "powder-wall-tile", material: "Accent Wall Tile", description: "Powder room feature wall tile with installation allowance.", supplier: "Tile Works", source: "supplier", unit: "sqm", itemCost: 1650, quantity: 12, supplementaryCosts: 1200, laborCost: 4200 }),
          ] },
        ],
      },
      {
        id: "main-house-second-floor",
        name: "Second Floor",
        kind: "group",
        total: "₱0.00",
        children: [
          { id: "primary-bedroom", name: "Primary Bedroom", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "primary-queen-bed", material: "BRUKSVARA Bed Frame", description: "IKEA Philippines bed-frame benchmark; adjust size/model for final selection.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 6999, quantity: 1, supplementaryCosts: 1500, laborCost: 1800, category: "Furniture", pricingSource: "IKEA PH beds category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "primary-bedside-tables", material: "Bedside Table", description: "Pair of bedside tables for primary bedroom.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 9500, quantity: 2, supplementaryCosts: 0, laborCost: 500 }),
          ] },
          { id: "walk-in-closet", name: "Walk-in Closet", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "wic-modular-wardrobe", material: "Modular Wardrobe", description: "Full-height wardrobe modules with hanging rods and drawers.", supplier: "Cabinetry Works", source: "library", unit: "lm", itemCost: 18500, quantity: 8.5, supplementaryCosts: 5500, laborCost: 18000, imageUrl: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "primary-bath", name: "Primary Toilet + Bath", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "primary-bath-vanity", material: "Bathroom Vanity", description: "Double vanity with stone counter and basin allowance.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 68000, quantity: 1, supplementaryCosts: 2500, laborCost: 6500, imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "bedroom-2", name: "Bedroom 2", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "bedroom-2-single-bed", material: "Single Bed Frame", description: "Single bed frame for secondary bedroom.", supplier: "Project Library", source: "library", unit: "set", itemCost: 26000, quantity: 1, supplementaryCosts: 800, laborCost: 1200, imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "bedroom-2-study-desk", material: "Study Desk", description: "Compact study desk with cable grommet.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 18500, quantity: 1, supplementaryCosts: 0, laborCost: 600 }),
          ] },
          { id: "bedroom-3", name: "Bedroom 3", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "bedroom-3-single-bed", material: "Single Bed Frame", description: "Single bed frame for guest bedroom.", supplier: "Project Library", source: "library", unit: "set", itemCost: 26000, quantity: 1, supplementaryCosts: 800, laborCost: 1200, imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "bedroom-3-wardrobe", material: "Modular Wardrobe", description: "Bedroom wardrobe modules with shelves and hanging space.", supplier: "Cabinetry Works", source: "library", unit: "lm", itemCost: 18500, quantity: 3.2, supplementaryCosts: 1800, laborCost: 7200 }),
          ] },
          { id: "family-hall", name: "Family Hall", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "family-hall-sofa", material: "Two-seat Sofa", description: "Compact family hall sofa.", supplier: "Fine Furniture Co.", source: "library", unit: "pc", itemCost: 42000, quantity: 1, supplementaryCosts: 0, laborCost: 800 }),
          ] },
        ],
      },
      {
        id: "roof-deck",
        name: "Roof Deck",
        kind: "group",
        total: "₱0.00",
        children: [
          { id: "roof-lounge", name: "Lounge", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-outdoor-lounge", material: "Outdoor Lounge Set", description: "Weather-resistant roof deck lounge set with cushions.", supplier: "Outdoor Living PH", source: "library", unit: "set", itemCost: 76000, quantity: 1, supplementaryCosts: 3000, laborCost: 1200, imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80" })] },
          { id: "bar-counter", name: "Bar Counter", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-bar-counter", material: "Outdoor Bar Counter", description: "Built-in bar counter with stone top and weather-resistant base.", supplier: "Cabinetry Works", source: "project", unit: "lm", itemCost: 22000, quantity: 3.6, supplementaryCosts: 4800, laborCost: 12000 })] },
          { id: "roof-toilet", name: "Toilet", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-toilet-vanity", material: "Bathroom Vanity", description: "Roof deck toilet vanity with compact basin.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 32000, quantity: 1, supplementaryCosts: 1200, laborCost: 4200 })] },
        ],
      },
    ],
  },
    ],
  },
  {
    id: "lot-site-works",
    name: "Lot B — External Works",
    kind: "group",
    total: "₱0.00",
    children: [
      {
        id: "front-yard",
        name: "Front Yard",
        kind: "area",
        total: "₱0.00",
        estimateRowItems: [
          row({ id: "front-yard-pebble-washout", material: "Pebble Washout Floor Finish", description: "Direct lot-level area allowance for front yard hardscape finish.", supplier: "Local PH contractor / aggregate supplier", source: "supplier", unit: "sqm", itemCost: 950, quantity: 36, supplementaryCosts: 2500, laborCost: 5200, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Local contractor allowance — verify site and aggregate quote", pricingDate: "2026-05-18" }),
        ],
      },
      {
        id: "gatehouse",
        name: "Gatehouse",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "gatehouse-interior",
            name: "Gatehouse Interior",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "gatehouse-epoxy-floor", material: "Epoxy Floor Coating System", description: "Small gatehouse floor coating allowance.", supplier: "Boysen / Davies / PH specialty coating contractor", source: "supplier", unit: "sqm", itemCost: 1650, quantity: 8, supplementaryCosts: 0, laborCost: 1200, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Philippine coating brand/contractor allowance — verify product system and quote", pricingDate: "2026-05-18" }),
            ],
          },
        ],
      },
    ],
  },
];

export function flattenVisibleNodes(nodes: EstimateAreaNode[], expandedIds: Set<string>, depth = 0, parentPath: string[] = []): FlatEstimateAreaNode[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.name];
    return [
      { ...node, depth, path },
      ...(node.children?.length && expandedIds.has(node.id) ? flattenVisibleNodes(node.children, expandedIds, depth + 1, path) : []),
    ];
  });
}

export function getExpandedNodeIds(nodes: EstimateAreaNode[]) {
  const ids = new Set<string>();

  function visit(node: EstimateAreaNode) {
    ids.add(node.id);
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return ids;
}

export function findEstimateNode(nodes: EstimateAreaNode[], id: string): EstimateAreaNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findEstimateNode(node.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}

export function validateEstimateTreeHierarchy(nodes: EstimateAreaNode[]) {
  const errors: string[] = [];

  function visit(node: EstimateAreaNode, path: string[]) {
    const nodePath = [...path, node.name];
    if (node.kind !== "area" && node.estimateRowItems?.length) {
      errors.push(`${nodePath.join(" > ")} is a Group Node but contains estimate row items`);
    }
    node.children?.forEach((child) => visit(child, nodePath));
  }

  nodes.forEach((node) => visit(node, []));
  return errors;
}
