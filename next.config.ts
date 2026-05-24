import type { NextConfig } from "next";

const supabaseImageRemotePattern = (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    return {
      protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: "/storage/v1/object/public/component-images/**",
      search: "",
    };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  images: {
    remotePatterns: supabaseImageRemotePattern ? [supabaseImageRemotePattern] : [],
  },
};

export default nextConfig;
