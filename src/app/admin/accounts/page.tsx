import Link from "next/link";

import { AdminAccountsList } from "@/components/admin/AdminAccountsList";
import { AdminCreateAccountForm } from "@/components/admin/AdminCreateAccountForm";
import { Card } from "@/components/ui/card";
import { listCorporateAccountsWithCounts } from "@/lib/admin/corporate-account-repository";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const showArchived = status === "archived";
  const accountsResult = await listCorporateAccountsWithCounts({
    status: showArchived ? "archived" : undefined,
  });
  const accounts = accountsResult.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
      <div>
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">Admin</p>
        <h1 className="text-[12px] font-medium leading-5 text-ink">
          {showArchived ? "Archived Corporate Accounts" : "Corporate Accounts"}
        </h1>
        <p className="text-[10px] leading-4 text-tertiary">
          {accountsResult.error ?? `${accounts.length} account${accounts.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      {!showArchived && (
        <Card className="p-2">
          <h2 className="mb-2 text-[11px] font-medium leading-4 text-ink">Create corporate account</h2>
          <AdminCreateAccountForm />
        </Card>
      )}

      <Card className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">
            {showArchived ? "Archived accounts" : "Accounts"}
          </h2>
          <Link
            href={showArchived ? "/admin/accounts" : "/admin/accounts?status=archived"}
            className="text-[9px] font-medium leading-3 text-tertiary hover:text-ink hover:underline"
          >
            {showArchived ? "Back to accounts" : "View archived"}
          </Link>
        </div>
        <AdminAccountsList accounts={accounts} archived={showArchived} />
      </Card>
    </div>
  );
}
