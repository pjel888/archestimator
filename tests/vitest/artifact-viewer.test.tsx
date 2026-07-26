import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArtifactViewer } from "@/components/client-portal/ArtifactViewer";

describe("ArtifactViewer", () => {
  it("uses the authorized content route and only shows download when supplied", () => {
    const { rerender } = render(
      <ArtifactViewer contentUrl="/content" fileName="drawing.pdf" title="Drawing A" />,
    );

    expect(screen.getByTitle("Drawing A PDF preview")).toHaveAttribute("src", "/content");
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();

    rerender(
      <ArtifactViewer contentUrl="/content" downloadUrl="/content?download=1" fileName="drawing.pdf" title="Drawing A" />,
    );
    expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute("href", "/content?download=1");
  });
});
