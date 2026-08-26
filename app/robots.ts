import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.genaiclubvitb.in";

export default function robots(): MetadataRoute.Robots {
  const url = BASE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/events",
          "/events/*",
          "/team",
          "/projects",
          "/achievements",
          "/winners",
          "/_next/static/",
          "/ClubIcon.png",
          "/favicon.ico",
          "/favicon.png",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/",
          "/api/*",
        ],
      },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
