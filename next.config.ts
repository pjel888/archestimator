import type { NextConfig } from "next";

const supabaseImageRemotePattern = (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    return {
      protocol: "https" as const,
      hostname: url.hostname,
      port: "",
      pathname: "/storage/v1/object/public/component-images/**",
      search: "",
    };
  } catch {
    return null;
  }
})();

const legacyHttpsImageRemotePattern = {
  protocol: "https" as const,
  hostname: "**",
  port: "",
  pathname: "/**",
  search: "",
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  images: {
    remotePatterns: supabaseImageRemotePattern
      ? [supabaseImageRemotePattern, legacyHttpsImageRemotePattern]
      : [legacyHttpsImageRemotePattern],
  },
};

export default nextConfig;
