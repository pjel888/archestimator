import { AdminAccountsList } from "@/components/admin/AdminAccountsList";
import { AdminCreateAccountForm } from "@/components/admin/AdminCreateAccountForm";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  listCorporateAccounts,
  listCorporateAccountMembers,
} from "@/lib/admin/corporate-account-repository";

export default async function AdminAccountsPage() {
  const accountsResult = await listCorporateAccounts();
  const accounts = accountsResult.data;

  // Fetch member counts in parallel for each account.
  const memberCounts = await Promise.all(
    accounts.map(async (account) => {
      const members = await listCorporateAccountMembers(account.id);
      return { accountId: account.id, count: (members.data ?? []).length };
    }),
  );
  const countMap = new Map(memberCounts.map((m) => [m.accountId, m.count]));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">Corporate Accounts</h1>
        <p className="text-[10px] leading-4 text-tertiary">
          {accountsResult.error ?? `${accounts.length} account${accounts.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <Card className="p-2">
        <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">Create corporate account</h2>
        <AdminCreateAccountForm />
      </Card>

      <Card className="p-2">
        <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">Accounts</h2>
        <AdminAccountsList accounts={accounts} memberCountMap={countMap} />
      </Card>
    </div>
  );
}
