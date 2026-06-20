"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  Briefcase,
  Buildings,
  CaretRight,
  EnvelopeSimple,
  FileText,
  Lifebuoy,
  ShieldCheck,
  SignOut,
  UserCircle,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
    notes: ["Beta feedback", "Workflow blockers", "Proposal or export issues"],
    title: "Send feedback",
  },
  {
    category: "Support",
    description: "Request account deletion, data export, or beta support follow-up.",
    href: "mailto:support@archestimator.com",
    icon: <Lifebuoy size={15} weight="regular" aria-hidden="true" />,
    id: "data-requests",
    notes: ["Data export", "Account deletion", "Closed beta support"],
    title: "Data requests",
  },
  {
    category: "Support",
    description: "Review beta terms, privacy status, and estimate accuracy limits.",
    href: "/terms",
    icon: <FileText size={15} weight="regular" aria-hidden="true" />,
    id: "terms-privacy",
    notes: ["Terms", "Privacy", "Estimate accuracy limits"],
    title: "Terms and privacy",
  },
  {
    category: "Support",
    description: "Reopen the protected clickwrap screen for the accepted Terms version.",
    href: "/workshop/terms?next=%2Fworkshop%2Fsettings",
    icon: <ShieldCheck size={15} weight="regular" aria-hidden="true" />,
    id: "terms-acceptance",
    notes: ["Accepted version", "Review screen", "Protected beta access"],
    title: "Terms acceptance",
  },
] as const satisfies readonly SettingsPage[];

const platformSettings = [
  {
    category: "Beta operations",
    description: "Add, activate, revoke, and annotate closed beta allowlist rows.",
    href: "/workshop/settings/beta-users",
    icon: <UsersThree size={15} weight="regular" aria-hidden="true" />,
    id: "beta-users",
    notes: ["Allowlist rows", "Access status", "Beta user notes"],
    title: "Beta users",
  },
  {
    category: "Beta operations",
    description: "Review authenticated beta feedback and keep triage status current.",
    href: "/workshop/settings/feedback",
    icon: <Wrench size={15} weight="regular" aria-hidden="true" />,
    id: "beta-feedback",
    notes: ["Authenticated feedback", "Triage status", "Beta workflow evidence"],
    title: "Beta feedback",
  },
] as const satisfies readonly SettingsPage[];

const baseSettingsGroups: readonly SettingsGroup[] = [
  { id: "account", pages: accountSettings, title: "Account" },
  { id: "support", pages: supportSettings, title: "Support and legal" },
] as const;

const platformSettingsGroup: SettingsGroup = {
  id: "beta-operations",
  pages: platformSettings,
  title: "Beta operations",
} as const;

function SettingsIndexRow({ page, onSelect }: { page: SettingsPage; onSelect: (pageId: string) => void }) {
  return (
    <li>
      <button
        type="button"
        className="group flex min-h-[58px] w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        aria-label={`Open ${page.title} settings`}
        onClick={() => onSelect(page.id)}
      >
        <span className="grid size-5 shrink-0 place-items-center text-tertiary transition group-hover:text-ink">
          {page.icon}
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block text-[11px] font-medium leading-4 text-ink">{page.title}</span>
          <span className="block text-[10px] leading-4 text-tertiary">{page.description}</span>
        </span>
        <CaretRight size={12} weight="regular" className="shrink-0 text-tertiary transition group-hover:text-ink" aria-hidden="true" />
      </button>
    </li>
  );
}

