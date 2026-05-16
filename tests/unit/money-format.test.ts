import { describe, expect, test } from "bun:test";
import { formatMoney } from "@/lib/money/format";

describe("formatMoney", () => {
  test("uses the workspace currency instead of hard-coded pesos", () => {
    expect(formatMoney(1234, "USD", "en-US")).toBe("$1,234");
  });
});
