import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const PUBLIC_STATIC_ROUTE_FILES = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/features/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/trust/page.tsx",
  "src/app/signup/page.tsx",
] as const;

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("public static route contract", () => {
  it("keeps cacheable public entry routes out of server request-time APIs", () => {
    for (const path of PUBLIC_STATIC_ROUTE_FILES) {
      const source = readProjectFile(path);

      expect(source, path).toContain('export const dynamic = "force-static"');
      expect(source, path).not.toContain("next/headers");
      expect(source, path).not.toContain("getLandingAuthState");
      expect(source, path).not.toMatch(/\bcookies\(\)/);
      expect(source, path).not.toMatch(/\bheaders\(\)/);
      expect(source, path).not.toMatch(/\bsearchParams\b/);
    }
  });

  it("keeps the auth entry shell cacheable with query-specific state in client islands", () => {
    const loginSource = readProjectFile("src/app/login/page.tsx");

    expect(loginSource).not.toContain('export const dynamic = "force-dynamic"');
    expect(loginSource).not.toContain("export const revalidate = 0");
    expect(loginSource).not.toContain('export const dynamic = "force-static"');
    expect(loginSource).not.toContain("next/headers");
    expect(loginSource).not.toMatch(/\bcookies\(\)/);
    expect(loginSource).not.toMatch(/\bheaders\(\)/);
    expect(loginSource).toContain("LoginFormFromSearchParams");
    expect(loginSource).toContain('<LoginForm next="/workshop" />');
  });

  it("keeps URL-specific public state in client Suspense islands", () => {
    const contactPage = readProjectFile("src/app/contact/page.tsx");
    const contactForm = readProjectFile("src/components/landing/ContactForm.tsx");
    const authState = readProjectFile("src/components/auth/AuthSearchParamsState.tsx");

    expect(contactPage).toContain("<Suspense fallback={<ContactForm />}>");
    expect(contactPage).toContain("<ContactFormFromSearchParams />");
    expect(contactForm).toContain("useSearchParams");
    expect(authState).toContain("useSearchParams");
    expect(authState).toContain("sanitizeNextPath");
  });
});
