"use client";

import Script from "next/script";

export function CloudflareWebAnalytics({ token }: { token: string }) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  return (
    <Script
      id="cloudflare-web-analytics"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token: trimmedToken })}
    />
  );
}
