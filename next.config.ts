import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Prevent heavy server-only packages from being bundled into the client or edge runtimes.
  // This keeps the Node.js worker memory footprint lean under concurrent load.
  serverExternalPackages: ["googleapis", "nodemailer", "qrcode", "html5-qrcode"],

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "zod",
      "@supabase/supabase-js",
      "@supabase/ssr",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // Security + caching headers applied to every response.
  // These protect all 1,000 concurrent clients without adding server-side compute.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        // Public images and static assets — cache for 7 days with revalidation
        source: "/:file(ClubIcon\\.png|favicon\\.png|favicon\\.ico|apple-icon\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
};

export default nextConfig;

