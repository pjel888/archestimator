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
  it("allows only local component thumbnails and brokered component image routes", () => {
    const safeBrokeredImage = "/api/component-library/images?path=steel-frame.jpg";
    const uploadedEstimateRowImagePath = "11111111-1111-4111-8111-111111111111/user-1/project-images/22222222-2222-4222-8222-222222222222/estimate-row-images/33333333-3333-4333-8333-333333333333/reference-thumb.webp";
    const uploadedEstimateRowImage = `/api/projects/images?path=${uploadedEstimateRowImagePath}`;
    const normalizedUploadedEstimateRowImage = `/api/projects/images?path=${encodeURIComponent(uploadedEstimateRowImagePath)}`;
    const legacySupabaseImage = "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/fixture.webp";

    expect(normalizeEstimateRowImageUrl("/component-thumbnails/lib-sofa.jpg")).toBe("/component-thumbnails/lib-sofa.jpg");
    expect(normalizeEstimateRowImageUrl(safeBrokeredImage)).toBe(safeBrokeredImage);
    expect(normalizeEstimateRowImageUrl(uploadedEstimateRowImage)).toBe(normalizedUploadedEstimateRowImage);
    expect(normalizeEstimateRowImageUrl(legacySupabaseImage)).toBeNull();
    expect(normalizeEstimateRowImageUrl("https://tracker.example/pixel.svg?viewer=1")).toBeNull();
    expect(normalizeEstimateRowImageUrl("https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/fixture.webp?viewer=1")).toBeNull();
    expect(normalizeEstimateRowImageUrl("https://example.supabase.co/storage/v1/object/public/component-images/ws/user/%2e%2e/fixture.webp")).toBeNull();
    expect(normalizeEstimateRowImageUrl("/api/projects/images?path=project-images/project/cover.webp")).toBeNull();
    expect(normalizeEstimateRowImageUrl(`${uploadedEstimateRowImage}&next=/api/projects/images`)).toBeNull();
    expect(normalizeEstimateRowImageUrl("/api/projects/images?path=11111111-1111-4111-8111-111111111111/user-1/project-images/22222222-2222-4222-8222-222222222222/cover.webp")).toBeNull();
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
