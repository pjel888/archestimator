type SharedLinkEmailUrlEnv = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "ARCHESTIMATOR_ALLOWED_APP_ORIGINS"
    | "NEXT_PUBLIC_APP_URL"
    | "NEXT_PUBLIC_SITE_URL"
    | "NODE_ENV"
  >
>;

type SharedLinkRecipientEmailLinksInput = {
  env?: SharedLinkEmailUrlEnv;
  linkBase: string;
  rawToken: string;
};

const LOCAL_SHARED_LINK_EMAIL_ORIGIN = "http://localhost:3000";
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return HTTP_PROTOCOLS.has(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

function readSharedLinkEmailOrigin(env: SharedLinkEmailUrlEnv = process.env) {
  const allowedOrigins = (env.ARCHESTIMATOR_ALLOWED_APP_ORIGINS ?? "")
    .split(",")
    .flatMap((origin) => {
      const trimmed = origin.trim();
      return trimmed ? [trimmed] : [];
    });
  const configured = [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    ...allowedOrigins,
  ];

  for (const value of configured) {
    const origin = normalizeOrigin(value);
    if (origin) return origin;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Missing canonical shared-link email origin.");
  }

  return LOCAL_SHARED_LINK_EMAIL_ORIGIN;
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function buildSharedLinkRecipientEmailLinks({
  env = process.env,
  linkBase,
  rawToken,
}: SharedLinkRecipientEmailLinksInput) {
  const recipientLink = isAbsoluteHttpUrl(linkBase)
    ? new URL(linkBase)
    : new URL(linkBase, readSharedLinkEmailOrigin(env));
  if (!HTTP_PROTOCOLS.has(recipientLink.protocol)) {
    throw new Error("Shared-link email URL must use HTTP(S).");
  }

  const [surface, shareToken] = recipientLink.pathname.split("/").filter(Boolean);
  if (surface !== "share" || !shareToken) {
    throw new Error("Shared-link email URL must target /share/[token].");
  }

  recipientLink.searchParams.set("recipient", rawToken);

  const unsubscribeHref = new URL(
    `/api/share/${shareToken}/unsubscribe`,
    recipientLink.origin,
  );
  unsubscribeHref.searchParams.set("recipient", rawToken);

  return {
    recipientLink: recipientLink.toString(),
    unsubscribeHref: unsubscribeHref.toString(),
  };
}
