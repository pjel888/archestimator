import { Button } from "@/components/ui/button";
import { ProfileSettingsFields } from "@/components/workshop/AccountSettingsFormFields";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import {
  getAccountSetupState,
  updateProfileSettings,
} from "@/lib/auth/account-actions";

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const state = await getAccountSetupState();

  return (
    <WorkshopPageShell
      title="Profile settings"
      eyebrow="Settings"
      description="Update the profile-owned fields collected during sign-up."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Profile",
      ]}
      contentClassName="overflow-y-auto p-2"
    >
      <form action={updateProfileSettings} className="max-w-3xl space-y-3">
        {params.saved ? (
          <div className="rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink">
            Profile settings saved.
          </div>
        ) : null}
        {params.error ? (
          <div className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
            Complete the required fields before saving.
          </div>
        ) : null}

        <section className="space-y-2 border border-hairline bg-white p-2">
          <ProfileSettingsFields initial={state.profile ?? undefined} />
        </section>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md">
            Save profile
          </Button>
        </div>
      </form>
    </WorkshopPageShell>
  );
}
