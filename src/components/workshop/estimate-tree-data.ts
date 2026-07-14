import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { getLocalComponentImageFallback } from "./component-image-fallbacks";

export type { EstimateRowItem, EstimateRowItemSource, EstimateTreeNode, FlatEstimateTreeNode } from "@/lib/estimates/types";

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
  return getLocalComponentImageFallback({ material, category });
}

function row(input: Omit<EstimateRowItem, "subTotal" | "totalItemCosts" | "category" | "pricingSource" | "pricingDate"> & Partial<Pick<EstimateRowItem, "category" | "pricingSource" | "pricingDate">>): EstimateRowItem {
  const subTotal = input.itemCost * input.quantity;
  const quantityBase = input.quantityBase ?? null;
  const contingencyPercentage = quantityBase === null
    ? 0
    : quantityBase > 0 ? ((input.quantityContingencyAmount ?? 0) / quantityBase) * 100 : 0;
  const contingencyValue = 0;
  const adjustmentPercentage = input.adjustmentPercentage ?? (quantityBase === null ? input.contingencyPercentage ?? 0 : 0);
  const adjustmentValue = (subTotal * adjustmentPercentage) / 100;
  const category = input.category ?? inferCategory(input.material);
  return {
    ...input,
    category,
    imageUrl: componentThumbnailUrls[input.id] ?? input.imageUrl ?? inferImageUrl(input.material, category),
    pricingSource: input.pricingSource ?? "Demo seed assumption — verify supplier quote before issuing",
    pricingDate: input.pricingDate ?? "2026-05-17",
    subTotal,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    totalItemCosts: subTotal + input.miscCost + contingencyValue + adjustmentValue,
  };
}

