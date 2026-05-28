import type { NextConfig } from "next";

type ImageRemotePattern = Exclude<NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number], URL>;

const landingReportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms",
].join("; ");

const publicSecurityHeaderRoutes = ["/", "/about", "/features", "/pricing", "/contact", "/share/:path*"];

const supabaseImageRemotePatterns = ((): ImageRemotePattern[] => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    const protocol = url.protocol === "http:" ? "http" : url.protocol === "https:" ? "https" : null;
    if (!protocol) return [];
    const base = {
      protocol,
      hostname: url.hostname,
      port: url.port,
      search: "",
    };
    // P9: cover both component library images and project cover images (from metadata.projectImageUrl)
    // for Next/Image optimization on receiver hero + row thumbnails. Backwards compat.
    return [
      { ...base, pathname: "/storage/v1/object/public/component-images/**" },
      { ...base, pathname: "/storage/v1/object/public/project-images/**" },
    ];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  images: {
    remotePatterns: supabaseImageRemotePatterns,
  },
  async headers() {
    return publicSecurityHeaderRoutes.map((source) => ({
      source,
      headers: [
        {
          key: "Content-Security-Policy-Report-Only",
          value: landingReportOnlyCsp,
        },
      ],
    }));
  },
};

export default nextConfig;
