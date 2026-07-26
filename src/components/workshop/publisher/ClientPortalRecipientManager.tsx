"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { inviteClientPortalRecipientAction, resendClientPortalRecipientInvitationAction, revokeClientPortalRecipientAction, updateClientPortalRecipientRoleAction } from "@/lib/client-portal/recipient-actions";
import { CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES, type ClientPortalRecipientRoleTemplate } from "@/lib/client-portal/contracts";

type Recipient = {
  deliveryState: string | null;
  displayName: string | null;
  nextAction: string;
  recipientId: string;
  role: string;
  verificationState: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Recipient change could not be saved.";
}

export function ClientPortalRecipientManager({ portalId, projectId, recipients }: { portalId: string; projectId: string; recipients: Recipient[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<ClientPortalRecipientRoleTemplate>("viewer");
  const [requiredApprover, setRequiredApprover] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh(message: string) {
    setMessage(message);
    router.refresh();
  }

  function invite() {
    startTransition(async () => {
      try {
        await inviteClientPortalRecipientAction({ portalId, projectId, recipient: { email, displayName: displayName || null, clientOrganization: organization || null, roleTemplate: role, isRequiredApprover: requiredApprover } });
        setEmail("");
        setDisplayName("");
        setOrganization("");
        refresh("Invitation queued for delivery. Recipient credentials are never displayed here.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function resend(recipientId: string) {
    startTransition(async () => {
      try {
        await resendClientPortalRecipientInvitationAction({ portalId, projectId, recipientId });
        refresh("Invitation resend queued. Recipient credentials are never displayed here.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function revoke(recipientId: string) {
    startTransition(async () => {
      try {
        await revokeClientPortalRecipientAction({ portalId, projectId, recipientId });
        refresh("Recipient access revoked.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  function updateRole(recipientId: string, nextRole: ClientPortalRecipientRoleTemplate) {
    startTransition(async () => {
      try {
        await updateClientPortalRecipientRoleAction({ portalId, projectId, recipientId, roleTemplate: nextRole, isRequiredApprover: nextRole === "approver" });
        refresh("Recipient role updated.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  return <section className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
    <div><p className="text-sm font-semibold text-ink">Invite recipient</p><p className="mt-1 text-xs text-secondary">Invitations are queued through the outbox. Sending does not expose a recipient token to the owner UI.</p></div>
    <div className="mt-3 grid gap-2 md:grid-cols-2"><input aria-label="Recipient email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" type="email" className="rounded-md border border-hairline px-2 py-1.5 text-sm" /><input aria-label="Recipient name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Recipient name" className="rounded-md border border-hairline px-2 py-1.5 text-sm" /><input aria-label="Recipient organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Organization (optional)" className="rounded-md border border-hairline px-2 py-1.5 text-sm" /><select aria-label="Recipient role" value={role} onChange={(event) => setRole(event.target.value as ClientPortalRecipientRoleTemplate)} className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm">{CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm text-secondary"><input type="checkbox" checked={requiredApprover} onChange={(event) => setRequiredApprover(event.target.checked)} /> Required approver</label><Button type="button" onClick={invite} disabled={isPending || !email.trim()} variant="primary" size="sm" className="min-h-0 min-w-0 rounded-md bg-brand px-3 py-1.5 !text-sm leading-5 text-white hover:bg-brand">Queue invitation</Button></div>
    {message ? <p role="status" className="mt-3 text-sm text-secondary">{message}</p> : null}
    <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-secondary"><tr><th>Recipient</th><th>Role</th><th>Delivery</th><th>Verified</th><th>Next action</th><th>Actions</th></tr></thead><tbody>{recipients.map((recipient) => <tr key={recipient.recipientId} className="border-t border-hairline"><td className="py-2">{recipient.displayName ?? "Unnamed recipient"}</td><td><select aria-label={`${recipient.displayName ?? "Recipient"} role`} value={recipient.role} onChange={(event) => updateRole(recipient.recipientId, event.target.value as ClientPortalRecipientRoleTemplate)} disabled={isPending} className="rounded border border-hairline bg-white px-1 py-0.5 text-xs">{CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.map((item) => <option key={item} value={item}>{item}</option>)}</select></td><td>{recipient.deliveryState ?? "—"}</td><td>{recipient.verificationState}</td><td>{recipient.nextAction.replaceAll("_", " ")}</td><td className="space-x-2 whitespace-nowrap"><Button type="button" onClick={() => resend(recipient.recipientId)} disabled={isPending} variant="plain" size="xs" className="min-h-0 min-w-0 rounded-none p-0 !text-xs leading-4 text-brand hover:text-brand">Resend</Button><Button type="button" onClick={() => revoke(recipient.recipientId)} disabled={isPending} variant="plain" size="xs" className="min-h-0 min-w-0 rounded-none p-0 !text-xs leading-4 text-rose-700 hover:text-rose-700">Revoke</Button></td></tr>)}{!recipients.length ? <tr><td colSpan={6} className="py-3 text-secondary">No recipients have been invited.</td></tr> : null}</tbody></table></div>
  </section>;
}