export const sampleEstimateTree: EstimateTreeNode[] = [
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
              row({ id: "front-yard-pebble-washout", material: "Pebble Washout Floor Finish", description: "Site works hardscape allowance for front yard finish.", supplier: "Local PH contractor / aggregate supplier", source: "supplier", unit: "sqm", itemCost: 950, quantity: 36, miscCost: 7700, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Local contractor allowance — verify site and aggregate quote", pricingDate: "2026-05-18" }),
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
            row({ id: "foyer-porcelain-entry-tile", material: "Porcelain Entry Floor Tile", description: "Slip-resistant 600 × 600 mm porcelain tile for foyer floor finish.", supplier: "Tile Works", source: "supplier", unit: "sqm", itemCost: 1180, quantity: 18, miscCost: 4200, imageUrl: "https://images.thdstatic.com/productImages/da56c8f7-abcd-4125-b9b5-96749c8de526/svn/pietra-gray-daltile-porcelain-tile-ar70rct1224pl-e1_600.jpg" }),
            row({ id: "foyer-console-table", material: "Entry Console Table", description: "Slim console table with delivery and placement allowance.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 24000, quantity: 1, miscCost: 600 }),
          ] },
          { id: "living-area", name: "Living Area", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "living-hardwood-oak-flooring", material: "Hardwood Oak Flooring", description: "Engineered oak flooring with underlayment and installation allowance.", supplier: "Elegant Floors Inc.", source: "supplier", unit: "sqm", itemCost: 1200, quantity: 48, miscCost: 30000, imageUrl: "https://thumbor.forbes.com/thumbor/fit-in/900x510/https://www.forbes.com/home-improvement/wp-content/uploads/2023/05/solid-oak-flooring.jpeg-1-e1684409736918.jpg" }),
            row({ id: "living-sofa", material: "HEMLINGBY Loveseat", description: "IKEA Philippines loveseat benchmark linked from the component library.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 7999, quantity: 1, miscCost: 1200, category: "Furniture", pricingSource: "IKEA PH sofa category page", pricingDate: "2026-05-17", imageUrl: "https://www.ikea.com/ph/en/images/products/hemlingby-loveseat-knisa-dark-gray__1013892_pe829504_s5.jpg" }),
            row({ id: "living-accent-chairs", material: "Accent Lounge Chair", description: "Pair of lounge chairs for the living area.", supplier: "Fine Furniture Co.", source: "library", unit: "pc", itemCost: 18500, quantity: 2, miscCost: 800, imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "living-coffee-table", material: "Coffee Table", description: "Low center table for the living area.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 22000, quantity: 1, miscCost: 500, imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "dining-area", name: "Dining Area", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "dining-table", material: "SANDSBERG Dining Table", description: "IKEA Philippines table benchmark; replace with final six-seat model when specified.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2999, quantity: 1, miscCost: 3700, category: "Furniture", pricingSource: "IKEA PH dining tables category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "dining-chairs", material: "IKEA Dining Chair", description: "Six loose dining chairs using IKEA PH seating allowance.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 1990, quantity: 6, miscCost: 1200, category: "Furniture", pricingSource: "IKEA PH chairs category range", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "dining-chandelier", material: "Dining Chandelier", description: "Decorative suspended fixture with mounting accessories.", supplier: "Lighting Studio", source: "library", unit: "pc", itemCost: 32000, quantity: 1, miscCost: 5300, imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz1Wos0qnYPhj44fAr3ZVOiZm0Ro2np2h25A&usqp=CAU" }),
          ] },
          { id: "kitchen", name: "Kitchen", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "kitchen-quartz-countertop", material: "Quartz Countertop Slab", description: "20 mm quartz countertop with eased edges and sink cutout.", supplier: "StoneMasters Countertops", source: "library", unit: "lm", itemCost: 8500, quantity: 7.2, miscCost: 15000 }),
            row({ id: "kitchen-base-cabinets", material: "Base Cabinet Modules", description: "Modular base cabinets with soft-close hardware.", supplier: "Cabinetry Works", source: "supplier", unit: "lm", itemCost: 14500, quantity: 6.4, miscCost: 20800 }),
          ] },
          { id: "powder-room", name: "Powder Room", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "powder-vanity", material: "Bathroom Vanity", description: "Compact vanity with basin and faucet allowance.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 36000, quantity: 1, miscCost: 6000, imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "powder-wall-tile", material: "Accent Wall Tile", description: "Powder room feature wall tile with installation allowance.", supplier: "Tile Works", source: "supplier", unit: "sqm", itemCost: 1650, quantity: 12, miscCost: 5400 }),
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
            row({ id: "primary-queen-bed", material: "BRUKSVARA Bed Frame", description: "IKEA Philippines bed-frame benchmark; adjust size/model for final selection.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 6999, quantity: 1, miscCost: 3300, category: "Furniture", pricingSource: "IKEA PH beds category page", pricingDate: "2026-05-17", imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "primary-bedside-tables", material: "Bedside Table", description: "Pair of bedside tables for primary bedroom.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 9500, quantity: 2, miscCost: 500 }),
          ] },
          { id: "walk-in-closet", name: "Walk-in Closet", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "wic-modular-wardrobe", material: "Modular Wardrobe", description: "Full-height wardrobe modules with hanging rods and drawers.", supplier: "Cabinetry Works", source: "library", unit: "lm", itemCost: 18500, quantity: 8.5, miscCost: 23500, imageUrl: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "primary-bath", name: "Primary Toilet + Bath", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "primary-bath-vanity", material: "Bathroom Vanity", description: "Double vanity with stone counter and basin allowance.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 68000, quantity: 1, miscCost: 9000, imageUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80" }),
          ] },
          { id: "bedroom-2", name: "Bedroom 2", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "bedroom-2-single-bed", material: "Single Bed Frame", description: "Single bed frame for secondary bedroom.", supplier: "Project Library", source: "library", unit: "set", itemCost: 26000, quantity: 1, miscCost: 2000, imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "bedroom-2-study-desk", material: "Study Desk", description: "Compact study desk with cable grommet.", supplier: "Project Library", source: "library", unit: "pc", itemCost: 18500, quantity: 1, miscCost: 600 }),
          ] },
          { id: "bedroom-3", name: "Bedroom 3", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "bedroom-3-single-bed", material: "Single Bed Frame", description: "Single bed frame for guest bedroom.", supplier: "Project Library", source: "library", unit: "set", itemCost: 26000, quantity: 1, miscCost: 2000, imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=600&q=80" }),
            row({ id: "bedroom-3-wardrobe", material: "Modular Wardrobe", description: "Bedroom wardrobe modules with shelves and hanging space.", supplier: "Cabinetry Works", source: "library", unit: "lm", itemCost: 18500, quantity: 3.2, miscCost: 9000 }),
          ] },
          { id: "family-hall", name: "Family Hall", kind: "area", total: "₱0.00", estimateRowItems: [
            row({ id: "family-hall-sofa", material: "Two-seat Sofa", description: "Compact family hall sofa.", supplier: "Fine Furniture Co.", source: "library", unit: "pc", itemCost: 42000, quantity: 1, miscCost: 800 }),
          ] },
        ],
      },
      {
        id: "roof-deck",
        name: "Roof Deck",
        kind: "group",
        total: "₱0.00",
        children: [
          { id: "roof-lounge", name: "Lounge", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-outdoor-lounge", material: "Outdoor Lounge Set", description: "Weather-resistant roof deck lounge set with cushions.", supplier: "Outdoor Living PH", source: "library", unit: "set", itemCost: 76000, quantity: 1, miscCost: 4200, imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80" })] },
          { id: "bar-counter", name: "Bar Counter", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-bar-counter", material: "Outdoor Bar Counter", description: "Built-in bar counter with stone top and weather-resistant base.", supplier: "Cabinetry Works", source: "project", unit: "lm", itemCost: 22000, quantity: 3.6, miscCost: 16800 })] },
          { id: "roof-toilet", name: "Toilet", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "roof-toilet-vanity", material: "Bathroom Vanity", description: "Roof deck toilet vanity with compact basin.", supplier: "Cabinetry Works", source: "library", unit: "set", itemCost: 32000, quantity: 1, miscCost: 5400 })] },
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
          row({ id: "front-yard-pebble-washout", material: "Pebble Washout Floor Finish", description: "Direct lot-level area allowance for front yard hardscape finish.", supplier: "Local PH contractor / aggregate supplier", source: "supplier", unit: "sqm", itemCost: 950, quantity: 36, miscCost: 7700, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Local contractor allowance — verify site and aggregate quote", pricingDate: "2026-05-18" }),
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
              row({ id: "gatehouse-epoxy-floor", material: "Epoxy Floor Coating System", description: "Small gatehouse floor coating allowance.", supplier: "Boysen / Davies / PH specialty coating contractor", source: "supplier", unit: "sqm", itemCost: 1650, quantity: 8, miscCost: 1200, category: "Finishes", discipline: "Architectural", designation: "Floor Finish", pricingSource: "Philippine coating brand/contractor allowance — verify product system and quote", pricingDate: "2026-05-18" }),
            ],
          },
        ],
      },
    ],
  },
];

export function findEstimateNode(nodes: EstimateTreeNode[], id: string): EstimateTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findEstimateNode(node.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}

export function validateEstimateTreeHierarchy(nodes: EstimateTreeNode[]) {
  const errors: string[] = [];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nodePath = [...path, node.name];
    // Unification: any node may own rows, so rows-on-non-area is no longer a hierarchy
    // error. (Cross-tab / cycle / missing-parent invariants remain enforced in the DB.)
    node.children?.forEach((child) => visit(child, nodePath));
  }

  nodes.forEach((node) => visit(node, []));
  return errors;
}
