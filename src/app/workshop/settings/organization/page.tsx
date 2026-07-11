import { WorkshopRouteHeader } from "@/components/workshop/WorkshopRouteHeader";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { listCorporateAccountReadOnlyViewsForMember } from "@/lib/admin/corporate-account-repository";

function formatRole(role: "owner" | "team_leader") {
  return role === "team_leader" ? "Team leader" : "Owner";
}

export default async function OrganizationSettingsPage() {
  const currentUser = await requireCurrentUserContext();
  const result = await listCorporateAccountReadOnlyViewsForMember(currentUser.userId);

  return (
    <WorkshopRouteHeader
      title="Organization access"
      eyebrow="Settings"
      description="Read-only organization accounts where you are an owner or team leader."
      breadcrumbs={[
        { label: "Settings", href: "/workshop/settings" },
        "Organization",
      ]}
      contentClassName="overflow-y-auto p-2"
    >
      {result.error ? (
        <section className="max-w-3xl border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
          Organization access could not be loaded.
        </section>
      ) : result.data.length === 0 ? (
        <section className="max-w-3xl border border-hairline bg-white p-3 text-[10px] leading-4 text-tertiary">
          No organization account is assigned to your owner or team leader access.
        </section>
      ) : (
        <div className="max-w-4xl space-y-3">
          {result.data.map(({ account, memberRole, members, workspaces }) => (
            <section key={account.id} className="border border-hairline bg-white">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline px-3 py-2">
                <div className="min-w-0">
                  <h2 className="text-[11px] font-medium leading-4 text-ink">{account.name}</h2>
                  {account.description ? (
                    <p className="mt-0.5 text-[10px] leading-4 text-tertiary">{account.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1 text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
                  <span className="border border-hairline px-1.5 py-1">{formatRole(memberRole)}</span>
                  <span className="border border-hairline px-1.5 py-1">{account.status}</span>
                </div>
              </div>

              <div className="grid divide-y divide-hairline lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <div className="min-w-0">
                  <h3 className="border-b border-hairline px-3 py-2 text-[10px] font-medium leading-4 text-ink">Members</h3>
                  {members.length === 0 ? (
                    <p className="px-3 py-2 text-[10px] leading-4 text-tertiary">No members are recorded.</p>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {members.map((member) => (
                        <li key={member.user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-medium leading-4 text-ink">
                              {member.display_name ?? member.email}
                            </p>
                            {member.display_name ? (
                              <p className="truncate text-[10px] leading-4 text-tertiary">{member.email}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
                            {member.role.replaceAll("_", " ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="border-b border-hairline px-3 py-2 text-[10px] font-medium leading-4 text-ink">Linked workspaces</h3>
                  {workspaces.length === 0 ? (
                    <p className="px-3 py-2 text-[10px] leading-4 text-tertiary">No workspaces are linked.</p>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {workspaces.map((workspace) => (
                        <li key={workspace.id} className="px-3 py-2">
                          <p className="truncate text-[10px] font-medium leading-4 text-ink">{workspace.name}</p>
                          {workspace.slug ? (
                            <p className="truncate text-[10px] leading-4 text-tertiary">{workspace.slug}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </WorkshopRouteHeader>
  );
}
