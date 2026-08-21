import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "googleapis",
      "nodemailer",
      "qrcode",
      "zod",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
    },
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

