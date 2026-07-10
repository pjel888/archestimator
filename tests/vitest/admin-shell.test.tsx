import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/AdminShell";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}));

describe("AdminShell", () => {
  it("renders admin navigation landmarks and links", () => {
    render(
      <AdminShell displayName="Admin User" email="admin@example.com">
        <p>Admin content</p>
      </AdminShell>,
    );

    expect(screen.getByRole("main", { name: "Admin dashboard" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Admin sections" });

    for (const [label, href] of [
      ["Overview", "/admin"],
      ["Users", "/admin/users"],
      ["Support", "/admin/support"],
      ["Flags", "/admin/flags"],
      ["Audit", "/admin/audit"],
      ["Observability", "/admin/observability"],
      ["Analytics", "/admin/analytics"],
    ]) {
      expect(within(navigation).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }

    expect(within(navigation).getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
  });
});

describe("/admin layout source contract", () => {
  it("imports auth and admin role gate helpers", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf8");

    expect(source).toContain('import { isPlatformAdmin } from "@/lib/auth/roles";');
    expect(source).toContain('import { getCurrentUserContext } from "@/lib/auth/session";');
    expect(source).toContain('import { isAdminDashboardEnabled } from "@/lib/admin/feature-flags";');
    expect(source).toContain("isAdminDashboardEnabled()");
    expect(source).toContain('redirect("/login?next=/admin")');
    expect(source).toContain('redirect("/access-required")');
    expect(source).toContain('redirect("/workshop")');
  });
});
