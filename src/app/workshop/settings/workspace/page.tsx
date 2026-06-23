import { Button } from "@/components/ui/button";
import { WorkspaceSettingsFields } from "@/components/workshop/AccountSettingsFormFields";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";
import {
  getAccountSetupState,
  updateWorkspaceSettings,
} from "@/lib/auth/account-actions";

export default async function WorkspaceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [params, state] = await Promise.all([searchParams, getAccountSetupState()]);
  const disabled = !state.canManageWorkspace;

  return (
    <WorkshopPageShell
      title="Workspace settings"
      eyebrow="Settings"
      description="Update workspace-owned account fields. Owners and admins can edit these settings."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Workspace",
      ]}
      contentClassName="overflow-y-auto p-2"
    >
      <form action={updateWorkspaceSettings} className="max-w-3xl space-y-3">
        {state.workspaceId ? (
          <input type="hidden" name="workspace_id" value={state.workspaceId} />
        ) : null}

        {params.saved ? (
          <div className="rounded-xs border border-accent/25 bg-accentSoft p-2 text-[10px] leading-4 text-ink">
            Workspace settings saved.
          </div>
        ) : null}
        {params.error ? (
          <div className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
            Workspace settings could not be saved.
          </div>
        ) : null}
        {disabled ? (
          <div className="rounded-xs border border-hairline bg-surfaceMuted p-2 text-[10px] leading-4 text-tertiary">
            Only workspace owners and admins can edit workspace account settings.
          </div>
        ) : null}

        <section className="space-y-2 border border-hairline bg-white p-2">
          {state.workspace ? (
            <WorkspaceSettingsFields initial={state.workspace} disabled={disabled} />
          ) : (
            <p className="text-[10px] leading-4 text-tertiary">
              Complete account setup before editing workspace settings.
            </p>
          )}
        </section>

        {!disabled && state.workspace ? (
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md">
              Save workspace
            </Button>
          </div>
        ) : null}
      </form>
    </WorkshopPageShell>
  );
}
