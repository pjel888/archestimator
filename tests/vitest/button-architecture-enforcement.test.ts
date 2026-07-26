import { describe, expect, it } from "vitest";

import { createInventory, scanSourceText, validateInventory } from "../../scripts/enforce-button-architecture.mjs";

describe("button architecture enforcement", () => {
  it("finds raw buttons and button-shaped links with stable symbol-scoped fingerprints", () => {
    const records = scanSourceText(
      "src/components/workshop/Example.tsx",
      `export function Example() {
        return <><button type="button">Save</button><Link href="/next" className="inline-flex rounded-xs px-2">Next</Link></>;
      }`,
    );

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.tag)).toEqual(["button", "Link"]);
    expect(records.every((record) => record.symbol === "Example")).toBe(true);
    expect(records.every((record) => record.fingerprint.length === 64)).toBe(true);
  });

  it("ignores ordinary content navigation links", () => {
    const records = scanSourceText(
      "src/components/workshop/Example.tsx",
      `export function Example() { return <Link href="/next" className="text-accent hover:underline">Next</Link>; }`,
    );

    expect(records).toEqual([]);
  });

  it("finds button-shaped links styled through CSS modules", () => {
    const records = scanSourceText(
      "src/components/landing/Example.tsx",
      `export function Example() { return <Link href="/next" className={styles.primary}>Next</Link>; }`,
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ tag: "Link", symbol: "Example" });
  });

  it("finds aliased Next links and anchors using the shared style recipe", () => {
    const records = scanSourceText(
      "src/components/landing/Example.tsx",
      `import NextLink from "next/link";
       export function Example() {
         return <><NextLink href="/next" className="inline-flex px-2">Next</NextLink><a href="/docs" className={buttonVariants()}>Docs</a></>;
       }`,
    );

    expect(records.map((record) => record.tag)).toEqual(["NextLink", "a"]);
  });

  it("never auto-approves a newly discovered raw control", () => {
    const records = scanSourceText(
      "src/components/workshop/Example.tsx",
      `export function Example() { return <button type="button">Save</button>; }`,
    );

    const inventory = createInventory(records);
    expect(inventory.entries[0]).toMatchObject({ disposition: "UNCLASSIFIED" });
    expect(validateInventory(records, inventory)).toEqual([
      "src/components/workshop/Example.tsx:1 has invalid disposition UNCLASSIFIED",
    ]);
  });

  it("rejects a handcrafted exception that is absent from the reviewed baseline", () => {
    const [record] = scanSourceText(
      "src/components/workshop/Example.tsx",
      `export function Example() { return <button type="button">Save</button>; }`,
    );
    const inventory = {
      entries: [{ ...record, disposition: "SPECIALIZED_SEMANTIC_CONTROL", reason: "Reviewed specialized control." }],
    };

    expect(validateInventory([record], inventory)).toEqual([
      "src/components/workshop/Example.tsx:1 introduces an unreviewed SPECIALIZED_SEMANTIC_CONTROL exception",
    ]);
  });

  it("rejects unclassified controls and stale inventory entries", () => {
    const records = scanSourceText(
      "src/components/workshop/Example.tsx",
      `export function Example() { return <button type="button">Save</button>; }`,
    );

    expect(validateInventory(records, { entries: [] })).toEqual([
      "src/components/workshop/Example.tsx:1 has an unclassified raw button in Example",
    ]);

    const staleEntry = {
      ...records[0],
      key: `${records[0].key}-stale`,
      disposition: "SPECIALIZED_SEMANTIC_CONTROL",
      reason: "Roving-tabindex control",
    };
    expect(validateInventory([], { entries: [staleEntry] })).toEqual([
      "src/components/workshop/Example.tsx:1 inventory fingerprint is stale or the control was migrated",
    ]);
  });

  it("accepts only exact classified occurrences", () => {
    const [record] = scanSourceText(
      "src/components/ui/tabs.tsx",
      `export function Tabs() { return <button role="tab" aria-selected="true">Tab</button>; }`,
    );
    const inventory = {
      entries: [
        {
          ...record,
          disposition: "SPECIALIZED_SEMANTIC_CONTROL",
          reason: "Tab owns roving focus and aria-selected semantics.",
        },
      ],
    };

    expect(validateInventory([record], inventory, { entries: inventory.entries })).toEqual([]);
  });
});
