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
        // Aggressive caching for static assets — served from CDN, zero server cost.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public images can be cached for 24 hours
        source: "/public/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
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

