import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VirtualizedLinkedInstanceList } from "@/components/workshop/library/template-editor/VirtualizedLinkedInstanceList";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("VirtualizedLinkedInstanceList", () => {
  it("virtualizes linked, updating, and failed estimate destinations", () => {
    render(
      <VirtualizedLinkedInstanceList
        items={[
          {
            instanceId: "linked-instance",
            projectId: "project-1",
            projectName: "Project One",
            estimateId: "estimate-1",
            estimateName: "Estimate One",
            linkState: "linked",
            appliedVersionNumber: 3,
            targetVersionNumber: 3,
          },
          {
            instanceId: "updating-instance",
            projectId: "project-2",
            projectName: "Project Two",
            estimateId: "estimate-2",
            estimateName: "Estimate Two",
            linkState: "updating",
            appliedVersionNumber: 2,
            targetVersionNumber: 3,
          },
          {
            instanceId: "failed-instance",
            projectId: "project-3",
            projectName: "Project Three",
            estimateId: "estimate-3",
            estimateName: "Estimate Three",
            linkState: "failed",
            appliedVersionNumber: 1,
            targetVersionNumber: 3,
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Project One/ }).closest("[data-template-linked-instance-virtual-list]"))
      .toHaveAttribute(
      "data-template-linked-instance-virtual-list",
      "true",
    );

    expect(screen.getByRole("link", { name: /Project One/ })).toHaveAttribute(
      "href",
      "/workshop/projects/project-1/estimates/estimate-1",
    );
    expect(screen.getByText("v3")).toHaveClass("text-tertiary");
    expect(screen.getByText(/v2.*3/)).toHaveClass("text-tertiary");
    expect(screen.getByText("Failed")).toHaveClass("text-danger");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("keeps a bounded row window while scrolling a large result", () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      instanceId: `instance-${index}`,
      projectId: `project-${index}`,
      projectName: `Project ${index}`,
      estimateId: `estimate-${index}`,
      estimateName: `Estimate ${index}`,
      linkState: "linked" as const,
      appliedVersionNumber: 3,
      targetVersionNumber: 3,
    }));
    const { container } = render(<VirtualizedLinkedInstanceList items={items} />);
    const scroller = container.querySelector("[data-template-linked-instance-virtual-list]");

    expect(scroller).not.toBeNull();
    expect(screen.getAllByRole("link").length).toBeLessThan(items.length);

    fireEvent.scroll(scroller!, { target: { scrollTop: 1_200 } });

    expect(screen.queryByRole("link", { name: /Project 0/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Project 50/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeLessThan(items.length);
  });
});
