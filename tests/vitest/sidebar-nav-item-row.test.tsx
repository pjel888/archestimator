import { fireEvent, render, screen } from "@testing-library/react";
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
  it("keeps viewport prefetch disabled until hover intent, then restores Next hover prefetch", () => {
    const onPrefetchStart = vi.fn();
    const onPrefetchCancel = vi.fn();

    render(
      <SidebarNavItemRow
        item={{ id: "projects", href: "/workshop/projects", label: "Projects", icon: TestIcon }}
        active={false}
        expanded
        onPrefetchStart={onPrefetchStart}
        onPrefetchCancel={onPrefetchCancel}
      />,
    );

    const link = screen.getByRole("link", { name: "Projects" });
    expect(link).toHaveAttribute("data-prefetch", "false");

    fireEvent.mouseEnter(link);

    expect(link).toHaveAttribute("data-prefetch", "null");
    expect(onPrefetchStart).toHaveBeenCalledWith("/workshop/projects");

    fireEvent.mouseLeave(link);

    expect(onPrefetchCancel).toHaveBeenCalledWith("/workshop/projects");
  });
});
