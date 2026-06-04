import { describe, expect, it } from "vitest";

import { buildSharedLinkRecipientEmailLinks } from "@/lib/publication/email-links";

describe("project publication recipient email links", () => {
  it("builds absolute recipient and unsubscribe URLs from relative share paths", () => {
    const links = buildSharedLinkRecipientEmailLinks({
      linkBase: "/share/client-token",
      rawToken: "recipient-token_123",
      env: {
        NEXT_PUBLIC_APP_URL: "https://www.archestimator.com",
        NODE_ENV: "production",
      },
    });

    expect(links.recipientLink).toBe(
      "https://www.archestimator.com/share/client-token?recipient=recipient-token_123",
    );
    expect(links.unsubscribeHref).toBe(
      "https://www.archestimator.com/api/share/client-token/unsubscribe?recipient=recipient-token_123",
    );
  });

  it("preserves absolute share-link origins while appending recipient tokens", () => {
    const links = buildSharedLinkRecipientEmailLinks({
      linkBase: "https://preview.archestimator.com/share/client-token?sheet=estimate-1",
      rawToken: "recipient-token_456",
      env: {
        NEXT_PUBLIC_APP_URL: "https://www.archestimator.com",
        NODE_ENV: "production",
      },
    });

    expect(links.recipientLink).toBe(
      "https://preview.archestimator.com/share/client-token?sheet=estimate-1&recipient=recipient-token_456",
    );
    expect(links.unsubscribeHref).toBe(
      "https://preview.archestimator.com/api/share/client-token/unsubscribe?recipient=recipient-token_456",
    );
  });

  it("fails closed in production instead of sending relative email links without a canonical origin", () => {
    expect(() =>
      buildSharedLinkRecipientEmailLinks({
        linkBase: "/share/client-token",
        rawToken: "recipient-token_789",
        env: { NODE_ENV: "production" },
      }),
    ).toThrow("Missing canonical shared-link email origin");
  });
});
