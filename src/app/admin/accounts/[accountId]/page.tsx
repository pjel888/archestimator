import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAccountMembers } from "@/components/admin/AdminAccountMembers";
import { AdminAccountWorkspaces } from "@/components/admin/AdminAccountWorkspaces";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getCorporateAccount,
  listCorporateAccountMembers,
  listCorporateAccountWorkspaces,
  listAllWorkspacesForLinking,
  listAllUsersForAssignment,
} from "@/lib/admin/corporate-account-repository";

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const [accountResult, membersResult, workspacesResult, linkableWorkspacesResult, assignableUsersResult] =
    await Promise.all([
      getCorporateAccount(accountId),
      listCorporateAccountMembers(accountId),
      listCorporateAccountWorkspaces(accountId),
      listAllWorkspacesForLinking(),
      listAllUsersForAssignment(),
    ]);

  if (accountResult.error || !accountResult.data) {
    notFound();
  }

  const account = accountResult.data;
  const members = membersResult.data ?? [];
  const workspaces = workspacesResult.data ?? [];
  const linkableWorkspaces = linkableWorkspacesResult.data ?? [];
  const assignableUsers = assignableUsersResult.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">
          <Link href="/admin/accounts" className="hover:text-ink">Accounts</Link>
          {" / "}
          {account.name}
        </p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">{account.name}</h1>
        {account.description && (
          <p className="text-[10px] leading-4 text-tertiary">{account.description}</p>
        )}
        <div className="mt-1 flex gap-1">
          <Badge tone={account.status === "active" ? "success" : "warning"} size="xs" className="min-w-0 px-1">
            {account.status}
          </Badge>
          <span className="text-[9px] leading-3 text-tertiary">
            Created {new Date(account.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Card className="p-2">
        <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">
          Members
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
        </h2>
        <AdminAccountMembers
          accountId={accountId}
          members={members}
          assignableUsers={assignableUsers}
        />
      </Card>

      <Card className="p-2">
        <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">
          Linked workspaces
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}
          </span>
        </h2>
        <AdminAccountWorkspaces
          accountId={accountId}
          workspaces={workspaces}
          linkableWorkspaces={linkableWorkspaces}
        />
      </Card>
    </div>
  );
}
