import { ArrowSquareOut, Briefcase, Lifebuoy, SignOut, UserCircle, Wrench } from "@phosphor-icons/react/dist/ssr";
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

type SettingsLinkItem = Readonly<{
  description: string;
  href: string;
  label: string;
}>;

type SettingsGroup = Readonly<{
  description: string;
  icon: ReactNode;
  id: string;
  items: readonly SettingsLinkItem[];
  navLabel: string;
  title: string;
}>;

const accountSettingsGroup = {
  description: "Profile and workspace account details.",
  icon: <UserCircle size={14} weight="regular" aria-hidden="true" />,
  id: "account",
  items: userSettings,
  navLabel: "Account",
  title: "Account",
} satisfies SettingsGroup;

const supportSettingsGroup = {
  description: "Feedback, terms, and data requests.",
  icon: <Lifebuoy size={14} weight="regular" aria-hidden="true" />,
  id: "support",
  items: supportSettings,
  navLabel: "Support and legal",
  title: "Support and legal",
} satisfies SettingsGroup;

const platformSettingsGroup = {
  description: "Closed beta access and triage.",
  icon: <Wrench size={14} weight="regular" aria-hidden="true" />,
  id: "closed-beta",
  items: platformSettings,
  navLabel: "Beta operations",
  title: "Closed beta operations",
} satisfies SettingsGroup;

const baseSettingsGroups = [accountSettingsGroup, supportSettingsGroup] as const;

function SettingsNavLink({ current, group }: { current: boolean; group: SettingsGroup }) {
  return (
    <a
      href={`#settings-${group.id}`}
      aria-current={current ? "page" : undefined}
      aria-label={`Show ${group.title} settings`}
      className={[
        "flex h-10 min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-xs border px-2 text-[11px] font-medium leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:min-w-0 sm:w-full sm:justify-start",
        current
          ? "border-divider bg-white text-ink shadow-sm"
          : "border-transparent text-secondary hover:bg-white hover:text-ink",
      ].join(" ")}
    >
      <span className="hidden size-6 shrink-0 place-items-center rounded-xs border border-divider bg-white text-tertiary sm:grid">
        {group.icon}
      </span>
      <span className="truncate">{group.navLabel}</span>
    </a>
  );
}

function SettingsLinkRow({ description, href, label }: SettingsLinkItem) {
  return (
    <li>
      <a
        href={href}
        aria-label={`Open ${label}`}
        className="group flex min-h-[66px] items-center justify-between gap-3 px-3 py-2 transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
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
  group,
}: {
  children: ReactNode;
  group: SettingsGroup;
}) {
  return (
    <section
      id={`settings-${group.id}`}
      aria-labelledby={`settings-${group.id}-title`}
      className="scroll-mt-3 overflow-hidden rounded-xs border border-hairline bg-white"
    >
      <header className="border-b border-hairline px-3 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xs border border-divider bg-surfaceMuted text-tertiary">
            {group.icon}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 id={`settings-${group.id}-title`} className="text-[12px] font-medium leading-4 text-ink">
              {group.title}
            </h3>
            <p className="text-[10px] leading-4 text-tertiary">{group.description}</p>
          </div>
        </div>
      </header>
      <ul className="divide-y divide-hairline">{children}</ul>
    </section>
  );
}

export function WorkshopSettingsModalContent({ canManagePlatform }: { canManagePlatform: boolean }) {
  const settingsGroups = canManagePlatform
    ? [...baseSettingsGroups, platformSettingsGroup]
    : [...baseSettingsGroups];

  return (
    <div className="grid h-[min(560px,calc(100dvh-128px))] min-h-[420px] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[184px_minmax(0,1fr)] sm:grid-rows-1">
      <nav
        aria-label="Settings sections"
        className="border-b border-hairline bg-surfaceMuted p-2 sm:border-b-0 sm:border-r"
      >
        <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          {settingsGroups.map((group, index) => (
            <SettingsNavLink key={group.id} group={group} current={index === 0} />
          ))}
        </div>
      </nav>

      <div className="min-h-0 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-[540px] space-y-3">
          <SettingsSection group={accountSettingsGroup}>
            {userSettings.map((item) => (
              <SettingsLinkRow key={item.href} {...item} />
            ))}
            <li className="flex min-h-[66px] items-center justify-between gap-3 px-3 py-2">
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

          <SettingsSection group={supportSettingsGroup}>
            {supportSettings.map((item) => (
              <SettingsLinkRow key={item.href} {...item} />
            ))}
          </SettingsSection>
          <p className="rounded-xs border border-hairline bg-surfaceMuted px-3 py-2 text-[10px] leading-4 text-tertiary">
            For account deletion or data export requests during beta, send feedback or email support@archestimator.com.
          </p>

          {canManagePlatform ? (
            <SettingsSection group={platformSettingsGroup}>
              {platformSettings.map((item) => (
                <SettingsLinkRow key={item.href} {...item} />
              ))}
            </SettingsSection>
          ) : null}

          <div className="flex items-center gap-2 rounded-xs border border-hairline bg-white px-3 py-2 text-[10px] leading-4 text-tertiary">
            <Briefcase size={12} weight="regular" aria-hidden="true" />
            <span className="min-w-0">Settings changes apply across the current workshop account.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
