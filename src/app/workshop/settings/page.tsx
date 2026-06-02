import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import { requireCurrentUserContext } from "@/lib/auth/session";

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
] as const;

function SettingsLinkCard({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <article className="border border-hairline bg-white p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-[11px] font-medium leading-4 text-ink">{label}</h2>
          <p className="text-[10px] leading-4 text-tertiary">{description}</p>
        </div>
        <a
          href={href}
          className="inline-flex min-h-8 items-center justify-center gap-2 rounded-xs border border-divider bg-surface p-2 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Open
          <ArrowSquareOut className="size-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default async function WorkshopSettingsPage() {
  const context = await requireCurrentUserContext();
  const canManagePlatform = context.role === "ceo" || context.role === "admin";

  return (
    <WorkshopPageShell
      title="Settings"
      eyebrow="Workshop"
      description="Manage account, workspace, and closed-beta operations from one place."
      breadcrumbs={["Settings"]}
      contentClassName="overflow-y-auto p-2"
    >
      <div className="max-w-4xl space-y-4">
        <section className="space-y-2">
          <h2 className="text-[10px] font-medium leading-4 text-secondary">Account</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {userSettings.map((item) => (
              <SettingsLinkCard key={item.href} {...item} />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[10px] font-medium leading-4 text-secondary">Support and legal</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {supportSettings.map((item) => (
              <SettingsLinkCard key={item.href} {...item} />
            ))}
          </div>
          <p className="max-w-2xl text-[10px] leading-4 text-tertiary">
            For account deletion or data export requests during beta, send feedback or email support@archestimator.com.
          </p>
        </section>

        {canManagePlatform ? (
          <section className="space-y-2">
            <h2 className="text-[10px] font-medium leading-4 text-secondary">Closed beta operations</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {platformSettings.map((item) => (
                <SettingsLinkCard key={item.href} {...item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </WorkshopPageShell>
  );
}
