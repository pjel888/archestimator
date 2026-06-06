import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

const userSettings = [
  {
    description: "Update profile-owned account details used across the workshop.",
    href: "/workshop/settings/profile",
    label: "Profile settings",
  },
  {
    description: "Update workspace-owned account fields for estimates and proposals.",
    href: "/workshop/settings/workspace",
    label: "Workspace settings",
  },
] as const;

const platformSettings = [
  {
    description: "Add, activate, revoke, and annotate closed beta allowlist rows.",
    href: "/workshop/settings/beta-users",
    label: "Beta users",
  },
  {
    description: "Review authenticated beta feedback and keep triage status current.",
    href: "/workshop/settings/feedback",
    label: "Beta feedback",
  },
] as const;

const supportSettings = [
  {
    description: "Report workflow blockers, export issues, and confusing estimating details during beta.",
    href: "/workshop/feedback",
    label: "Send beta feedback",
  },
  {
    description: "Review beta terms, privacy status, estimate accuracy limits, and data deletion contact paths.",
    href: "/terms",
    label: "Terms and privacy",
  },
  {
    description: "Reopen the protected clickwrap screen to review the current accepted Terms version.",
    href: "/workshop/terms?next=%2Fworkshop%2Fsettings",
    label: "Terms acceptance",
  },
] as const;

type SettingsLinkItem = {
  description: string;
  href: string;
  label: string;
};

function SettingsLinkRow({ description, href, label }: SettingsLinkItem) {
  return (
    <li>
      <a
        href={href}
        aria-label={`Open ${label}`}
        className="group flex min-h-14 items-start justify-between gap-3 px-3 py-2 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
      >
        <span className="min-w-0 space-y-1">
          <span className="block text-[11px] font-medium leading-4 text-ink">{label}</span>
          <span className="block text-[10px] leading-4 text-tertiary">{description}</span>
        </span>
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xs border border-divider bg-white text-tertiary transition group-hover:text-ink">
          <ArrowSquareOut size={13} weight="regular" aria-hidden="true" />
        </span>
      </a>
    </li>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-2" aria-labelledby={`settings-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <h3
        id={`settings-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="px-3 text-[10px] font-medium leading-4 text-secondary"
      >
        {title}
      </h3>
      <ul className="divide-y divide-hairline border-y border-hairline bg-surfaceMuted">{children}</ul>
    </section>
  );
}

export function WorkshopSettingsModalContent({ canManagePlatform }: { canManagePlatform: boolean }) {
  return (
    <div className="space-y-4 py-3">
      <SettingsSection title="Account">
        {userSettings.map((item) => (
          <SettingsLinkRow key={item.href} {...item} />
        ))}
        <li className="flex min-h-14 items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium leading-4 text-ink">Sign out</p>
            <p className="text-[10px] leading-4 text-tertiary">End this browser session and return to login.</p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="danger" size="sm">
              <SignOut className="size-3" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </li>
      </SettingsSection>

      <SettingsSection title="Support and legal">
        {supportSettings.map((item) => (
          <SettingsLinkRow key={item.href} {...item} />
        ))}
      </SettingsSection>
      <p className="px-3 text-[10px] leading-4 text-tertiary">
        For account deletion or data export requests during beta, send feedback or email support@archestimator.com.
      </p>

      {canManagePlatform ? (
        <SettingsSection title="Closed beta operations">
          {platformSettings.map((item) => (
            <SettingsLinkRow key={item.href} {...item} />
          ))}
        </SettingsSection>
      ) : null}
    </div>
  );
}
