import { afterEach, describe, expect, it } from "vitest";

import { normalizeEstimateRowImageUrl, sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  if (originalSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  }
});

describe("estimate row image URL policy", () => {
  it("allows only local component thumbnails and configured Supabase component images", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const safeSupabaseImage = "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/fixture.webp";

    expect(normalizeEstimateRowImageUrl("/component-thumbnails/lib-sofa.jpg")).toBe("/component-thumbnails/lib-sofa.jpg");
    expect(normalizeEstimateRowImageUrl(safeSupabaseImage)).toBe(safeSupabaseImage);
    expect(normalizeEstimateRowImageUrl("https://tracker.example/pixel.svg?viewer=1")).toBeNull();
    expect(normalizeEstimateRowImageUrl("https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/fixture.webp?viewer=1")).toBeNull();
    expect(normalizeEstimateRowImageUrl("data:image/svg+xml,<svg></svg>")).toBeNull();
    expect(normalizeEstimateRowImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("strips unsafe source snapshot image URLs before persistence", () => {
    expect(sanitizeEstimateRowSourceSnapshot({
      category: "Furniture",
      imageUrl: "/component-thumbnails/lib-sofa.jpg",
    })).toEqual({
      category: "Furniture",
      imageUrl: "/component-thumbnails/lib-sofa.jpg",
    });

    expect(sanitizeEstimateRowSourceSnapshot({
      category: "Furniture",
      imageUrl: "https://tracker.example/pixel.svg?viewer=1",
    })).toEqual({
      category: "Furniture",
      imageUrl: null,
    });
  });
});
