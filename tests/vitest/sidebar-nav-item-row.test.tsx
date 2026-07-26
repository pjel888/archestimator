import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode, SVGProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SidebarNavItemRow } from "@/components/sidebar/SidebarNavItemRow";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: {
    children: ReactNode;
    href: string;
    prefetch?: boolean | null;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} data-prefetch={prefetch === null ? "null" : String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

function TestIcon(props: SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" {...props} />;
}

describe("SidebarNavItemRow", () => {
  it("extends the active treatment across the label when expanded", () => {
    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active
        expanded
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveClass("text-brand-orange-dark", "before:left-1.5", "before:right-1.5");
    expect(link.className).not.toContain("before:w-9");
  });

  it("keeps a monochrome active treatment icon-sized when collapsed", () => {
    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active
        expanded={false}
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveClass("text-primary", "before:left-1.5", "before:w-9");
    expect(link.className).toContain("var(--glass-nav-active-collapsed-bg)");
    expect(link).not.toHaveClass("text-brand-orange-dark");
    expect(link.className).not.toContain("before:right-1.5");
  });

  it("extends the inactive hover tint across the label when expanded", () => {
    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active={false}
        expanded
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveClass("before:left-1.5", "before:right-1.5");
    expect(link.className).not.toContain("before:w-9");
  });

  it("keeps the inactive hover tint icon-sized when collapsed", () => {
    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active={false}
        expanded={false}
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveClass("before:left-1.5", "before:w-9");
    expect(link.className).not.toContain("before:right-1.5");
  });

  it("enables Next prefetch for primary sidebar navigation", () => {
    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active={false}
        expanded
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveAttribute("data-prefetch", "true");
  });
});
