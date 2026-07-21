import Link from "next/link";

import { AdminAccountsList } from "@/components/admin/AdminAccountsList";
import { AdminCreateAccountForm } from "@/components/admin/AdminCreateAccountForm";
import { AdminPage, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin"
        title={showArchived ? "Archived Corporate Accounts" : "Corporate Accounts"}
        description={accountsResult.error ?? `${accounts.length} account${accounts.length === 1 ? "" : "s"}.`}
      />

      {!showArchived && (
        <AdminSection title="Create corporate account">
          <AdminCreateAccountForm />
        </AdminSection>
      )}

      <AdminSection
        title={showArchived ? "Archived accounts" : "Accounts"}
        actions={
          <Link
            href={showArchived ? "/admin/accounts" : "/admin/accounts?status=archived"}
            className="text-[9px] font-medium leading-3 text-tertiary hover:text-ink hover:underline"
          >
            {showArchived ? "Back to accounts" : "View archived"}
          </Link>
        }
      >
        <AdminAccountsList accounts={accounts} archived={showArchived} />
      </AdminSection>
    </AdminPage>
  );
}
