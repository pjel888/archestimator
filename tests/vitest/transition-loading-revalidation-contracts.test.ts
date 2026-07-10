import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentLibraryActions = readFileSync("src/lib/component-library/actions.ts", "utf8");
const packageBuilderApply = readFileSync("src/lib/ai/package-builder/apply.ts", "utf8");
const publicationActions = readFileSync("src/lib/publication/actions.ts", "utf8");
const estimateWorkspaceClient = readFileSync("src/components/workshop/EstimateWorkspaceClient.tsx", "utf8");
const publishedQuickActions = readFileSync(
  "src/components/workshop/dashboard/PublishedProjectQuickActions.tsx",
  "utf8",
);

describe("transition-loading revalidation + mount contracts", () => {
  it("ARCH-07a: library mutations revalidate /workshop/library/components", () => {
    expect(componentLibraryActions).toContain('revalidatePath("/workshop/library/components")');
    expect(packageBuilderApply).toContain('revalidatePath("/workshop/library/components")');
    expect(componentLibraryActions).not.toContain('revalidatePath("/workshop/components")');
    expect(packageBuilderApply).not.toContain('revalidatePath("/workshop/components")');
  });

  it("ARCH-07b/c: publication mutations revalidate proposals + publisher", () => {
    expect(publicationActions).toContain('revalidatePath("/workshop/proposals")');
    expect(publicationActions).toContain('revalidatePath("/workshop/publisher")');
    expect(publicationActions).toContain('revalidatePath("/workshop")');
  });

  it("ARCH-06: dashboard quick actions do not double-refresh via router.refresh", () => {
    expect(publishedQuickActions).not.toContain("router.refresh");
    expect(publishedQuickActions).not.toContain("useRouter");
  });

  it("ARCH-02: estimate workspace dynamic imports provide loading fallbacks", () => {
    expect(estimateWorkspaceClient).toContain("ssr: false");
    expect(estimateWorkspaceClient).toContain("loading:");
    expect(estimateWorkspaceClient).toContain("EstimateTreeDynamicFallback");
    expect(estimateWorkspaceClient).toContain("EstimateContentDynamicFallback");
  });
});
