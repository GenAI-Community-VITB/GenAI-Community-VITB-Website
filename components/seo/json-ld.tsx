import React from "react";

export interface OrganizationJsonLdProps {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
  description?: string;
}

export function OrganizationJsonLd({
  name = "GENAI Community VIT Bhopal",
  url = "https://www.genaiclubvitb.in",
  logo = "https://www.genaiclubvitb.in/ClubIcon.png",
  sameAs = [
    "https://www.linkedin.com/company/generative-ai-community-vit-bhopal/",
    "https://www.instagram.com/gen.aivitbhopal",
  ],
  description = "Official student technical community at VIT Bhopal University researching neural architectures, autonomous agents, and production Generative AI systems.",
}: OrganizationJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    description,
    sameAs,
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "VIT Bhopal University",
      url: "https://vitbhopal.ac.in",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bhopal",
      addressRegion: "Madhya Pradesh",
      postalCode: "466114",
      addressCountry: "IN",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface WebSiteJsonLdProps {
  url?: string;
  name?: string;
  description?: string;
}

export function WebSiteJsonLd({
  url = "https://www.genaiclubvitb.in",
  name = "GENAI Community VIT Bhopal",
  description = "Official portal for Generative AI Community - team hierarchy, live events, registration passes, and research projects.",
}: WebSiteJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    publisher: {
      "@type": "Organization",
      name: "GENAI Community VIT Bhopal",
      logo: "https://www.genaiclubvitb.in/ClubIcon.png",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface EventJsonLdProps {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  url: string;
  imageUrl?: string;
  venueName?: string;
  venueAddress?: string;
  price?: number | string;
  currency?: string;
  isRegistrationOpen?: boolean;
  organizerName?: string;
}

export function EventJsonLd({
  name,
  description,
  startDate,
  endDate,
  url,
  imageUrl = "https://www.genaiclubvitb.in/ClubIcon.png",
  venueName = "Main Auditorium / Campus",
  venueAddress = "VIT Bhopal University, Kothri Kalan, Sehore, Madhya Pradesh 466114",
  price = 200,
  currency = "INR",
  isRegistrationOpen = true,
  organizerName = "GENAI Community VIT Bhopal",
}: EventJsonLdProps) {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: venueAddress,
        addressLocality: "Bhopal",
        addressRegion: "Madhya Pradesh",
        postalCode: "466114",
        addressCountry: "IN",
      },
    },
    image: [imageUrl],
    organizer: {
      "@type": "Organization",
      name: organizerName,
      url: "https://www.genaiclubvitb.in",
    },
    offers: {
      "@type": "Offer",
      url,
      price: price,
      priceCurrency: currency,
      availability: isRegistrationOpen
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      validFrom: new Date().toISOString(),
    },
  };

  if (endDate) {
    schema.endDate = endDate;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