function SettingsIndex({
  groups,
  onSelect,
}: {
  groups: readonly SettingsGroup[];
  onSelect: (pageId: string) => void;
}) {
  return (
    <div className="min-h-0 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-[680px] space-y-4">
        <div className="space-y-1">
          <h3 className="text-[12px] font-medium leading-4 text-ink">Settings pages</h3>
          <p className="max-w-[62ch] text-[10px] leading-4 text-tertiary">
            Choose one setting page. The modal keeps the index light, then opens a focused page for the selected task.
          </p>
        </div>

        <div className="rounded-xs border border-hairline bg-white">
          {groups.map((group, groupIndex) => (
            <section key={group.id} aria-labelledby={`settings-group-${group.id}`}>
              <div
                className={cn(
                  "border-b border-hairline px-3 py-2",
                  groupIndex > 0 && "border-t",
                )}
              >
                <h4
                  id={`settings-group-${group.id}`}
                  className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary"
                >
                  {group.title}
                </h4>
              </div>
              <ul className="divide-y divide-hairline">
                {group.pages.map((page) => (
                  <SettingsIndexRow key={page.id} page={page} onSelect={onSelect} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-2 border border-hairline px-3 py-2 text-[10px] leading-4 text-tertiary">
          <Briefcase size={12} weight="regular" aria-hidden="true" />
          <span className="min-w-0">Settings changes apply across the current workshop account.</span>
        </div>
      </div>
    </div>
  );
}

function SettingsDetailPage({
  backButtonRef,
  onBack,
  page,
  signOutControl,
}: {
  backButtonRef: React.RefObject<HTMLButtonElement | null>;
  onBack: () => void;
  page: SettingsPage;
  signOutControl: ReactNode;
}) {
  const isSignOut = page.id === "sign-out";

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex min-h-10 items-center gap-2 border-b border-hairline bg-white px-2 py-1">
        <button
          ref={backButtonRef}
          type="button"
          className="inline-flex min-h-8 items-center gap-1 rounded-xs px-2 text-[10px] font-medium leading-none text-secondary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          onClick={onBack}
        >
          <ArrowLeft size={12} weight="regular" aria-hidden="true" />
          Settings
        </button>
        <span className="min-w-0 truncate text-[10px] leading-4 text-tertiary">
          / {page.category} / <span className="text-secondary">{page.title}</span>
        </span>
      </div>

      <div className="min-h-0 overflow-y-auto px-4 py-4">
        <section aria-labelledby={`settings-page-${page.id}-title`} className="mx-auto max-w-[620px] space-y-4">
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

          <div className="flex min-h-12 flex-col gap-2 border border-hairline px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-4 text-ink">
                {isSignOut ? "Ready to end this session?" : "Open the full settings page"}
              </p>
              <p className="text-[10px] leading-4 text-tertiary">
                {isSignOut ? "This action signs out only this browser session." : page.href}
              </p>
            </div>
            {isSignOut ? (
              signOutControl
            ) : page.href ? (
              <a
                href={page.href}
                className="inline-flex min-h-8 min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-xs border border-divider bg-white px-2 py-1.5 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                Open page
                <ArrowSquareOut size={12} weight="regular" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export function WorkshopSettingsModalContentView({
  canManagePlatform,
  signOutControl,
}: {
  canManagePlatform: boolean;
  signOutControl: ReactNode;
}) {
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsGroups: readonly SettingsGroup[] = canManagePlatform
    ? [...baseSettingsGroups, platformSettingsGroup]
    : baseSettingsGroups;
  const settingsPages = settingsGroups.flatMap((group) => group.pages);
  const activePage = settingsPages.find((page) => page.id === activePageId);

  useEffect(() => {
    if (!activePage) return;
    window.requestAnimationFrame(() => backButtonRef.current?.focus({ preventScroll: true }));
  }, [activePage]);

  return (
    <div className="h-[min(640px,calc(100dvh-96px))] min-h-[460px] overflow-hidden bg-white">
      {activePage ? (
        <SettingsDetailPage
          backButtonRef={backButtonRef}
          onBack={() => setActivePageId(null)}
          page={activePage}
          signOutControl={signOutControl}
        />
      ) : (
        <SettingsIndex groups={settingsGroups} onSelect={setActivePageId} />
      )}
    </div>
  );
}
