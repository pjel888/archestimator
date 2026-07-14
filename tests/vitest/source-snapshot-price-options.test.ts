import { describe, expect, it } from "vitest";

import { omitEstimateRowPriceOptionAttachments } from "@/lib/estimates/source-snapshot-price-options";
import type { ComponentPriceOption } from "@/lib/estimates/types";

describe("estimate row price option ownership", () => {
  it("omits attachment descriptors when component ownership changes", () => {
    const priceOptions: ComponentPriceOption[] = [{
      id: "option-default",
      label: "Default",
      unit: "unit",
      unitCost: 10,
      miscCost: 0,
      currency: "PHP",
      isActive: true,
      isDefault: true,
      attachments: [{
        id: "attachment-1",
        assetId: "asset-1",
        bucket: "component-attachments",
        path: "workspace/source/spec.pdf",
        fileName: "spec.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
        kind: "pdf",
      }],
    }];

    const result = omitEstimateRowPriceOptionAttachments(priceOptions);

    expect(result.omittedAttachmentCount).toBe(1);
    expect(result.priceOptions?.[0]?.attachments).toEqual([]);
    expect(priceOptions[0]?.attachments).toHaveLength(1);
  });
});
