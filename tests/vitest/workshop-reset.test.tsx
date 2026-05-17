import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import WorkshopPage from "../../src/app/workshop/page";

describe("workshop reset baseline", () => {
  test("renders an intentionally empty workshop page", () => {
    render(<WorkshopPage />);
    const main = screen.getByRole("main", { name: "Workshop" });
    expect(main).toBeInTheDocument();
    expect(main).toBeEmptyDOMElement();
  });
});
