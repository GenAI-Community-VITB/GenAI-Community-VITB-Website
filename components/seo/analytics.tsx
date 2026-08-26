"use client";

import Script from "next/script";

/**
 * Google Analytics 4 Script Integration.
 * Only mounts if NEXT_PUBLIC_GA_ID is set in environment.
 * Strictly anonymous: NEVER sends PII (names, emails, phone numbers, payment UTRs).
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * Dispatches an anonymous GA4 event.
 * Ensures zero PII (personally identifiable information) is dispatched.
 */
export function trackEvent(
  eventName: "page_view" | "event_view" | "registration_start" | "registration_submit" | "registration_success" | "qr_scan",
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params || {});
  }
}
