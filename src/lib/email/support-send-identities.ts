import "server-only";

import { DEFAULT_SUPPORT_FROM_NAME, DEFAULT_SUPPORT_MAILBOX, type SupportEmailConfig } from "@/lib/email/support-email-config";

export type SupportSendIdentity = {
  id: "support" | "philip";
  fromAddress: string;
  fromName: string;
  replyMailbox: string;
  isDefault: boolean;
};

const HEADER_UNSAFE = /[\r\n<>]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAddress(value: string, field: string) {
  const address = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(address) || HEADER_UNSAFE.test(address)) {
    throw new Error(`Invalid ${field}.`);
  }
  return address;
}

function normalizeName(value: string, field: string) {
  const name = value.trim();
  if (!name || name.length > 120 || HEADER_UNSAFE.test(name)) throw new Error(`Invalid ${field}.`);
  return name;
}

function sameDomain(address: string, mailbox: string) {
  return address.slice(address.lastIndexOf("@") + 1) === mailbox.slice(mailbox.lastIndexOf("@") + 1);
}

export function listSupportSendIdentities(config: Pick<SupportEmailConfig, "supportMailbox" | "supportFrom" | "supportFromName">): SupportSendIdentity[] {
  const replyMailbox = normalizeAddress(config.supportMailbox || DEFAULT_SUPPORT_MAILBOX, "support reply mailbox");
  const configuredDefault = normalizeAddress(config.supportFrom || DEFAULT_SUPPORT_MAILBOX, "support sender");
  const defaultName = normalizeName(config.supportFromName || DEFAULT_SUPPORT_FROM_NAME, "support sender name");
  const philipAddress = `philip@${replyMailbox.slice(replyMailbox.lastIndexOf("@") + 1)}`;
  if (configuredDefault !== replyMailbox && configuredDefault !== philipAddress) {
    throw new Error("Support sender must match a registered support send identity.");
  }
  const identities: SupportSendIdentity[] = [
    {
      id: "support",
      fromAddress: replyMailbox,
      fromName: DEFAULT_SUPPORT_FROM_NAME,
      replyMailbox,
      isDefault: configuredDefault === replyMailbox,
    },
    {
      id: "philip",
      fromAddress: philipAddress,
      fromName: "Philip Lewis",
      replyMailbox,
      isDefault: configuredDefault !== replyMailbox,
    },
  ];

  if (!identities.every((identity) => sameDomain(identity.fromAddress, replyMailbox))) {
    throw new Error("Support send identities must use the support mailbox domain.");
  }
  if (identities.filter((identity) => identity.isDefault).length !== 1) {
    throw new Error("Exactly one support send identity must be the default.");
  }
  if (new Set(identities.map((identity) => identity.fromAddress)).size !== identities.length) {
    throw new Error("Support send identities must have unique addresses.");
  }

  return identities.map((identity) => identity.id === "support"
    ? { ...identity, fromName: configuredDefault === replyMailbox ? defaultName : identity.fromName }
    : identity);
}

export function resolveSupportSendIdentity(
  config: Pick<SupportEmailConfig, "supportMailbox" | "supportFrom" | "supportFromName">,
  identityId?: string | null,
) {
  const identities = listSupportSendIdentities(config);
  const identity = identityId
    ? identities.find((candidate) => candidate.id === identityId)
    : identities.find((candidate) => candidate.isDefault);
  if (!identity) throw new Error("Unknown support send identity.");
  return identity;
}

export function resolveSupportSendIdentityByAddress(
  config: Pick<SupportEmailConfig, "supportMailbox" | "supportFrom" | "supportFromName">,
  fromAddress: string | null,
) {
  const normalized = fromAddress?.trim().toLowerCase();
  const identity = normalized
    ? listSupportSendIdentities(config).find((candidate) => candidate.fromAddress === normalized)
    : undefined;
  if (!identity) throw new Error("The original support send identity is no longer allowed.");
  return identity;
}

export function listClientSupportSendIdentities(config: Pick<SupportEmailConfig, "supportMailbox" | "supportFrom" | "supportFromName">) {
  return listSupportSendIdentities(config).map(({ id, fromAddress, fromName, isDefault }) => ({
    id,
    fromAddress,
    fromName,
    isDefault,
  }));
}
