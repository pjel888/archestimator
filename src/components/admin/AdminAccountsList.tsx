import Link from "next/link";

import type { CorporateAccountWithCountRow } from "@/lib/admin/corporate-account-repository";
import { Badge } from "@/components/ui/badge";

export function AdminAccountsList({
  accounts,
  archived = false,
}: {
  accounts: CorporateAccountWithCountRow[];
  archived?: boolean;
}) {
  if (accounts.length === 0) {
    return (
      <p className="py-4 text-center text-[10px] text-tertiary">
        {archived ? "No archived corporate accounts." : "No corporate accounts yet. Create one above."}
      </p>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-hairline">
            <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Name</th>
            <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Status</th>
            <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Members</th>
            <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Workspaces</th>
            <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Created</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-hairline hover:bg-surfaceMuted">
              <td className="px-2 py-1">
                <Link href={`/admin/accounts/${account.id}`} className="block hover:underline">
                  <p className="text-[10px] font-medium leading-4 text-ink">{account.name}</p>
                  {account.description && (
                    <p className="text-[9px] leading-3 text-tertiary">{account.description}</p>
                  )}
                </Link>
              </td>
              <td className="px-2 py-1">
                <Badge tone={account.status === "active" ? "success" : "warning"} size="xs" className="min-w-0 px-1">
                  {account.status}
                </Badge>
              </td>
              <td className="px-2 py-1 text-[10px] text-tertiary">
                {account.member_count}
              </td>
              <td className="px-2 py-1 text-[10px] text-tertiary">
                {account.workspace_count}
              </td>
              <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">
                {new Date(account.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
