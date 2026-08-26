import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { CursorGlow } from "@/components/site/cursor-glow";
import { TopLeftLoadingBanner } from "@/components/site/top-left-loading-banner";
import { BetaBadge } from "@/components/site/beta-badge";
import { Analytics } from "@/components/seo/analytics";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.genaiclubvitb.in"),
  title: {
    default: "GENAI Community VIT Bhopal | Generative AI Club",
    template: "%s | GENAI Community VIT Bhopal",
  },
  description:
    "Official website of the Generative AI Community at VIT Bhopal University. Explore upcoming AI hackathons, technical workshops, open-source AI projects, and student passes.",
  keywords: [
    "GENAI Community VIT Bhopal",
    "Generative AI Club VIT Bhopal",
    "AI Club VIT Bhopal",
    "AI Events VIT Bhopal",
    "AI Workshops VIT Bhopal",
    "Generative AI Events Bhopal",
    "AI Hackathons VIT Bhopal",
    "VIT Bhopal Technical Clubs",
    "Machine Learning Community Bhopal",
  ],
  authors: [{ name: "GENAI Community VIT Bhopal", url: "https://www.genaiclubvitb.in" }],
  creator: "GENAI Community Technical Team",
  publisher: "VIT Bhopal University",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.genaiclubvitb.in",
    siteName: "GENAI Community VIT Bhopal",
    title: "GENAI Community VIT Bhopal | Generative AI Club",
    description:
      "Official website of the Generative AI Community at VIT Bhopal University. Explore upcoming AI hackathons, technical workshops, and student passes.",
    images: [
      {
        url: "/ClubIcon.png",
        width: 512,
        height: 512,
        alt: "GENAI Community VIT Bhopal Official Club Icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GENAI Community VIT Bhopal | Generative AI Club",
    description:
      "Official portal of Generative AI Community at VIT Bhopal University. Explore hackathons, workshops, and AI research projects.",
    images: ["/ClubIcon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        {/* Google Analytics 4 (No PII) */}
        <Analytics />

        {/* Removable Top-Right Beta Badge */}
        <BetaBadge />
        <Suspense fallback={null}>
          <TopLeftLoadingBanner />
        </Suspense>
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}

