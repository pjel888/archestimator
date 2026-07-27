"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { inviteClientPortalRecipientAction, resendClientPortalRecipientInvitationAction, revokeClientPortalRecipientAction, updateClientPortalRecipientRoleAction } from "@/lib/client-portal/recipient-actions";
import {
  CLIENT_PORTAL_DOMAIN_ROLES,
  CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES,
  type ClientPortalDomainRole,
  type ClientPortalRecipientRoleTemplate,
} from "@/lib/client-portal/contracts";

type Recipient = {
  clientOrganization: string | null;
  deliveryState: string | null;
  displayName: string | null;
  domainRole: ClientPortalDomainRole | null;
  domainRoleLabel: string | null;
  isRequiredApprover: boolean;
  nextAction: string;
  recipientId: string;
  role: ClientPortalRecipientRoleTemplate;
  verificationState: string;
};

type RecipientProfile = {
  clientOrganization: string | null;
  domainRole: ClientPortalDomainRole | null;
  domainRoleLabel: string | null;
  isRequiredApprover: boolean;
  roleTemplate: ClientPortalRecipientRoleTemplate;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Recipient change could not be saved.";
}

function RecipientEditor({ disabled, onResend, onRevoke, onSave, recipient }: { disabled: boolean; onResend: () => void; onRevoke: () => void; onSave: (input: RecipientProfile) => void; recipient: Recipient }) {
  const [clientOrganization, setClientOrganization] = useState(recipient.clientOrganization ?? "");
  const [domainRole, setDomainRole] = useState<ClientPortalDomainRole | "">(recipient.domainRole ?? "");
  const [domainRoleLabel, setDomainRoleLabel] = useState(recipient.domainRoleLabel ?? "");
  const [isRequiredApprover, setIsRequiredApprover] = useState(recipient.isRequiredApprover);
  const [roleTemplate, setRoleTemplate] = useState(recipient.role);
  const name = recipient.displayName ?? "Recipient";

  return <article className="rounded-lg border border-hairline p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-sm font-medium text-ink">{recipient.displayName ?? "Unnamed recipient"}</p><p className="text-xs text-secondary">{recipient.deliveryState ?? "No delivery"} · {recipient.verificationState} · {recipient.nextAction.replaceAll("_", " ")}</p></div>
      <div className="flex gap-2"><Button type="button" onClick={onResend} disabled={disabled} variant="plain" size="xs" className="min-h-0 min-w-0 rounded-none p-0 !text-xs leading-4 text-brand hover:text-brand">Resend</Button><Button type="button" onClick={onRevoke} disabled={disabled} variant="plain" size="xs" className="min-h-0 min-w-0 rounded-none p-0 !text-xs leading-4 text-rose-700 hover:text-rose-700">Revoke</Button></div>
    </div>
    <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      <select aria-label={`${name} permission role`} value={roleTemplate} onChange={(event) => setRoleTemplate(event.target.value as ClientPortalRecipientRoleTemplate)} disabled={disabled} className="rounded border border-hairline bg-white px-2 py-1.5 text-xs">{CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select aria-label={`${name} domain role`} value={domainRole} onChange={(event) => setDomainRole(event.target.value as ClientPortalDomainRole | "")} disabled={disabled} className="rounded border border-hairline bg-white px-2 py-1.5 text-xs"><option value="">No domain role</option>{CLIENT_PORTAL_DOMAIN_ROLES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      <input aria-label={`${name} domain role label`} value={domainRoleLabel} onChange={(event) => setDomainRoleLabel(event.target.value)} disabled={disabled} placeholder="Domain role label" className="rounded border border-hairline px-2 py-1.5 text-xs" />
      <input aria-label={`${name} organization`} value={clientOrganization} onChange={(event) => setClientOrganization(event.target.value)} disabled={disabled} placeholder="Organization" className="rounded border border-hairline px-2 py-1.5 text-xs" />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="text-xs text-secondary"><input type="checkbox" checked={isRequiredApprover} onChange={(event) => setIsRequiredApprover(event.target.checked)} disabled={disabled} /> Required approver</label>
      <Button type="button" onClick={() => onSave({ clientOrganization: clientOrganization || null, domainRole: domainRole || null, domainRoleLabel: domainRoleLabel || null, isRequiredApprover, roleTemplate })} disabled={disabled} variant="secondary" size="xs">Save access profile</Button>
    </div>
  </article>;
}

export function ClientPortalRecipientManager({ portalId, projectId, recipients }: { portalId: string; projectId: string; recipients: Recipient[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [domainRole, setDomainRole] = useState<ClientPortalDomainRole | "">("");
  const [domainRoleLabel, setDomainRoleLabel] = useState("");
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
        await inviteClientPortalRecipientAction({ portalId, projectId, recipient: { email, displayName: displayName || null, clientOrganization: organization || null, domainRole: domainRole || null, domainRoleLabel: domainRoleLabel || null, roleTemplate: role, isRequiredApprover: requiredApprover } });
        setEmail("");
        setDisplayName("");
        setOrganization("");
        setDomainRole("");
        setDomainRoleLabel("");
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

  function updateRecipient(recipientId: string, profile: RecipientProfile) {
    startTransition(async () => {
      try {
        await updateClientPortalRecipientRoleAction({ portalId, projectId, recipientId, ...profile });
        refresh("Recipient access profile updated.");
      } catch (error) {
        setMessage(errorMessage(error));
      }
    });
  }

  return <section className="rounded-xl border border-hairline bg-white p-4 shadow-sm">
    <div><p className="text-sm font-semibold text-ink">Invite recipient</p><p className="mt-1 text-xs text-secondary">Permission role, project identity, and approval authority remain independent. Invitations are queued without exposing recipient credentials.</p></div>
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <input aria-label="Recipient email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" type="email" className="rounded-md border border-hairline px-2 py-1.5 text-sm" />
      <input aria-label="Recipient name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Recipient name" className="rounded-md border border-hairline px-2 py-1.5 text-sm" />
      <input aria-label="Recipient organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Organization (optional)" className="rounded-md border border-hairline px-2 py-1.5 text-sm" />
      <select aria-label="Recipient permission role" value={role} onChange={(event) => setRole(event.target.value as ClientPortalRecipientRoleTemplate)} className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm">{CLIENT_PORTAL_RECIPIENT_ROLE_TEMPLATES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select aria-label="Recipient domain role" value={domainRole} onChange={(event) => setDomainRole(event.target.value as ClientPortalDomainRole | "")} className="rounded-md border border-hairline bg-white px-2 py-1.5 text-sm"><option value="">No domain role</option>{CLIENT_PORTAL_DOMAIN_ROLES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      <input aria-label="Recipient domain role label" value={domainRoleLabel} onChange={(event) => setDomainRoleLabel(event.target.value)} placeholder="Domain role label (optional)" className="rounded-md border border-hairline px-2 py-1.5 text-sm" />
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3"><label className="text-sm text-secondary"><input type="checkbox" checked={requiredApprover} onChange={(event) => setRequiredApprover(event.target.checked)} /> Required approver</label><Button type="button" onClick={invite} disabled={isPending || !email.trim()} variant="primary" size="sm" className="min-h-0 min-w-0 rounded-md bg-brand px-3 py-1.5 !text-sm leading-5 text-white hover:bg-brand">Queue invitation</Button></div>
    {message ? <p role="status" className="mt-3 text-sm text-secondary">{message}</p> : null}
    <div className="mt-5 space-y-3">{recipients.map((recipient) => <RecipientEditor key={recipient.recipientId} recipient={recipient} disabled={isPending} onSave={(profile) => updateRecipient(recipient.recipientId, profile)} onResend={() => resend(recipient.recipientId)} onRevoke={() => revoke(recipient.recipientId)} />)}{!recipients.length ? <p className="text-sm text-secondary">No recipients have been invited.</p> : null}</div>
  </section>;
}
