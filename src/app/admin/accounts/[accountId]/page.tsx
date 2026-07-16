import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminAccountMembers } from "@/components/admin/AdminAccountMembers";
import { AdminAccountStatusControls } from "@/components/admin/AdminAccountStatusControls";
import { AdminAccountWorkspaces } from "@/components/admin/AdminAccountWorkspaces";
import { AdminCustomerNotes } from "@/components/admin/AdminCustomerNotes";
import { Card } from "@/components/ui/card";
import { listCustomerNotes } from "@/lib/admin/customer-notes-repository";
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

  const [accountResult, membersResult, workspacesResult, linkableWorkspacesResult, assignableUsersResult, notesResult] =
    await Promise.all([
      getCorporateAccount(accountId),
      listCorporateAccountMembers(accountId),
      listCorporateAccountWorkspaces(accountId),
      listAllWorkspacesForLinking(),
      listAllUsersForAssignment(),
      listCustomerNotes("account", accountId, 25),
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
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <AdminAccountStatusControls
            accountId={account.id}
            status={account.status}
            accountName={account.name}
          />
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

      <Card className="p-2">
        <h2 className="text-[11px] font-medium leading-4 text-ink">
          Founder notes
          <span className="ml-2 text-[9px] font-normal text-tertiary">
            {(notesResult ?? []).length} note{(notesResult ?? []).length === 1 ? "" : "s"}
          </span>
        </h2>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">Admin-only context about this account. Append-only.</p>
        <div className="mt-2">
          <AdminCustomerNotes targetKind="account" targetId={account.id} initialNotes={notesResult ?? []} />
        </div>
      </Card>
    </div>
  );
}
