import { MetadataRoute } from "next";
import { getPublicEvents } from "@/lib/data/events";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.genaiclubvitb.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = BASE_URL.replace(/\/$/, "");
  const now = new Date();

  // Core static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${url}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${url}/events`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${url}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${url}/team`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${url}/projects`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${url}/achievements`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${url}/winners`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Dynamic public event routes from Supabase
  try {
    const events = await getPublicEvents();
    const eventRoutes: MetadataRoute.Sitemap = [];

    for (const event of events) {
      const slug = event.slug || event.id;
      const lastMod = event.updated_at ? new Date(event.updated_at) : (event.created_at ? new Date(event.created_at) : now);

      // 1. Dedicated Event Detail Page
      eventRoutes.push({
        url: `${url}/events/${slug}`,
        lastModified: lastMod,
        changeFrequency: event.status === "live" ? "hourly" : "daily",
        priority: event.status === "live" ? 0.95 : 0.85,
      });

      // 2. Direct Registration Page
      if (event.is_registration_open) {
        eventRoutes.push({
          url: `${url}/events/${slug}/register`,
          lastModified: lastMod,
          changeFrequency: "hourly",
          priority: 0.8,
        });
      }
    }

    return [...staticRoutes, ...eventRoutes];
  } catch (err) {
    console.error("Error generating dynamic event sitemap:", err);
    return staticRoutes;
  }
}
