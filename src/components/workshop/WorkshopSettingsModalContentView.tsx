"use client";

import {
  ArrowSquareOut,
  Buildings,
  EnvelopeSimple,
  FileText,
  Lifebuoy,
  SignOut,
  UserCircle,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type SettingsPage = Readonly<{
  category: string;
  description: string;
  href?: string;
  icon: ReactNode;
  id: string;
  notes: readonly string[];
  title: string;
}>;

type SettingsGroup = Readonly<{
  id: string;
  title: string;
  pages: readonly SettingsPage[];
}>;

const accountSettings = [
  {
    category: "Account",
    description: "Name, email, and personal defaults used across the workshop.",
    href: "/workshop/settings/profile",
    icon: <UserCircle size={15} weight="regular" aria-hidden="true" />,
    id: "profile",
    notes: ["Profile identity", "Contact details", "Personal workshop defaults"],
    title: "Profile",
  },
  {
    category: "Account",
    description: "Company-level details that appear on estimates and proposals.",
    href: "/workshop/settings/workspace",
    icon: <Buildings size={15} weight="regular" aria-hidden="true" />,
    id: "workspace",
    notes: ["Workspace profile", "Proposal identity", "Shared account fields"],
    title: "Workspace",
  },
  {
    category: "Account",
    description: "End this browser session and return to login.",
    icon: <SignOut size={15} weight="regular" aria-hidden="true" />,
    id: "sign-out",
    notes: ["Clears this authenticated session", "Returns focus to the workshop shell after closing"],
    title: "Sign out",
  },
] as const satisfies readonly SettingsPage[];

const supportSettings = [
  {
    category: "Support",
    description: "Report workflow blockers, export issues, or confusing estimating details.",
    href: "/workshop/feedback",
    icon: <EnvelopeSimple size={15} weight="regular" aria-hidden="true" />,
    id: "feedback",
    notes: ["Product feedback", "Workflow blockers", "Proposal or export issues"],
    title: "Send feedback",
  },
  {
    category: "Support",
    description: "Request account deletion, data export, or support follow-up.",
    href: "mailto:support@archestimator.com",
    icon: <Lifebuoy size={15} weight="regular" aria-hidden="true" />,
    id: "data-requests",
    notes: ["Data export", "Account deletion", "Support follow-up"],
    title: "Data requests",
  },
  {
    category: "Support",
    description: "Review terms, privacy status, and estimate accuracy limits.",
    href: "/terms",
    icon: <FileText size={15} weight="regular" aria-hidden="true" />,
    id: "terms-privacy",
    notes: ["Terms", "Privacy", "Estimate accuracy limits", "Accepted Terms version"],
    title: "Terms and privacy",
  },
] as const satisfies readonly SettingsPage[];

const platformSettings = [
  {
    category: "Access operations",
    description: "Add, activate, revoke, and annotate allowlist rows.",
    href: "/workshop/settings/users",
    icon: <UsersThree size={15} weight="regular" aria-hidden="true" />,
    id: "users",
    notes: ["Allowlist rows", "Access status", "User notes"],
    title: "Users",
  },
  {
    category: "Access operations",
    description: "Review authenticated feedback and keep triage status current.",
    href: "/workshop/settings/feedback",
    icon: <Wrench size={15} weight="regular" aria-hidden="true" />,
    id: "feedback-triage",
    notes: ["Authenticated feedback", "Triage status", "Workflow evidence"],
    title: "Feedback triage",
  },
] as const satisfies readonly SettingsPage[];

const baseSettingsGroups: readonly SettingsGroup[] = [
  { id: "account", pages: accountSettings, title: "Account" },
  { id: "support", pages: supportSettings, title: "Support and legal" },
] as const;

const platformSettingsGroup: SettingsGroup = {
  id: "access-operations",
  pages: platformSettings,
  title: "Access operations",
} as const;

function SettingsRailRow({
  active,
  page,
  onSelect,
}: {
  active: boolean;
  page: SettingsPage;
  onSelect: (pageId: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        title={`${page.title}: ${page.description}`}
        className={cn(
          "group flex min-h-8 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xs px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          active ? "bg-surfaceMuted text-ink" : "text-secondary hover:bg-surfaceMuted hover:text-ink",
        )}
        aria-current={active ? "page" : undefined}
        aria-label={`Show ${page.title} settings`}
        aria-controls="settings-detail-panel"
        onClick={() => onSelect(page.id)}
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center text-tertiary transition group-hover:text-ink",
            active && "text-ink",
          )}
        >
          {page.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate whitespace-nowrap text-[10px] font-medium leading-4">{page.title}</span>
        </span>
      </button>
    </li>
  );
}

function SettingsRail({
  activePageId,
  groups,
  onSelect,
}: {
  activePageId: string | null;
  groups: readonly SettingsGroup[];
  onSelect: (pageId: string) => void;
}) {
  return (
    <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-r border-hairline bg-white p-2" aria-label="Settings navigation">
      <nav className="min-w-0 space-y-3" aria-label="Settings pages">
        {groups.map((group, groupIndex) => (
          <section
            key={group.id}
            className={cn("min-w-0", groupIndex > 0 && "border-t border-hairline pt-2")}
            aria-labelledby={`settings-group-${group.id}`}
          >
            <h4
              id={`settings-group-${group.id}`}
              className="truncate px-2 pb-1 text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary"
            >
              {group.title}
            </h4>
            <ul className="grid min-w-0 gap-0.5">
              {group.pages.map((page) => (
                <SettingsRailRow
                  key={page.id}
                  active={page.id === activePageId}
                  page={page}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}

function SettingsDetailPanel({
  page,
  renderSignOutControl,
}: {
  page: SettingsPage;
  renderSignOutControl: () => ReactNode;
}) {
  const isSignOut = page.id === "sign-out";
  const isEmailAction = page.href?.startsWith("mailto:");

  return (
    <section aria-labelledby={`settings-page-${page.id}-title`} className="mx-auto max-w-[620px] space-y-4 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center text-tertiary">{page.icon}</span>
        <div className="min-w-0 space-y-1">
          <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">{page.category}</p>
          <h3 id={`settings-page-${page.id}-title`} className="text-[12px] font-medium leading-4 text-ink">
            {page.title}
          </h3>
          <p className="max-w-[62ch] text-[10px] leading-4 text-tertiary">{page.description}</p>
        </div>
      </div>

      <div className="rounded-xs border border-hairline bg-white">
        <div className="border-b border-hairline px-3 py-2">
          <h4 className="text-[10px] font-medium leading-4 text-ink">This page controls</h4>
        </div>
        <ul className="divide-y divide-hairline">
          {page.notes.map((note) => (
            <li key={note} className="px-3 py-2 text-[10px] leading-4 text-secondary">
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-12 flex-col gap-2 border border-hairline bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-medium leading-4 text-ink">
            {isSignOut ? "Ready to end this session?" : isEmailAction ? "Contact support" : "Open the full settings page"}
          </p>
          <p className="text-[10px] leading-4 text-tertiary">
            {isSignOut ? "This action signs out only this browser session." : page.href}
          </p>
        </div>
        {isSignOut ? (
          renderSignOutControl()
        ) : page.href ? (
          <a
            href={page.href}
            className="inline-flex min-h-8 min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-xs border border-divider bg-white px-2 py-1.5 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            {isEmailAction ? "Open email" : "Open page"}
            <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function WorkshopSettingsModalContentView({
  canManagePlatform,
  renderSignOutControl,
}: {
  canManagePlatform: boolean;
  renderSignOutControl: () => ReactNode;
}) {
  const [activePageId, setActivePageId] = useState("profile");
  const settingsGroups: readonly SettingsGroup[] = canManagePlatform
    ? [...baseSettingsGroups, platformSettingsGroup]
    : baseSettingsGroups;
  const settingsPages = settingsGroups.flatMap((group) => group.pages);
  const activePage = settingsPages.find((page) => page.id === activePageId) ?? accountSettings[0];

  return (
    <div className="grid h-[min(640px,calc(100dvh-96px))] min-h-[460px] grid-cols-[148px_minmax(0,1fr)] overflow-hidden bg-white sm:grid-cols-[260px_minmax(0,1fr)]">
      <SettingsRail activePageId={activePage.id} groups={settingsGroups} onSelect={setActivePageId} />
      <main
        id="settings-detail-panel"
        className="min-h-0 overflow-y-auto bg-white"
        aria-label={activePage ? `${activePage.title} settings` : "Settings detail panel"}
      >
        <SettingsDetailPanel page={activePage} renderSignOutControl={renderSignOutControl} />
      </main>
    </div>
  );
}
