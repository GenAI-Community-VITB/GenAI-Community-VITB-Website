import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { CursorGlow } from "@/components/site/cursor-glow";
import { TopLeftLoadingBanner } from "@/components/site/top-left-loading-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: {
    default: "Generative AI Community | VIT Bhopal",
    template: "%s | Generative AI Community",
  },
  description: "Official portal for Generative AI Community - team hierarchy, live events, registration passes, and research projects.",
  icons: {
    icon: [
      { url: "/ClubIcon.png", sizes: "32x32", type: "image/png" },
      { url: "/ClubIcon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/ClubIcon.png",
    apple: [
      { url: "/ClubIcon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col bg-black text-white selection:bg-[#f5b642] selection:text-black">
        <Suspense fallback={null}>
          <TopLeftLoadingBanner />
        </Suspense>
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
